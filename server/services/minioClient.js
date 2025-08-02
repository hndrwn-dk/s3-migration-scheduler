const { spawn, exec } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { broadcast } = require('./websocket');
const database = require('./database');

class MinioClientService {
  constructor() {
    // Detect MinIO client path
    this.mcPath = this.detectMcPath();
    this.activeMigrations = new Map();
    this.logDir = path.join(__dirname, '../logs');
    this.migrationsFile = path.join(this.logDir, 'migrations.json');
    this.ensureLogDirectory();
    
    // Initialize migrations synchronously
    this.initializeMigrations();
  }

  detectMcPath() {
    if (process.env.MC_PATH) {
      return process.env.MC_PATH;
    }
    
    // Portable deployment - check project directory first
    // Server runs from /server directory, so go up one level to project root
    const projectRoot = path.join(process.cwd(), '..');
    const projectPaths = [
      path.join(projectRoot, process.platform === 'win32' ? 'mc.exe' : 'mc'), // Project root
      path.join(process.cwd(), process.platform === 'win32' ? 'mc.exe' : 'mc'), // Server folder  
      path.join(projectRoot, 'bin', process.platform === 'win32' ? 'mc.exe' : 'mc') // Bin folder
    ];
    
    console.log('Checking project paths for MinIO client:', projectPaths);
    for (const testPath of projectPaths) {
      console.log(`Checking: ${testPath} - exists: ${fs.existsSync(testPath)}`);
      if (fs.existsSync(testPath)) {
        console.log(`Found MinIO client at: ${testPath}`);
        return testPath;
      }
    }
    
    // If not found in project, check system locations as fallback
    if (process.platform === 'win32') {
      const systemPaths = [
        'C:\\Program Files\\Minio\\mc.exe',
        'C:\\Program Files\\MinIO\\mc.exe', 
        'C:\\Program Files (x86)\\Minio\\mc.exe',
        'C:\\Program Files (x86)\\MinIO\\mc.exe',
        'C:\\Windows\\System32\\mc.exe'
      ];
      
      for (const testPath of systemPaths) {
        if (fs.existsSync(testPath)) {
          console.log(`Found MinIO client at: ${testPath} (system fallback)`);
          return testPath;
        }
      }
    }
    
    // Final fallback to PATH
    console.log('MinIO client not found in project directory, falling back to PATH');
    return process.platform === 'win32' ? 'mc.exe' : 'mc';
  }

  // Helper method to quote paths with spaces for command execution
  quoteMcPath() {
    if (this.mcPath.includes(' ') && !this.mcPath.startsWith('"')) {
      return `"${this.mcPath}"`;
    }
    return this.mcPath;
  }

  async ensureLogDirectory() {
    try {
      await fs.ensureDir(this.logDir);
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
  }

  initializeMigrations() {
    try {
      // Import existing JSON migrations to database on first run
      this.importJSONMigrations();
      
      // Clean up any invalid migrations in the database
      database.cleanupInvalidMigrations();
      
      // Load all migrations from database synchronously
      this.loadMigrationsSync();
    } catch (error) {
      console.error('Failed to initialize migrations:', error);
    }
  }

  loadMigrationsSync() {
    try {
      // Load all migrations from database
      const migrations = database.getAllMigrations();
      console.log(`🔄 loadMigrations: retrieved ${migrations.length} migrations from database`);
      this.activeMigrations.clear();
      
      // Clean up stale running migrations (older than 10 minutes)
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      let cleanedCount = 0;
      
      migrations.forEach(migration => {
        // Mark old running migrations as failed if they're stuck
        if ((migration.status === 'running' || migration.status === 'starting' || migration.status === 'reconciling') &&
            new Date(migration.startTime) < tenMinutesAgo) {
          migration.status = 'failed';
          migration.progress = 0;
          migration.endTime = migration.endTime || new Date().toISOString();
          migration.errors = migration.errors || [];
          migration.errors.push('Migration was terminated due to server restart or timeout');
          
          // Update in database
          database.updateMigration(migration.id, {
            status: migration.status,
            endTime: migration.endTime,
            errors: migration.errors
          });
          
          cleanedCount++;
        }
        this.activeMigrations.set(migration.id, migration);
      });
      
      console.log(`📊 Loaded ${migrations.length} migrations from database, added ${this.activeMigrations.size} to activeMigrations`);
      if (cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanedCount} stale running migrations`);
      }
      
    } catch (error) {
      console.error('Failed to load migrations from database:', error);
    }
  }

  // Async version for external calls
  async loadMigrations() {
    return this.loadMigrationsSync();
  }

  importJSONMigrations() {
    try {
      const imported = database.importFromJSON(this.migrationsFile);
      if (imported > 0) {
        console.log(`📥 Imported ${imported} existing migrations to database`);
        // Optionally backup and remove JSON file after successful import
        // fs.moveSync(this.migrationsFile, this.migrationsFile + '.backup');
      }
    } catch (error) {
      console.warn('Could not import JSON migrations:', error.message);
    }
  }

  async saveMigrations() {
    // This method is kept for backward compatibility but migrations are now automatically saved to database
    // No need to manually save to JSON file anymore
    console.log('📊 Migrations are automatically persisted to database');
  }

  async checkMcInstallation() {
    return new Promise((resolve) => {
      exec(`${this.quoteMcPath()} --version`, (error, stdout, stderr) => {
        if (error) {
          resolve({ installed: false, error: error.message });
        } else {
          resolve({ installed: true, version: stdout.trim() });
        }
      });
    });
  }

  async testCommand(command) {
    return new Promise((resolve, reject) => {
      console.log(`Testing command: ${command}`);
      exec(command, { 
        timeout: 30000,
        env: process.env
      }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Command failed: ${error.message}\nSTDOUT: ${stdout}\nSTDERR: ${stderr}`));
        } else {
          resolve({ 
            stdout: stdout.trim(), 
            stderr: stderr.trim(),
            command,
            workingDir: process.cwd(),
            env: {
              PATH: process.env.PATH,
              MC_CONFIG_DIR: process.env.MC_CONFIG_DIR
            }
          });
        }
      });
    });
  }

  async configureAlias(aliasName, endpoint, accessKey, secretKey) {
    return new Promise((resolve, reject) => {
      const command = `${this.quoteMcPath()} alias set ${aliasName} ${endpoint} ${accessKey} ${secretKey}`;
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Failed to configure alias: ${stderr || error.message}`));
        } else {
          resolve({ success: true, message: stdout.trim() });
        }
      });
    });
  }

  async listBuckets(aliasName) {
    return new Promise((resolve, reject) => {
      const command = `${this.quoteMcPath()} ls ${aliasName} --json`;
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Failed to list buckets: ${stderr || error.message}`));
        } else {
          try {
            const lines = stdout.trim().split('\n').filter(line => line);
            const buckets = lines.map(line => {
              const data = JSON.parse(line);
              return {
                name: data.key?.replace('/', '') || data.url?.split('/').pop(),
                size: data.size || 0,
                lastModified: data.lastModified || null,
                type: data.type || 'folder'
              };
            }).filter(bucket => bucket.type === 'folder');
            
            resolve(buckets);
          } catch (parseError) {
            // Fallback to non-JSON parsing
            const buckets = stdout.split('\n')
              .filter(line => line.trim())
              .map(line => {
                const parts = line.trim().split(/\s+/);
                return {
                  name: parts[parts.length - 1]?.replace('/', ''),
                  size: 0,
                  lastModified: null,
                  type: 'folder'
                };
              })
              .filter(bucket => bucket.name);
            
            resolve(buckets);
          }
        }
      });
    });
  }

  async getBucketInfo(aliasName, bucketName) {
    return new Promise((resolve, reject) => {
      const command = `${this.quoteMcPath()} du ${aliasName}/${bucketName} --json`;
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Failed to get bucket info: ${stderr || error.message}`));
        } else {
          try {
            const lines = stdout.trim().split('\n').filter(line => line);
            let totalSize = 0;
            let totalObjects = 0;

            lines.forEach(line => {
              try {
                const data = JSON.parse(line);
                if (data.size) {
                  totalSize += data.size;
                  totalObjects++;
                }
              } catch (e) {
                // Skip invalid JSON lines
              }
            });

            resolve({
              name: bucketName,
              totalSize,
              totalObjects,
              formattedSize: this.formatBytes(totalSize)
            });
          } catch (parseError) {
            resolve({
              name: bucketName,
              totalSize: 0,
              totalObjects: 0,
              formattedSize: '0 B'
            });
          }
        }
      });
    });
  }

  async startMigration(migrationConfig) {
    // Validate migration config
    if (!migrationConfig || !migrationConfig.source || !migrationConfig.destination) {
      throw new Error('Invalid migration config: source and destination are required');
    }

    const migrationId = uuidv4();
    const logFile = path.join(this.logDir, `migration-${migrationId}.log`);
    
    const migration = {
      id: migrationId,
      config: migrationConfig,
      status: 'starting',
      progress: 0,
      startTime: new Date().toISOString(),
      logFile,
      errors: [],
      stats: {
        totalObjects: 0,
        transferredObjects: 0,
        totalSize: 0,
        transferredSize: 0,
        speed: 0
      }
    };

    // Check if migration already exists (prevent duplicates)
    if (this.activeMigrations.has(migrationId)) {
      throw new Error(`Migration ${migrationId} already exists`);
    }

    // Check for similar migration already running (same source/destination)
    const existingSimilar = Array.from(this.activeMigrations.values()).find(m => 
      m.config.source === migrationConfig.source && 
      m.config.destination === migrationConfig.destination && 
      ['starting', 'running'].includes(m.status)
    );
    
    if (existingSimilar) {
      throw new Error(`Similar migration already running: ${existingSimilar.id} (${migrationConfig.source} → ${migrationConfig.destination})`);
    }

    this.activeMigrations.set(migrationId, migration);
    
    // Save migration to database first, then broadcast
    try {
      database.insertMigration(migration);
      console.log(`🚀 Starting migration: ${migrationConfig.source} → ${migrationConfig.destination}`);
      
      // Immediately broadcast the new migration to clients
      this.broadcastMigrationUpdate(migration);
    } catch (error) {
      console.error('Failed to save migration to database:', error);
      this.activeMigrations.delete(migrationId); // Clean up on failure
      throw error;
    }

    try {
      await this.executeMigration(migration);
      return { migrationId, status: 'started' };
    } catch (error) {
      migration.status = 'failed';
      migration.errors.push(error.message);
      this.broadcastMigrationUpdate(migration); // Broadcast the failed status
      throw error;
    }
  }

  async executeMigration(migration) {
    const { source, destination, options = {} } = migration.config;
    
    // Build mc mirror command
    let command = `${this.quoteMcPath()} mirror`;
    
    // Add JSON output and summary for better parsing and reconciliation
    command += ' --json --summary';
    
    // Basic options
    if (options.overwrite) command += ' --overwrite';
    if (options.remove) command += ' --remove';
    if (options.exclude && options.exclude.length > 0) {
      options.exclude.forEach(pattern => {
        command += ` --exclude "${pattern}"`;
      });
    }
    
    // Advanced MinIO options
    if (options.checksum) command += ` --checksum ${options.checksum}`;
    if (options.preserve) command += ' --preserve';
    if (options.retry) command += ' --retry';
    if (options.dryRun) command += ' --dry-run';
    if (options.watch) command += ' --watch';
    
    command += ` ${source} ${destination}`;
    
    console.log(`Starting migration: ${command}`);
    
    // Create log file
    const logStream = fs.createWriteStream(migration.logFile, { flags: 'a' });
    logStream.write(`Migration started at ${new Date().toISOString()}\n`);
    logStream.write(`Command: ${command}\n`);
    logStream.write(`Working directory: ${process.cwd()}\n`);
    logStream.write(`PATH: ${process.env.PATH}\n\n`);

    migration.status = 'running';
    this.broadcastMigrationUpdate(migration);

    const args = this.parseCommand(command);
    console.log(`Executing: ${this.mcPath} with args:`, args);
    logStream.write(`Executing: ${this.mcPath} ${args.join(' ')}\n\n`);

    // Set working directory to project root (where mc.exe is located)
    const projectRoot = path.join(process.cwd(), '..');
    
    const childProcess = spawn(this.mcPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
      cwd: projectRoot, // Run from project root, not server directory
      shell: process.platform === 'win32', // Use shell on Windows
      windowsHide: false, // Don't hide window on Windows for debugging
      timeout: 300000 // 5 minutes timeout
    });
    
    console.log(`Working directory set to: ${projectRoot}`);

    migration.process = childProcess;

    childProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('MC STDOUT:', JSON.stringify(output)); // Use JSON.stringify to see exact chars
      logStream.write(`STDOUT: ${output}`);
      this.parseProgress(migration, output);
    });

    childProcess.stderr.on('data', (data) => {
      const error = data.toString();
      console.log('MC STDERR:', JSON.stringify(error)); // Use JSON.stringify to see exact chars
      logStream.write(`STDERR: ${error}`);
      migration.errors.push(error);
      // Some MinIO progress might come through stderr, try parsing it too
      this.parseProgress(migration, error);
      this.broadcastMigrationUpdate(migration);
    });

    childProcess.on('spawn', () => {
      console.log('MinIO process spawned successfully');
      logStream.write('Process spawned successfully\n');
    });

    childProcess.on('close', (code) => {
      logStream.write(`\nMigration finished at ${new Date().toISOString()}\n`);
      logStream.write(`Exit code: ${code}\n`);
      logStream.end();

      migration.status = code === 0 ? 'completed' : 'failed';
      migration.endTime = new Date().toISOString();
      migration.progress = code === 0 ? 100 : migration.progress;
      migration.duration = (new Date().getTime() - new Date(migration.startTime).getTime()) / 1000;
      
      this.broadcastMigrationUpdate(migration);
      
      // Start reconciliation if migration succeeded
      if (code === 0) {
        this.startReconciliation(migration);
      }
    });

    childProcess.on('error', (error) => {
      console.error('MinIO process spawn error:', error);
      migration.status = 'failed';
      migration.errors.push(`Process spawn error: ${error.message} (${error.code || 'UNKNOWN'})`);
      migration.endTime = new Date().toISOString();
      logStream.write(`PROCESS ERROR: ${error.message}\n`);
      logStream.write(`Error code: ${error.code || 'UNKNOWN'}\n`);
      logStream.write(`Error path: ${error.path || 'UNKNOWN'}\n`);
      logStream.end();
      this.broadcastMigrationUpdate(migration);
    });
  }

  parseCommand(command) {
    // Convert command string to array for spawn, handling quoted arguments
    const args = [];
    
    // Split by spaces but preserve quoted sections
    const regex = /[^\s"]+|"([^"]*)"/gi;
    const matches = [];
    let match;
    
    while ((match = regex.exec(command)) !== null) {
      matches.push(match[1] ? match[1] : match[0]);
    }
    
    // Skip the first element (which is the mc path) and return the rest as args
    const commandArgs = matches.slice(1);
    
    console.log('Full command parsed:', matches);
    console.log('Command args (excluding mc path):', commandArgs);
    return commandArgs;
  }

  parseProgress(migration, output) {
    // Parse mc mirror output for progress information
    const lines = output.split('\n');
    let hasUpdate = false;
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;
      
      console.log('Parsing line:', trimmedLine);
      
      // Look for various MinIO output patterns
      if (trimmedLine.includes('Total:') || trimmedLine.includes('total objects')) {
        const totalMatch = trimmedLine.match(/(\d+)/);
        if (totalMatch) {
          migration.stats.totalObjects = parseInt(totalMatch[1]);
          hasUpdate = true;
        }
      }
      
      // Look for transfer speed patterns
      if (trimmedLine.includes('B/s') || trimmedLine.includes('KB/s') || trimmedLine.includes('MB/s')) {
        const match = trimmedLine.match(/(\d+(?:\.\d+)?)\s*([KMGT]?B)\/s/);
        if (match) {
          migration.stats.speed = this.parseSize(match[1] + match[2]);
          hasUpdate = true;
        }
      }
      
      // Count transferred objects (various patterns including new MinIO format)
      if (trimmedLine.includes('->') || 
          trimmedLine.includes('copied') || 
          trimmedLine.includes('COPY') ||
          trimmedLine.includes('PUT') ||
          trimmedLine.match(/\.txt:|\.jpg:|\.png:|\.pdf:|\.zip:/) || // File transfer lines
          trimmedLine.includes('[=') || // Progress bar
          trimmedLine.includes('KiB /') || trimmedLine.includes('MiB /') || trimmedLine.includes('GiB /')) {
        migration.stats.transferredObjects++;
        migration.progress = Math.min(95, (migration.stats.transferredObjects / Math.max(1, migration.stats.totalObjects || 1)) * 100);
        hasUpdate = true;
        console.log(`Progress update: ${migration.stats.transferredObjects}/${migration.stats.totalObjects || 'unknown'} (${migration.progress.toFixed(1)}%)`);
      }
      
      // Any activity means we're making progress
      if (trimmedLine.length > 0) {
        migration.progress = Math.max(migration.progress, 5); // At least 5% if we have output
        hasUpdate = true;
      }
    });

    if (hasUpdate) {
      this.broadcastMigrationUpdate(migration);
    }
  }

  async startReconciliation(migration) {
    migration.status = 'reconciling';
    migration.reconciliation = {
      status: 'running',
      startTime: new Date().toISOString(),
      differences: []
    };

    this.broadcastMigrationUpdate(migration);

    try {
      const reconciliationResult = await this.performReconciliation(migration.config.source, migration.config.destination);
      
      migration.reconciliation.status = 'completed';
      migration.reconciliation.endTime = new Date().toISOString();
      
      // Properly structure the reconciliation data
      migration.reconciliation.differences = reconciliationResult.differences || [];
      migration.reconciliation.sourceStats = reconciliationResult.sourceStats;
      migration.reconciliation.destStats = reconciliationResult.destStats;
      migration.reconciliation.summary = reconciliationResult.summary;
      
      // Categorize differences for better display
      migration.reconciliation.missingFiles = [];
      migration.reconciliation.extraFiles = [];
      migration.reconciliation.sizeDifferences = [];
      
      reconciliationResult.differences.forEach(diff => {
        switch (diff.status) {
          case 'missing':
            migration.reconciliation.missingFiles.push(diff);
            break;
          case 'extra':
            migration.reconciliation.extraFiles.push(diff);
            break;
          case 'size-differs':
          case 'newer':
          case 'older':
            migration.reconciliation.sizeDifferences.push(diff);
            break;
          default:
            // Keep in general differences
            break;
        }
      });
      
      const totalDifferences = reconciliationResult.differences.length;
      migration.status = totalDifferences === 0 ? 'verified' : 'completed_with_differences';
      
      console.log(`🔍 Reconciliation completed: ${totalDifferences} differences found`);
      console.log(`📊 Missing: ${migration.reconciliation.missingFiles.length}, Extra: ${migration.reconciliation.extraFiles.length}, Size: ${migration.reconciliation.sizeDifferences.length}`);
      
    } catch (error) {
      migration.reconciliation.status = 'failed';
      migration.reconciliation.error = error.message;
      migration.errors.push(`Reconciliation failed: ${error.message}`);
    }

    this.broadcastMigrationUpdate(migration);
  }

  async performReconciliation(source, destination) {
    console.log(`🔍 Starting reconciliation: ${source} ↔ ${destination}`);
    
    try {
      // Get bucket statistics for both source and destination
      const [sourceStats, destStats, differences] = await Promise.all([
        this.getBucketStats(source),
        this.getBucketStats(destination),
        this.compareDirectories(source, destination)
      ]);

      console.log(`📊 Source stats: ${sourceStats.objectCount} objects, ${sourceStats.totalSize} bytes`);
      console.log(`📊 Dest stats: ${destStats.objectCount} objects, ${destStats.totalSize} bytes`);
      console.log(`🔍 Found ${differences.length} differences`);
      
      if (differences.length > 0) {
        console.log('📋 Differences:', differences.map(d => `${d.path} (${d.status})`).join(', '));
      }

      return {
        differences,
        sourceStats,
        destStats,
        summary: {
          objectCountMatch: sourceStats.objectCount === destStats.objectCount,
          totalSizeMatch: sourceStats.totalSize === destStats.totalSize,
          differencesFound: differences.length > 0
        }
      };
    } catch (error) {
      console.error(`❌ Reconciliation failed for ${source} ↔ ${destination}:`, error);
      throw new Error(`Reconciliation failed: ${error.message}`);
    }
  }

  async getBucketStats(bucketPath) {
    return new Promise((resolve, reject) => {
      const command = `${this.quoteMcPath()} du ${bucketPath} --json`;
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          resolve({ objectCount: 0, totalSize: 0 }); // Default if bucket is empty or inaccessible
          return;
        }

        try {
          const lines = stdout.trim().split('\n').filter(line => line);
          let totalSize = 0;
          let objectCount = 0;

          lines.forEach(line => {
            try {
              const data = JSON.parse(line);
              if (data.size !== undefined) {
                totalSize += data.size || 0;
                objectCount++;
              }
            } catch (e) {
              // Skip invalid JSON lines
            }
          });

          resolve({ objectCount, totalSize });
        } catch (error) {
          resolve({ objectCount: 0, totalSize: 0 });
        }
      });
    });
  }

  async compareDirectories(source, destination) {
    return new Promise((resolve, reject) => {
      const command = `${this.quoteMcPath()} diff ${source} ${destination} --json`;
      console.log(`🔍 Comparing directories: ${command}`);
      
      exec(command, (error, stdout, stderr) => {
        console.log(`📋 mc diff output - Error: ${!!error}, Stdout length: ${stdout?.length || 0}, Stderr: ${stderr}`);
        
        // mc diff returns exit code 1 when differences are found, but this is normal
        if (error && !stdout && stderr) {
          console.error(`❌ Directory comparison failed: ${stderr}`);
          reject(new Error(`Directory comparison failed: ${stderr || error.message}`));
          return;
        }

        try {
          if (!stdout || stdout.trim() === '') {
            console.log('✅ No differences found (empty output)');
            resolve([]);
            return;
          }

          const lines = stdout.trim().split('\n').filter(line => line.trim());
          const differences = [];

          console.log(`📋 Processing ${lines.length} output lines`);
          
          lines.forEach((line, index) => {
            try {
              const data = JSON.parse(line);
              console.log(`📋 Line ${index + 1}:`, data);
              
              if (data.status && data.status !== 'same') {
                const diff = {
                  path: data.source || data.target || `unknown-${index}`,
                  status: data.status,
                  sourceSize: data.sourceSize || 0,
                  targetSize: data.targetSize || 0
                };
                differences.push(diff);
                console.log(`📋 Added difference:`, diff);
              }
            } catch (e) {
              console.warn(`⚠️  Skipping invalid JSON line ${index + 1}: ${line}`);
            }
          });

          console.log(`✅ Found ${differences.length} valid differences`);
          resolve(differences);
        } catch (parseError) {
          console.error(`❌ Parse error in compareDirectories:`, parseError);
          resolve([]); // Return empty array if parsing fails
        }
      });
    });
  }

  broadcastMigrationUpdate(migration) {
    // Update migration in database
    try {
      database.updateMigration(migration.id, {
        status: migration.status,
        progress: migration.progress,
        endTime: migration.endTime,
        stats: migration.stats,
        errors: migration.errors,
        reconciliation: migration.reconciliation
      });
    } catch (error) {
      console.error('Failed to update migration in database:', error);
    }
    
    const updateData = {
      id: migration.id,
      status: migration.status,
      progress: migration.progress,
      stats: migration.stats,
      errors: migration.errors,
      reconciliation: migration.reconciliation,
      startTime: migration.startTime,
      endTime: migration.endTime,
      config: migration.config,
      duration: migration.endTime ? 
        (new Date(migration.endTime).getTime() - new Date(migration.startTime).getTime()) / 1000 : 
        (new Date().getTime() - new Date(migration.startTime).getTime()) / 1000
    };
    
    // Broadcast via WebSocket
    broadcast({
      type: 'migration_update',
      data: updateData
    }, 'migrations');
    
    // Also broadcast to SSE clients
    this.broadcastToSSE(updateData);
  }

  broadcastToSSE(migration) {
    if (global.sseClients) {
      global.sseClients.forEach((client, clientId) => {
        try {
          if (client.onMigrationUpdate) {
            client.onMigrationUpdate(migration);
          }
        } catch (error) {
          console.error(`Error sending SSE update to ${clientId}:`, error);
          global.sseClients.delete(clientId);
        }
      });
    }
  }

  async getMigrationLogs(migrationId) {
    // First try to get from database
    try {
      const dbLogs = database.getMigrationLogs(migrationId);
      if (dbLogs && dbLogs.trim()) {
        return dbLogs;
      }
    } catch (error) {
      console.warn('Could not get logs from database:', error.message);
    }

    // Fallback to file-based logs
    const migration = this.activeMigrations.get(migrationId) || database.getMigration(migrationId);
    if (!migration) {
      throw new Error('Migration not found');
    }

    if (!migration.logFile) {
      return `No log file available for migration ${migrationId}`;
    }

    try {
      const logs = await fs.readFile(migration.logFile, 'utf8');
      return logs;
    } catch (error) {
      console.error('Error reading log file:', error);
      return `Error reading logs: ${error.message}\n\nTip: Logs for this migration may not be available yet or the migration is still starting.`;
    }
  }

  async cancelMigration(migrationId) {
    const migration = this.activeMigrations.get(migrationId);
    if (!migration) {
      throw new Error('Migration not found');
    }

    if (migration.process) {
      migration.process.kill('SIGTERM');
      migration.status = 'cancelled';
      this.broadcastMigrationUpdate(migration);
    }

    return { success: true };
  }

  getMigrationStatus(migrationId) {
    const migration = this.activeMigrations.get(migrationId);
    if (!migration) {
      throw new Error('Migration not found');
    }

    return {
      id: migration.id,
      status: migration.status,
      progress: migration.progress,
      stats: migration.stats,
      errors: migration.errors,
      reconciliation: migration.reconciliation,
      startTime: migration.startTime,
      endTime: migration.endTime,
      duration: migration.endTime ? 
        (migration.endTime - migration.startTime) / 1000 : 
        (new Date() - migration.startTime) / 1000
    };
  }

  getAllMigrations() {
    try {
      // Get fresh data from database to ensure consistency
      return database.getAllMigrations();
    } catch (error) {
      console.error('Failed to get migrations from database:', error);
      // Fallback to in-memory data
      return Array.from(this.activeMigrations.values()).map(migration => ({
        id: migration.id,
        config: migration.config,
        status: migration.status,
        progress: migration.progress,
        startTime: migration.startTime,
        endTime: migration.endTime,
        stats: migration.stats,
        errors: migration.errors,
        reconciliation: migration.reconciliation,
        duration: migration.endTime ? 
          (new Date(migration.endTime).getTime() - new Date(migration.startTime).getTime()) / 1000 : 
          (new Date().getTime() - new Date(migration.startTime).getTime()) / 1000
      }));
    }
  }

  getMigrationStats() {
    try {
      return database.getMigrationStats();
    } catch (error) {
      console.error('Failed to get migration stats from database:', error);
      // Fallback calculation
      const migrations = Array.from(this.activeMigrations.values());
      const total = migrations.length;
      const completed = migrations.filter(m => m.status === 'completed' || m.status === 'verified').length;
      const running = migrations.filter(m => m.status === 'running' || m.status === 'reconciling').length;
      const failed = migrations.filter(m => m.status === 'failed').length;
      
      return {
        total,
        completed,
        running,
        failed,
        cancelled: migrations.filter(m => m.status === 'cancelled').length,
        completed_with_differences: migrations.filter(m => m.status === 'completed_with_differences').length,
        success_rate: total > 0 ? ((completed / total) * 100) : 0
      };
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  parseSize(sizeStr) {
    const units = { B: 1, KB: 1024, MB: 1024**2, GB: 1024**3, TB: 1024**4 };
    const match = sizeStr.match(/^([\d.]+)\s*([KMGT]?B)$/i);
    if (match) {
      return parseFloat(match[1]) * (units[match[2].toUpperCase()] || 1);
    }
    return 0;
  }
}

module.exports = new MinioClientService();