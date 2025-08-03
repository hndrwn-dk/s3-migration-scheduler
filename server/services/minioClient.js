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
    // Cache for bucket listings to avoid repeated expensive operations
    this.bucketListingCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
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
      
      console.log(`Loaded ${migrations.length} migrations from database, added ${this.activeMigrations.size} to activeMigrations`);
      if (cleanedCount > 0) {
        console.log(`Cleaned up ${cleanedCount} stale running migrations`);
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
        console.log(`Imported ${imported} existing migrations to database`);
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
    console.log('Migrations are automatically persisted to database');
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
    
    // Determine execution type and status
    console.log(`DEBUG: Migration config scheduledTime: ${migrationConfig.scheduledTime}`);
    console.log(`DEBUG: Current time: ${new Date().toISOString()}`);
    
    const isScheduled = migrationConfig.scheduledTime && new Date(migrationConfig.scheduledTime) > new Date();
    console.log(`DEBUG: isScheduled: ${isScheduled}`);
    
    const executionStatus = isScheduled ? 'scheduled' : 'immediate';
    const status = isScheduled ? 'scheduled' : 'starting';
    
    console.log(`DEBUG: Final status: ${status}, executionStatus: ${executionStatus}`);
    
    const migration = {
      id: migrationId,
      config: migrationConfig,
      status: status,
      progress: 0,
      startTime: isScheduled ? null : new Date().toISOString(),
      scheduledTime: migrationConfig.scheduledTime || null,
      executionStatus: executionStatus,
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
      console.log(`Starting migration: ${migrationConfig.source} → ${migrationConfig.destination}`);
      
      // Immediately broadcast the new migration to clients
      this.broadcastMigrationUpdate(migration);
    } catch (error) {
      console.error('Failed to save migration to database:', error);
      this.activeMigrations.delete(migrationId); // Clean up on failure
      throw error;
    }

    if (isScheduled) {
      // For scheduled migrations, hand over to persistent scheduler
      const persistentScheduler = require('./persistentScheduler');
      const scheduled = persistentScheduler.scheduleMigration(migrationId, migrationConfig.scheduledTime);
      
      if (scheduled) {
        return { migrationId, status: 'scheduled', scheduledTime: migrationConfig.scheduledTime };
      } else {
        throw new Error('Failed to schedule migration');
      }
    } else {
      // For immediate migrations, execute right away
      try {
        await this.executeMigration(migration);
        return { migrationId, status: 'started' };
      } catch (error) {
        migration.status = 'failed';
        migration.errors.push(error.message);
        this.broadcastMigrationUpdate(migration);
        throw error;
      }
    }
  }

  async startScheduledMigration(migration) {
    console.log(`Starting scheduled migration: ${migration.id}`);
    
    try {
      // Update migration start time and status
      migration.startTime = new Date().toISOString();
      migration.status = 'starting';
      migration.executionStatus = 'running';
      
      // Add to active migrations
      this.activeMigrations.set(migration.id, migration);
      
      // Update database
      database.updateMigration(migration.id, migration);
      
      // Broadcast the status update
      this.broadcastMigrationUpdate(migration);
      
      // Execute the migration
      await this.executeMigration(migration);
      
    } catch (error) {
      console.error(`Scheduled migration ${migration.id} failed:`, error);
      migration.status = 'failed';
      migration.errors.push(error.message);
      migration.executionStatus = 'failed';
      
      // Update database and broadcast
      database.updateMigration(migration.id, migration);
      this.broadcastMigrationUpdate(migration);
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
    logStream.write(`==========================================\n`);
    logStream.write(`S3 MIGRATION STARTED\n`);
    logStream.write(`==========================================\n`);
    logStream.write(`Migration ID: ${migration.id}\n`);
    logStream.write(`Started at: ${new Date().toISOString()}\n`);
    logStream.write(`Source: ${source}\n`);
    logStream.write(`Destination: ${destination}\n`);
    logStream.write(`Command: ${command}\n`);
    logStream.write(`Working directory: ${process.cwd()}\n`);
    logStream.write(`==========================================\n\n`);

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
      
      // Enhanced logging: extract and log detailed file transfer information
      this.parseAndLogProgress(migration, output, logStream);
    });

    childProcess.stderr.on('data', (data) => {
      const error = data.toString();
      console.log('MC STDERR:', JSON.stringify(error)); // Use JSON.stringify to see exact chars
      logStream.write(`STDERR: ${error}`);
      migration.errors.push(error);
      // Some MinIO progress might come through stderr, try parsing it too
      this.parseAndLogProgress(migration, error, logStream);
      this.broadcastMigrationUpdate(migration);
    });

    childProcess.on('spawn', () => {
      console.log('MinIO process spawned successfully');
      const timestamp = new Date().toISOString();
      logStream.write(`[${timestamp}] PROCESS: MinIO migration process spawned successfully\n\n`);
      logStream.write(`TRANSFER LOG (Real-time file transfers will appear below):\n`);
      logStream.write(`${'='.repeat(60)}\n\n`);
    });

    childProcess.on('close', (code) => {
      logStream.write(`\n==========================================\n`);
      logStream.write(`MIGRATION COMPLETED\n`);
      logStream.write(`==========================================\n`);
      logStream.write(`Migration ID: ${migration.id}\n`);
      logStream.write(`Finished at: ${new Date().toISOString()}\n`);
      logStream.write(`Exit code: ${code}\n`);
      logStream.write(`Status: ${code === 0 ? 'SUCCESS' : 'FAILED'}\n`);
      // Only show Final Statistics section if we have meaningful data
      if (migration.stats.transferredObjects > 0 || migration.stats.transferredSize > 0) {
        logStream.write(`Final Statistics:\n`);
        if (migration.stats.totalObjects > 0) {
          logStream.write(`  - Objects transferred: ${migration.stats.transferredObjects}/${migration.stats.totalObjects}\n`);
        } else if (migration.stats.transferredObjects > 0) {
          logStream.write(`  - Objects transferred: ${migration.stats.transferredObjects}\n`);
        }
        logStream.write(`  - Data transferred: ${this.formatBytes(migration.stats.transferredSize)}\n`);
        if (migration.progress > 0) {
          logStream.write(`  - Progress: ${migration.progress.toFixed(1)}%\n`);
        }
      }
      logStream.write(`==========================================\n`);
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
      const timestamp = new Date().toISOString();
      logStream.write(`\n[${timestamp}] PROCESS ERROR: ${error.message}\n`);
      logStream.write(`==========================================\n`);
      logStream.write(`MIGRATION FAILED\n`);
      logStream.write(`==========================================\n`);
      logStream.write(`Migration ID: ${migration.id}\n`);
      logStream.write(`Failed at: ${new Date().toISOString()}\n`);
      logStream.write(`Error: ${error.message}\n`);
      logStream.write(`Error code: ${error.code || 'UNKNOWN'}\n`);
      logStream.write(`Error path: ${error.path || 'UNKNOWN'}\n`);
      logStream.write(`==========================================\n`);
      logStream.end();
      
      migration.status = 'failed';
      migration.errors.push(`Process spawn error: ${error.message} (${error.code || 'UNKNOWN'})`);
      migration.endTime = new Date().toISOString();
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

  parseAndLogProgress(migration, output, logStream) {
    // Parse mc mirror output for progress information AND log detailed transfer info
    const lines = output.split('\n');
    let hasUpdate = false;
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;
      
      console.log('Parsing line:', trimmedLine);

      // Try to parse JSON output first (mc mirror --json)
      try {
        const data = JSON.parse(trimmedLine);
        if (data.status === 'success' && data.target) {
          // File successfully transferred
          migration.stats.transferredObjects++;
          if (data.size) {
            migration.stats.transferredSize += data.size;
          }
          hasUpdate = true;
          
          // Enhanced logging: Log detailed file transfer information
          const timestamp = new Date().toISOString();
          const sizeStr = data.size ? this.formatBytes(data.size) : 'unknown size';
          const transferMsg = `[${timestamp}] TRANSFERRED: ${data.target} (${sizeStr})`;
          console.log(`File transferred: ${data.target} (${data.size || 0} bytes)`);
          logStream.write(`${transferMsg}\n`);
          
        } else if (data.status === 'error') {
          // Handle error message properly whether it's string or object
          let errorMessage = 'Unknown error';
          if (data.error) {
            if (typeof data.error === 'string') {
              errorMessage = data.error;
            } else if (typeof data.error === 'object') {
              errorMessage = data.error.message || data.error.cause?.message || JSON.stringify(data.error);
            }
          }
          
          const errorMsg = `Transfer error: ${errorMessage}`;
          migration.errors.push(errorMsg);
          
          // Enhanced logging: Log transfer errors
          const timestamp = new Date().toISOString();
          const transferError = `[${timestamp}] ERROR: ${data.target || 'unknown file'} - ${errorMessage}`;
          logStream.write(`${transferError}\n`);
          hasUpdate = true;
        } else if (data.status === 'success' && (data.total !== undefined || data.transferred !== undefined)) {
          // This is a summary JSON output from mc mirror --json --summary
          if (data.total !== undefined) {
            migration.stats.totalSize = data.total;
          }
          if (data.transferred !== undefined) {
            migration.stats.transferredSize = data.transferred;
          }
          if (data.speed !== undefined) {
            migration.stats.speed = data.speed;
          }
          
          // Enhanced logging: Log migration summary
          const timestamp = new Date().toISOString();
          let summaryMsg = `[${timestamp}] MIGRATION SUMMARY: `;
          
          if (data.total !== undefined) summaryMsg += `Total: ${this.formatBytes(data.total || 0)}, `;
          if (data.transferred !== undefined) summaryMsg += `Transferred: ${this.formatBytes(data.transferred || 0)}, `;
          if (data.speed !== undefined) summaryMsg += `Speed: ${this.formatBytes(data.speed || 0)}/s, `;
          if (data.duration !== undefined) summaryMsg += `Duration: ${(data.duration / 1000000000).toFixed(2)}s`;
          
          logStream.write(`${summaryMsg}\n`);
          hasUpdate = true;
          
        } else if (data.status === 'complete' || data.type === 'summary') {
          // Enhanced logging: Log other summary types
          const timestamp = new Date().toISOString();
          let summaryMsg = `[${timestamp}] SUMMARY: `;
          
          if (data.total !== undefined) summaryMsg += `Total: ${this.formatBytes(data.total || 0)}, `;
          if (data.transferred !== undefined) summaryMsg += `Transferred: ${this.formatBytes(data.transferred || 0)}, `;
          if (data.speed !== undefined) summaryMsg += `Speed: ${this.formatBytes(data.speed || 0)}/s, `;
          if (data.duration !== undefined) summaryMsg += `Duration: ${(data.duration / 1000000000).toFixed(2)}s`;
          
          logStream.write(`${summaryMsg}\n`);
        }
        return; // Successfully parsed JSON, skip text parsing
      } catch (e) {
        // Not JSON, continue with text parsing
      }
      
      // Parse summary output patterns
      if (trimmedLine.includes('Total:') && trimmedLine.includes('Objects:')) {
        // Format: "Total: 1.2 GB, Objects: 150"
        const objectsMatch = trimmedLine.match(/Objects:\s*(\d+)/);
        const sizeMatch = trimmedLine.match(/Total:\s*([\d.]+)\s*([KMGT]?B)/);
        
        if (objectsMatch) {
          migration.stats.totalObjects = parseInt(objectsMatch[1]);
          console.log(`Total objects detected: ${migration.stats.totalObjects}`);
          
          // Enhanced logging: Log detected totals
          const timestamp = new Date().toISOString();
          logStream.write(`[${timestamp}] DETECTED: ${migration.stats.totalObjects} total objects\n`);
          hasUpdate = true;
        }
        
        if (sizeMatch) {
          const size = parseFloat(sizeMatch[1]);
          const unit = sizeMatch[2];
          const bytes = this.convertToBytes(size, unit);
          migration.stats.totalSize = bytes;
          console.log(`Total size detected: ${bytes} bytes (${size} ${unit})`);
          
          // Enhanced logging: Log detected size
          const timestamp = new Date().toISOString();
          logStream.write(`[${timestamp}] DETECTED: ${this.formatBytes(bytes)} total size\n`);
          hasUpdate = true;
        }
      }

      // Parse transferred information  
      if (trimmedLine.includes('Transferred:') && trimmedLine.includes('Objects:')) {
        // Format: "Transferred: 800 MB, Objects: 120"
        const objectsMatch = trimmedLine.match(/Objects:\s*(\d+)/);
        const sizeMatch = trimmedLine.match(/Transferred:\s*([\d.]+)\s*([KMGT]?B)/);
        
        if (objectsMatch) {
          migration.stats.transferredObjects = parseInt(objectsMatch[1]);
          hasUpdate = true;
        }
        
        if (sizeMatch) {
          const size = parseFloat(sizeMatch[1]);
          const unit = sizeMatch[2];
          const bytes = this.convertToBytes(size, unit);
          migration.stats.transferredSize = bytes;
          hasUpdate = true;
        }
        
        // Enhanced logging: Log transfer progress
        const timestamp = new Date().toISOString();
        logStream.write(`[${timestamp}] PROGRESS: ${migration.stats.transferredObjects}/${migration.stats.totalObjects || '?'} objects, ${this.formatBytes(migration.stats.transferredSize)} transferred\n`);
      }

      // Parse speed information
      const speedMatch = trimmedLine.match(/([\d.]+)\s*([KMGT]?B)\/s/);
      if (speedMatch) {
        const speed = parseFloat(speedMatch[1]);
        const unit = speedMatch[2];
        const bytesPerSecond = this.convertToBytes(speed, unit);
        migration.stats.speed = bytesPerSecond;
        console.log(`Speed detected: ${bytesPerSecond} bytes/s (${speed} ${unit}/s)`);
        
        // Enhanced logging: Log current speed
        const timestamp = new Date().toISOString();
        logStream.write(`[${timestamp}] SPEED: ${this.formatBytes(bytesPerSecond)}/s\n`);
        hasUpdate = true;
      }

      // Legacy file transfer detection (fallback for older mc versions)
      if (trimmedLine.includes('->') || 
          trimmedLine.includes('copied') || 
          trimmedLine.includes('COPY') ||
          trimmedLine.includes('PUT') ||
          trimmedLine.match(/\.(txt|jpg|png|pdf|zip|doc|xlsx):/)) {
        migration.stats.transferredObjects++;
        console.log(`Legacy transfer detected: object ${migration.stats.transferredObjects}`);
        
        // Enhanced logging: Log legacy transfer detection
        const timestamp = new Date().toISOString();
        logStream.write(`[${timestamp}] TRANSFER: Object ${migration.stats.transferredObjects} (detected from: ${trimmedLine.substring(0, 100)}...)\n`);
        hasUpdate = true;
      }

      // Calculate progress
      if (migration.stats.totalObjects > 0) {
        migration.progress = Math.min(95, (migration.stats.transferredObjects / migration.stats.totalObjects) * 100);
      } else if (migration.stats.transferredObjects > 0) {
        migration.progress = Math.min(95, Math.max(migration.progress, 25)); // At least 25% if transferring
      } else if (trimmedLine.length > 0) {
        migration.progress = Math.max(migration.progress, 5); // At least 5% if we have output
      }

      if (hasUpdate) {
        console.log(`Stats update: ${migration.stats.transferredObjects}/${migration.stats.totalObjects || 'unknown'} objects, ${migration.stats.transferredSize} bytes transferred, ${migration.stats.speed} B/s (${migration.progress.toFixed(1)}%)`);
      }
    });

    if (hasUpdate) {
      this.broadcastMigrationUpdate(migration);
    }
  }

  // Keep the original parseProgress method for backward compatibility (used by reconciliation)
  parseProgress(migration, output) {
    this.parseAndLogProgress(migration, output, { write: () => {} }); // No-op log stream
  }

  // Helper method to convert size units to bytes
  convertToBytes(size, unit) {
    const units = {
      'B': 1,
      'KB': 1024,
      'MB': 1024 * 1024,
      'GB': 1024 * 1024 * 1024,
      'TB': 1024 * 1024 * 1024 * 1024,
      'KiB': 1024,
      'MiB': 1024 * 1024,
      'GiB': 1024 * 1024 * 1024,
      'TiB': 1024 * 1024 * 1024 * 1024
    };
    return Math.round(size * (units[unit] || 1));
  }

  // Helper method to format bytes as human readable string
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async startReconciliation(migration) {
    migration.status = 'reconciling';
    migration.reconciliation = {
      status: 'running',
      startTime: new Date().toISOString(),
      differences: []
    };

    this.broadcastMigrationUpdate(migration);

    // Log reconciliation start
    if (migration.logFile) {
      try {
        const logStream = fs.createWriteStream(migration.logFile, { flags: 'a' });
        const timestamp = new Date().toISOString();
        logStream.write(`\n==========================================\n`);
        logStream.write(`DATA RECONCILIATION STARTED\n`);
        logStream.write(`==========================================\n`);
        logStream.write(`Migration ID: ${migration.id}\n`);
        logStream.write(`Started at: ${timestamp}\n`);
        logStream.write(`Source: ${migration.config.source}\n`);
        logStream.write(`Destination: ${migration.config.destination}\n`);
        logStream.write(`==========================================\n\n`);
        logStream.end();
      } catch (error) {
        console.warn('Could not write reconciliation start to log file:', error.message);
      }
    }

    try {
      const reconciliationResult = await this.performReconciliation(migration.config.source, migration.config.destination);
      
      migration.reconciliation.status = 'completed';
      migration.reconciliation.endTime = new Date().toISOString();
      
      // Properly structure the reconciliation data
      migration.reconciliation.differences = reconciliationResult.differences || [];
      migration.reconciliation.sourceStats = reconciliationResult.sourceStats;
      migration.reconciliation.destStats = reconciliationResult.destStats;
      migration.reconciliation.summary = reconciliationResult.summary;
      
      console.log(`Reconciliation result summary:`, {
        differencesCount: reconciliationResult.differences?.length || 0,
        sourceStats: reconciliationResult.sourceStats,
        destStats: reconciliationResult.destStats,
        differences: reconciliationResult.differences?.map(d => ({
          path: d.path,
          status: d.status,
          sourceSize: d.sourceSize,
          targetSize: d.targetSize
        }))
      });
      
      // Categorize differences for better display
      migration.reconciliation.missingFiles = [];
      migration.reconciliation.extraFiles = [];
      migration.reconciliation.sizeDifferences = [];
      
      reconciliationResult.differences.forEach(diff => {
        // Skip invalid differences with unknown paths
        if (diff.path && diff.path.startsWith('unknown-')) {
          return;
        }
        
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
          case 'success':
            // Files that exist in both but might have differences - check sizes
            if (diff.sourceSize !== diff.targetSize) {
              migration.reconciliation.sizeDifferences.push(diff);
            }
            break;
          default:
            // Keep other differences for debugging
            console.log(`Unknown difference status: ${diff.status}`, diff);
            break;
        }
      });
      
      // Count meaningful differences (exclude unknown/invalid ones)
      const meaningfulDifferences = reconciliationResult.differences.filter(diff => 
        diff.path && 
        !diff.path.startsWith('unknown-') && 
        diff.path !== 'unknown' &&
        (diff.status === 'missing' || diff.status === 'extra' || 
         diff.status === 'newer' || diff.status === 'older' || 
         diff.status === 'size-differs' || diff.status === 'differs' ||
         (diff.status === 'success' && diff.sourceSize !== diff.targetSize))
      );
      
      const totalMeaningfulDifferences = meaningfulDifferences.length;
      console.log(`Total differences found: ${reconciliationResult.differences.length}, meaningful: ${totalMeaningfulDifferences}`);
      
      migration.status = totalMeaningfulDifferences === 0 ? 'verified' : 'completed_with_differences';
      
      // Update final statistics from reconciliation
      if (reconciliationResult.sourceStats && migration.stats.totalObjects === 0) {
        migration.stats.totalObjects = reconciliationResult.sourceStats.objectCount;
        migration.stats.totalSize = reconciliationResult.sourceStats.totalSize;
        console.log(`Updated total stats from reconciliation: ${migration.stats.totalObjects} objects, ${migration.stats.totalSize} bytes`);
      }
      
      if (reconciliationResult.destStats && migration.stats.transferredObjects === 0) {
        migration.stats.transferredObjects = reconciliationResult.destStats.objectCount;
        migration.stats.transferredSize = reconciliationResult.destStats.totalSize;
        console.log(`Updated transferred stats from reconciliation: ${migration.stats.transferredObjects} objects, ${migration.stats.transferredSize} bytes`);
      }
      
      console.log(`Reconciliation completed: ${reconciliationResult.differences.length} differences found, ${totalMeaningfulDifferences} meaningful`);
      console.log(`Missing: ${migration.reconciliation.missingFiles.length}, Extra: ${migration.reconciliation.extraFiles.length}, Size: ${migration.reconciliation.sizeDifferences.length}`);
      
      // Log reconciliation completion
      if (migration.logFile) {
        try {
          const logStream = fs.createWriteStream(migration.logFile, { flags: 'a' });
          const timestamp = new Date().toISOString();
          logStream.write(`\n==========================================\n`);
          logStream.write(`DATA RECONCILIATION COMPLETED\n`);
          logStream.write(`==========================================\n`);
          logStream.write(`Migration ID: ${migration.id}\n`);
          logStream.write(`Completed at: ${timestamp}\n`);
          logStream.write(`Status: ${migration.status}\n`);
          logStream.write(`Total differences found: ${reconciliationResult.differences.length}, meaningful: ${totalMeaningfulDifferences}\n\n`);
          
          if (totalMeaningfulDifferences > 0) {
            logStream.write(`DIFFERENCE BREAKDOWN:\n`);
            logStream.write(`  - Missing files (in destination): ${migration.reconciliation.missingFiles.length}\n`);
            logStream.write(`  - Extra files (only in destination): ${migration.reconciliation.extraFiles.length}\n`);
            logStream.write(`  - Size differences: ${migration.reconciliation.sizeDifferences.length}\n\n`);
            
            // Log detailed differences with full path information
            if (migration.reconciliation.missingFiles.length > 0) {
              logStream.write(`MISSING FILES (present in source but not in destination):\n`);
              migration.reconciliation.missingFiles.forEach((diff, index) => {
                logStream.write(`  ${index + 1}. ${diff.path || diff.key || 'unknown'}\n`);
                if (diff.sourceUrl) {
                  logStream.write(`      Source: ${diff.sourceUrl}\n`);
                }
              });
              logStream.write(`\n`);
            }
            
            if (migration.reconciliation.extraFiles.length > 0) {
              logStream.write(`EXTRA FILES (present in destination but not in source):\n`);
              migration.reconciliation.extraFiles.forEach((diff, index) => {
                logStream.write(`  ${index + 1}. ${diff.path || diff.key || 'unknown'}\n`);
                if (diff.targetUrl) {
                  logStream.write(`      Destination: ${diff.targetUrl}\n`);
                }
              });
              logStream.write(`\n`);
            }
            
            if (migration.reconciliation.sizeDifferences.length > 0) {
              logStream.write(`SIZE DIFFERENCES:\n`);
              migration.reconciliation.sizeDifferences.forEach((diff, index) => {
                logStream.write(`  ${index + 1}. ${diff.path || diff.key || 'unknown'}\n`);
                logStream.write(`      Source size: ${this.formatBytes(diff.sourceSize || 0)}\n`);
                logStream.write(`      Destination size: ${this.formatBytes(diff.targetSize || 0)}\n`);
                if (diff.sourceUrl && diff.targetUrl) {
                  logStream.write(`      Source: ${diff.sourceUrl}\n`);
                  logStream.write(`      Destination: ${diff.targetUrl}\n`);
                }
              });
              logStream.write(`\n`);
            }
          } else {
            logStream.write(`PERFECT MATCH: All files transferred successfully with no differences!\n\n`);
          }
          
          logStream.write(`FINAL BUCKET STATISTICS:\n`);
          if (reconciliationResult.sourceStats) {
            logStream.write(`  Source: ${reconciliationResult.sourceStats.objectCount} objects, ${this.formatBytes(reconciliationResult.sourceStats.totalSize)}\n`);
          }
          if (reconciliationResult.destStats) {
            logStream.write(`  Destination: ${reconciliationResult.destStats.objectCount} objects, ${this.formatBytes(reconciliationResult.destStats.totalSize)}\n`);
          }
          logStream.write(`==========================================\n`);
          logStream.end();
        } catch (error) {
          console.warn('Could not write reconciliation completion to log file:', error.message);
        }
      }
      
    } catch (error) {
      migration.reconciliation.status = 'failed';
      migration.reconciliation.error = error.message;
      migration.errors.push(`Reconciliation failed: ${error.message}`);
    }

    this.broadcastMigrationUpdate(migration);
  }

  async performReconciliation(source, destination) {
    console.log(`Starting reconciliation: ${source} ↔ ${destination}`);
    
    try {
      // Get bucket statistics for both source and destination
      const [sourceStats, destStats, differences] = await Promise.all([
        this.getBucketStats(source),
        this.getBucketStats(destination),
        this.compareDirectories(source, destination)
      ]);

      console.log(`Source stats: ${sourceStats.objectCount} objects, ${sourceStats.totalSize} bytes`);
      console.log(`Dest stats: ${destStats.objectCount} objects, ${destStats.totalSize} bytes`);
      console.log(`Found ${differences.length} differences`);
      
      if (differences.length > 0) {
        console.log('Differences:', differences.map(d => `${d.path} (${d.status})`).join(', '));
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
      console.error(`Reconciliation failed for ${source} ↔ ${destination}:`, error);
      throw new Error(`Reconciliation failed: ${error.message}`);
    }
  }

  async getBucketStats(bucketPath) {
    return new Promise((resolve, reject) => {
      // Use mc ls --recursive to get actual file count, not directory count
      const command = `${this.quoteMcPath()} ls ${bucketPath} --recursive --json`;
      console.log(`Getting bucket stats: ${command}`);
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.log(`Bucket stats error for ${bucketPath}:`, error.message);
          resolve({ objectCount: 0, totalSize: 0 }); // Default if bucket is empty or inaccessible
          return;
        }

        try {
          if (!stdout || stdout.trim() === '') {
            console.log(`Empty bucket: ${bucketPath}`);
            resolve({ objectCount: 0, totalSize: 0 });
            return;
          }

          const lines = stdout.trim().split('\n').filter(line => line.trim());
          let totalSize = 0;
          let objectCount = 0;

          // console.log(`Processing ${lines.length} lines for ${bucketPath}`);

          lines.forEach((line, index) => {
            try {
              const data = JSON.parse(line);
                              // Only count actual files (not directories)
                if (data.type === 'file' || (data.size !== undefined && data.size > 0)) {
                  totalSize += data.size || 0;
                  objectCount++;
                }
            } catch (e) {
              console.warn(`Skipping invalid JSON line in bucket stats: ${line}`);
            }
          });

          console.log(`Final stats for ${bucketPath}: ${objectCount} files, ${totalSize} bytes`);
          resolve({ objectCount, totalSize });
        } catch (error) {
          console.error(`Parse error in getBucketStats:`, error);
          resolve({ objectCount: 0, totalSize: 0 });
        }
      });
    });
  }

  // Convert HTTPS URL back to alias format for mc commands
  convertUrlToAlias(url) {
    if (!url || !url.startsWith('https://')) {
      return url; // Already in alias format or empty
    }
    
    // Extract the important parts from URL
    // Example: https://s3.ap-southeast-1.amazonaws.com/awstargetbucket502/diff.txt
    // Should become: target-aws/awstargetbucket502/diff.txt
    
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.substring(1).split('/'); // Remove leading slash and split
      const bucketName = pathParts[0];
      const filePath = pathParts.slice(1).join('/');
      
      // Try to match with known aliases based on bucket name
      // This is a simple heuristic - you might need to adjust based on your alias naming
      if (bucketName.includes('source') || bucketName.includes('Source')) {
        return `source-aws/${bucketName}/${filePath}`;
      } else if (bucketName.includes('target') || bucketName.includes('Target')) {
        return `target-aws/${bucketName}/${filePath}`;
      } else {
        // Fallback: try to guess based on common patterns
        // If URL contains amazonaws.com, likely AWS S3
        if (urlObj.hostname.includes('amazonaws.com')) {
          // Try both source-aws and target-aws, we'll handle errors gracefully
          return `target-aws/${bucketName}/${filePath}`;
        }
      }
    } catch (error) {
      console.warn(`Failed to parse URL: ${url}`, error.message);
    }
    
    return url; // Return original if conversion fails
  }

  async getFileSizeFromUrl(fileUrl) {
    return new Promise((resolve, reject) => {
      // Convert HTTPS URL to alias format
      const aliasPath = this.convertUrlToAlias(fileUrl);
      console.log(`Converting URL: ${fileUrl} -> ${aliasPath}`);
      
      // Try mc ls first (more reliable), then fall back to mc stat
      const lsCommand = `${this.quoteMcPath()} ls "${aliasPath}" --json`;
      console.log(`Getting file size with command: ${lsCommand}`);
      
      exec(lsCommand, { timeout: 10000 }, (error, stdout, stderr) => {
        if (!error && stdout && stdout.trim()) {
          try {
            const lines = stdout.trim().split('\n');
            for (const line of lines) {
              if (line.trim()) {
                const fileInfo = JSON.parse(line);
                if (fileInfo.size !== undefined) {
                  console.log(`Extracted size via mc ls for ${aliasPath}: ${fileInfo.size} bytes`);
                  resolve(fileInfo.size);
                  return;
                }
              }
            }
          } catch (parseError) {
            console.warn(`Failed to parse mc ls output for ${aliasPath}:`, parseError.message);
          }
        }
        
        // Fallback to mc stat
        const statCommand = `${this.quoteMcPath()} stat "${aliasPath}" --json`;
        console.log(`Fallback to mc stat: ${statCommand}`);
        
        exec(statCommand, { timeout: 10000 }, (statError, statStdout, statStderr) => {
          if (statError) {
            console.warn(`Both mc ls and mc stat failed for ${aliasPath}:`, statError.message);
            if (statStderr) console.warn(`Stderr: ${statStderr}`);
            
            // Try the source-aws alias as fallback if target-aws failed
            if (aliasPath.startsWith('target-aws/')) {
              const sourceAlias = aliasPath.replace('target-aws/', 'source-aws/');
              console.log(`Trying source alias fallback: ${sourceAlias}`);
              
              const fallbackCommand = `${this.quoteMcPath()} stat "${sourceAlias}" --json`;
              exec(fallbackCommand, { timeout: 10000 }, (fbError, fbStdout, fbStderr) => {
                if (!fbError && fbStdout) {
                  try {
                    const statInfo = JSON.parse(fbStdout.trim());
                    const size = statInfo.size || 0;
                    console.log(`Extracted size via source fallback for ${sourceAlias}: ${size} bytes`);
                    resolve(size);
                    return;
                  } catch (parseError) {
                    console.warn(`Fallback parse failed:`, parseError.message);
                  }
                }
                console.warn(`All attempts failed for ${fileUrl}`);
                resolve(0);
              });
            } else {
              resolve(0);
            }
            return;
          }
          
          console.log(`mc stat output for ${aliasPath}:`, statStdout);
          
          try {
            if (!statStdout || statStdout.trim() === '') {
              console.warn(`Empty output from mc stat for ${aliasPath}`);
              resolve(0);
              return;
            }
            
            const statInfo = JSON.parse(statStdout.trim());
            const size = statInfo.size || 0;
            console.log(`Extracted size via mc stat for ${aliasPath}: ${size} bytes`);
            resolve(size);
          } catch (parseError) {
            console.warn(`Failed to parse stat output for ${aliasPath}:`, parseError.message);
            console.warn(`Raw output was:`, statStdout);
            resolve(0);
          }
        });
      });
    });
  }

  async updateReconciliationSizes(migrationId) {
    console.log(`Updating reconciliation sizes for migration: ${migrationId}`);
    
    try {
      // Get migration from database
      const migration = database.getMigration(migrationId);
      if (!migration || !migration.reconciliation || !migration.reconciliation.differences) {
        console.warn(`No reconciliation data found for migration ${migrationId}`);
        return null;
      }

      // Update sizes for all differences
      const updatedDifferences = await Promise.all(
        migration.reconciliation.differences.map(async (diff) => {
          try {
            // Get source file size if URL exists
            if (diff.sourceUrl && diff.sourceSize === 0) {
              const sourceSize = await this.getFileSizeFromUrl(diff.sourceUrl);
              diff.sourceSize = sourceSize;
              console.log(`Updated source size for ${diff.path}: ${sourceSize} bytes`);
            }
            
            // Get target file size if URL exists
            if (diff.targetUrl && diff.targetSize === 0) {
              const targetSize = await this.getFileSizeFromUrl(diff.targetUrl);
              diff.targetSize = targetSize;
              console.log(`Updated target size for ${diff.path}: ${targetSize} bytes`);
            }
          } catch (error) {
            console.warn(`Failed to update sizes for ${diff.path}:`, error.message);
          }
          return diff;
        })
      );

      // Update categorized differences as well
      migration.reconciliation.differences = updatedDifferences;
      
      // Re-categorize with updated sizes
      migration.reconciliation.missingFiles = [];
      migration.reconciliation.extraFiles = [];
      migration.reconciliation.sizeDifferences = [];
      
      updatedDifferences.forEach(diff => {
        if (diff.path && diff.path.startsWith('unknown-')) {
          return;
        }
        
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
          case 'success':
            if (diff.sourceSize !== diff.targetSize) {
              migration.reconciliation.sizeDifferences.push(diff);
            }
            break;
        }
      });

      // Save updated migration to database
      database.updateMigration(migrationId, migration);
      
      // Broadcast the update
      this.broadcastMigrationUpdate(migration);
      
      console.log(`Successfully updated reconciliation sizes for migration ${migrationId}`);
      return migration;
      
    } catch (error) {
      console.error(`Error updating reconciliation sizes for ${migrationId}:`, error);
      return null;
    }
  }

  async compareDirectories(source, destination) {
    return new Promise((resolve, reject) => {
      const command = `${this.quoteMcPath()} diff ${source} ${destination} --json`;
      console.log(`Comparing directories: ${command}`);
      
      exec(command, (error, stdout, stderr) => {
        console.log(`mc diff output - Error: ${!!error}, Stdout length: ${stdout?.length || 0}, Stderr: ${stderr}`);
        
        // mc diff returns exit code 1 when differences are found, but this is normal
        if (error && !stdout && stderr) {
          console.error(`Directory comparison failed: ${stderr}`);
          reject(new Error(`Directory comparison failed: ${stderr || error.message}`));
          return;
        }

        try {
          if (!stdout || stdout.trim() === '') {
            console.log('No differences found (empty output)');
            resolve([]);
            return;
          }

          const lines = stdout.trim().split('\n').filter(line => line.trim());
          const differences = [];

          console.log(`Processing ${lines.length} output lines`);
          
          lines.forEach((line, index) => {
            try {
              const data = JSON.parse(line);
              console.log(`Line ${index + 1}:`, data);
              
              if (data.status && data.status !== 'same') {
                // mc diff uses 'first' and 'second' fields for URLs
                const sourceUrl = data.first || '';
                const targetUrl = data.second || '';
                
                // Determine the type of difference and extract file path
                let filePath = '';
                let diffType = data.status;
                
                // First, check URL presence to determine basic type
                if (sourceUrl && !targetUrl) {
                   // File exists in source but not in destination (missing from dest)
                   diffType = 'missing';
                   filePath = sourceUrl.split('/').pop() || 'unknown';
                 } else if (!sourceUrl && targetUrl) {
                   // File exists in destination but not in source (extra in dest)
                   diffType = 'extra';
                   filePath = targetUrl.split('/').pop() || 'unknown';
                 } else if (sourceUrl && targetUrl) {
                   // File exists in both but has differences
                   // Use diff codes to determine exact type of difference
                   switch (data.diff) {
                     case 1:
                       diffType = 'newer';
                       break;
                     case 2:
                       diffType = 'older';
                       break;
                     case 4:
                       diffType = 'size-differs';
                       break;
                     case 6:
                       // Special case: diff code 6 can mean various things
                       diffType = 'differs';
                       break;
                     default:
                       diffType = 'differs';
                   }
                   filePath = sourceUrl.split('/').pop() || targetUrl.split('/').pop() || 'unknown';
                 } else {
                   // Handle edge case where mc diff reports status but no clear URLs
                   // Use diff code to determine type
                   switch (data.diff) {
                     case 6:
                       // This often means file missing in source but exists in dest
                       diffType = 'extra';
                       // Try to extract filename from any available data
                       filePath = 'unknown-diff-6';
                       break;
                     default:
                       diffType = data.status || 'unknown';
                       filePath = 'unknown-diff-' + (data.diff || 'none');
                   }
                 }
                
                // Only add valid differences with proper paths
                if (filePath && filePath !== 'unknown' && !filePath.startsWith('unknown-')) {
                  const diff = {
                    path: filePath,
                    status: diffType,
                    sourceSize: data.sourceSize || 0,
                    targetSize: data.targetSize || 0,
                    sourceUrl: sourceUrl,
                    targetUrl: targetUrl,
                    diffCode: data.diff
                  };
                  differences.push(diff);
                  console.log(`Added difference:`, diff);
                } else {
                  console.log(`Skipped invalid difference with path: ${filePath}`, data);
                }
              }
            } catch (e) {
              console.warn(`Skipping invalid JSON line ${index + 1}: ${line}`);
            }
          });

          console.log(`Found ${differences.length} valid differences`);
          
          // Fetch actual file sizes for the differences
          Promise.all(differences.map(async (diff) => {
            try {
              // Get source file size if URL exists
              if (diff.sourceUrl) {
                const sourceSize = await this.getFileSizeFromUrl(diff.sourceUrl);
                diff.sourceSize = sourceSize;
              }
              
              // Get target file size if URL exists
              if (diff.targetUrl) {
                const targetSize = await this.getFileSizeFromUrl(diff.targetUrl);
                diff.targetSize = targetSize;
              }
              
              console.log(`Updated sizes for ${diff.path}: source=${diff.sourceSize}, target=${diff.targetSize}`);
            } catch (error) {
              console.warn(`Failed to get file sizes for ${diff.path}:`, error.message);
            }
            return diff;
          })).then(updatedDifferences => {
            resolve(updatedDifferences);
          }).catch(error => {
            console.warn('Error fetching file sizes, returning differences without sizes:', error.message);
            resolve(differences);
          });
        } catch (parseError) {
          console.error(`Parse error in compareDirectories:`, parseError);
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
    console.log(`Getting logs for migration: ${migrationId}`);
    
    // Get migration info
    const migration = this.activeMigrations.get(migrationId) || database.getMigration(migrationId);
    if (!migration) {
      throw new Error('Migration not found');
    }

    let logs = '';

    // 1. First try to get migration logs from database or file
    try {
      const dbLogs = database.getMigrationLogs(migrationId);
      if (dbLogs && dbLogs.trim()) {
        logs = dbLogs;
      } else if (migration.logFile) {
        logs = await fs.readFile(migration.logFile, 'utf8');
      } else {
        logs = `No migration log file available for migration ${migrationId}`;
      }
    } catch (error) {
      console.warn('Could not get migration logs:', error.message);
      logs = `Error reading migration logs: ${error.message}`;
    }

    // Check if migration is completed - if so, use cached data instead of live bucket listing
    const isCompleted = migration.status === 'completed' || 
                       migration.status === 'verified' || 
                       migration.status === 'completed_with_differences' ||
                       migration.status === 'failed';

    // 2. Add bucket comparison section
    logs += `\n\n${'='.repeat(80)}\n`;
    logs += `BUCKET COMPARISON & ANALYSIS\n`;
    logs += `${'='.repeat(80)}\n`;
    logs += `Migration ID: ${migrationId}\n`;
    logs += `Status: ${migration.status || 'Unknown'}\n`;
    logs += `Generated at: ${new Date().toISOString()}\n`;
    logs += `Source: ${migration.config?.source || 'Unknown'}\n`;
    logs += `Destination: ${migration.config?.destination || 'Unknown'}\n`;
    
    if (isCompleted) {
      logs += `Note: Using cached data for completed migration (no live bucket scan)\n`;
    }
    logs += `${'='.repeat(80)}\n\n`;

    if (isCompleted && migration.reconciliation) {
      // 3. For completed migrations, use reconciliation data instead of live bucket listing
      logs += `SOURCE BUCKET STATS (from reconciliation data)\n`;
      logs += `${'─'.repeat(60)}\n`;
      if (migration.reconciliation.sourceStats) {
        logs += `Files detected: ${migration.reconciliation.sourceStats.objectCount || 0}\n`;
        logs += `Total size: ${this.formatBytes(migration.reconciliation.sourceStats.totalSize || 0)}\n`;
      } else {
        logs += `Files detected: ${migration.stats?.totalObjects || 0}\n`;
        logs += `Total size: ${this.formatBytes(migration.stats?.totalSize || 0)}\n`;
      }
      logs += `\n`;

      logs += `DESTINATION BUCKET STATS (from reconciliation data)\n`;
      logs += `${'─'.repeat(60)}\n`;
      if (migration.reconciliation.destStats) {
        logs += `Files detected: ${migration.reconciliation.destStats.objectCount || 0}\n`;
        logs += `Total size: ${this.formatBytes(migration.reconciliation.destStats.totalSize || 0)}\n`;
      } else {
        logs += `Files detected: ${migration.stats?.transferredObjects || 0}\n`;
        logs += `Total size: ${this.formatBytes(migration.stats?.transferredSize || 0)}\n`;
      }
      logs += `\n`;
    } else {
      // 3. For active migrations, get live source bucket listing
      if (migration.config?.source) {
        try {
          logs += `SOURCE BUCKET ANALYSIS (${migration.config.source}) - LIVE SCAN\n`;
          logs += `${'─'.repeat(60)}\n`;
          const sourceListing = await this.getBucketListing(migration.config.source);
          logs += sourceListing;
          logs += `\n`;
        } catch (error) {
          console.warn('Could not get source bucket listing:', error.message);
          logs += `Error getting source bucket listing: ${error.message}\n\n`;
        }
      }

      // 4. For active migrations, get live destination bucket listing
      if (migration.config?.destination) {
        try {
          logs += `DESTINATION BUCKET ANALYSIS (${migration.config.destination}) - LIVE SCAN\n`;
          logs += `${'─'.repeat(60)}\n`;
          const destListing = await this.getBucketListing(migration.config.destination);
          logs += destListing;
          logs += `\n`;
        } catch (error) {
          console.warn('Could not get destination bucket listing:', error.message);
          logs += `Error getting destination bucket listing: ${error.message}\n\n`;
        }
      }
    }

    // 5. Add detailed reconciliation report if available
    if (migration.reconciliation && migration.reconciliation.differences && migration.reconciliation.differences.length > 0) {
      logs += `DETAILED RECONCILIATION REPORT\n`;
      logs += `${'='.repeat(80)}\n`;
      logs += `Migration completed with differences found during verification:\n\n`;
      
      // Summary
      logs += `SUMMARY\n`;
      logs += `${'─'.repeat(40)}\n`;
      logs += `• Missing files: ${migration.reconciliation.missingFiles?.length || 0}\n`;
      logs += `• Extra files: ${migration.reconciliation.extraFiles?.length || 0}\n`;
      logs += `• Size differences: ${migration.reconciliation.sizeDifferences?.length || 0}\n`;
      logs += `• Total differences: ${migration.reconciliation.differences?.length || 0}\n\n`;
      
      // Missing Files Details
      if (migration.reconciliation.missingFiles && migration.reconciliation.missingFiles.length > 0) {
        logs += `MISSING FILES (${migration.reconciliation.missingFiles.length})\n`;
        logs += `${'─'.repeat(40)}\n`;
        logs += `Files that exist in source but not in destination:\n\n`;
        migration.reconciliation.missingFiles.forEach((file, index) => {
          logs += `${index + 1}. ${file.path}\n`;
          if (file.sourceUrl) logs += `   Source: ${file.sourceUrl}\n`;
          if (file.sourceSize > 0) logs += `   Size: ${this.formatBytes(file.sourceSize)}\n`;
          logs += `\n`;
        });
      }
      
      // Extra Files Details  
      if (migration.reconciliation.extraFiles && migration.reconciliation.extraFiles.length > 0) {
        logs += `EXTRA FILES (${migration.reconciliation.extraFiles.length})\n`;
        logs += `${'─'.repeat(40)}\n`;
        logs += `Files that exist in destination but not in source:\n\n`;
        migration.reconciliation.extraFiles.forEach((file, index) => {
          logs += `${index + 1}. ${file.path}\n`;
          if (file.targetUrl) logs += `   Destination: ${file.targetUrl}\n`;
          if (file.targetSize > 0) logs += `   Size: ${this.formatBytes(file.targetSize)}\n`;
          logs += `\n`;
        });
      }
      
      // Size Differences Details
      if (migration.reconciliation.sizeDifferences && migration.reconciliation.sizeDifferences.length > 0) {
        logs += `SIZE DIFFERENCES (${migration.reconciliation.sizeDifferences.length})\n`;
        logs += `${'─'.repeat(40)}\n`;
        logs += `Files with different sizes between source and destination:\n\n`;
        migration.reconciliation.sizeDifferences.forEach((file, index) => {
          logs += `${index + 1}. ${file.path}\n`;
          logs += `   Status: ${file.status}\n`;
          if (file.sourceSize !== undefined && file.targetSize !== undefined) {
            logs += `   Source: ${this.formatBytes(file.sourceSize)} → Destination: ${this.formatBytes(file.targetSize)}\n`;
          }
          if (file.sourceUrl) logs += `   Source URL: ${file.sourceUrl}\n`;
          if (file.targetUrl) logs += `   Destination URL: ${file.targetUrl}\n`;
          logs += `\n`;
        });
      }
      
      // Other Differences
      const otherDifferences = migration.reconciliation.differences.filter(diff => 
        !migration.reconciliation.missingFiles?.includes(diff) &&
        !migration.reconciliation.extraFiles?.includes(diff) &&
        !migration.reconciliation.sizeDifferences?.includes(diff) &&
        diff.path && !diff.path.startsWith('unknown-')
      );
      
      if (otherDifferences.length > 0) {
        logs += `OTHER DIFFERENCES (${otherDifferences.length})\n`;
        logs += `${'─'.repeat(40)}\n`;
        logs += `Other types of differences found:\n\n`;
        otherDifferences.forEach((file, index) => {
          logs += `${index + 1}. ${file.path}\n`;
          logs += `   Status: ${file.status}\n`;
          if (file.sourceSize !== undefined && file.targetSize !== undefined && (file.sourceSize > 0 || file.targetSize > 0)) {
            logs += `   Source: ${this.formatBytes(file.sourceSize)} | Destination: ${this.formatBytes(file.targetSize)}\n`;
          }
          if (file.sourceUrl) logs += `   Source URL: ${file.sourceUrl}\n`;
          if (file.targetUrl) logs += `   Destination URL: ${file.targetUrl}\n`;
          logs += `\n`;
        });
      }
      
      logs += `${'='.repeat(80)}\n`;
    }

    logs += `${'='.repeat(80)}\n`;
    logs += `END OF COMPREHENSIVE MIGRATION LOG\n`;
    logs += `${'='.repeat(80)}\n`;

    return logs;
  }

  async getBucketListing(bucketPath) {
    // Check cache first
    const cacheKey = bucketPath;
    const cachedResult = this.bucketListingCache.get(cacheKey);
    if (cachedResult && (Date.now() - cachedResult.timestamp) < this.cacheTimeout) {
      console.log(`Using cached bucket listing for: ${bucketPath} (cached ${Math.round((Date.now() - cachedResult.timestamp) / 1000)}s ago)`);
      return cachedResult.data;
    }

    return new Promise((resolve, reject) => {
      const command = `${this.quoteMcPath()} ls ${bucketPath} --recursive --summarize`;
      console.log(`Getting bucket listing: ${command}`);
      
      exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
        if (error) {
          console.log(`Bucket listing error for ${bucketPath}:`, error.message);
          // Don't reject, return error message instead
          const errorMessage = `Error listing bucket: ${error.message}\n` +
                  `Command: ${command}\n` +
                  `This might indicate:\n` +
                  `• Bucket doesn't exist\n` +
                  `• Access permission issues\n` +
                  `• Network connectivity problems\n` +
                  `• MinIO client configuration issues\n\n`;
          
          // Cache error results briefly (1 minute) to avoid repeated failures
          this.bucketListingCache.set(cacheKey, {
            data: errorMessage,
            timestamp: Date.now()
          });
          
          resolve(errorMessage);
          return;
        }

        if (stderr && stderr.trim()) {
          console.log(`Bucket listing stderr for ${bucketPath}:`, stderr);
        }

        try {
          if (!stdout || stdout.trim() === '') {
            const emptyMessage = `Bucket is empty: ${bucketPath}\n` +
                   `Total: 0 objects, 0 B\n\n`;
            
            // Cache empty bucket results
            this.bucketListingCache.set(cacheKey, {
              data: emptyMessage,
              timestamp: Date.now()
            });
            
            resolve(emptyMessage);
            return;
          }

          let listing = `Bucket: ${bucketPath}\n`;
          listing += `Command: ${command}\n`;
          listing += `Generated: ${new Date().toISOString()}\n\n`;

          // Parse the output to extract file listings and summary
          const lines = stdout.split('\n');
          let fileCount = 0;
          let totalSize = 0;
          let summaryFound = false;
          
          listing += `FILE LISTING:\n`;
          listing += `${'─'.repeat(40)}\n`;

          lines.forEach(line => {
            const trimmedLine = line.trim();
            if (!trimmedLine) return;

            // Check for summary line (usually at the end)
            if (trimmedLine.includes('Total:') || trimmedLine.includes('objects')) {
              listing += `\nSUMMARY:\n`;
              listing += `${trimmedLine}\n`;
              summaryFound = true;
              
              // Extract numbers from summary for our own tracking
              const objectMatch = trimmedLine.match(/(\d+)\s+objects?/i);
              const sizeMatch = trimmedLine.match(/(\d+(?:\.\d+)?)\s*([KMGT]?B)/i);
              
              if (objectMatch) {
                fileCount = parseInt(objectMatch[1]);
              }
              if (sizeMatch) {
                const size = parseFloat(sizeMatch[1]);
                const unit = sizeMatch[2];
                totalSize = this.convertToBytes(size, unit);
              }
            } else {
              // Regular file listing line
              if (trimmedLine.length > 0 && !trimmedLine.startsWith('[') && 
                  !trimmedLine.startsWith('mc:') && !trimmedLine.includes('WARNING')) {
                listing += `${trimmedLine}\n`;
                // Don't increment here, we'll get correct count from summary or manual parsing
              }
            }
          });

          // Don't add ANALYSIS section as it's redundant with SUMMARY

          listing += `\n`;
          
          // Cache the result for future use
          this.bucketListingCache.set(cacheKey, {
            data: listing,
            timestamp: Date.now()
          });
          
          resolve(listing);

        } catch (parseError) {
          console.error(`Parse error in getBucketListing:`, parseError);
          resolve(`Error parsing bucket listing: ${parseError.message}\n` +
                  `Raw output:\n${stdout}\n\n`);
        }
      });
    });
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
    // First check active migrations
    let migration = this.activeMigrations.get(migrationId);
    
    // If not found in active migrations, check database
    if (!migration) {
      migration = database.getMigration(migrationId);
      if (!migration) {
        throw new Error('Migration not found');
      }
    }

    return {
      id: migration.id,
      config: migration.config, // Include config with source/destination paths
      status: migration.status,
      progress: migration.progress,
      stats: migration.stats,
      errors: migration.errors,
      reconciliation: migration.reconciliation,
      startTime: migration.startTime,
      endTime: migration.endTime,
      duration: migration.endTime ? 
        (new Date(migration.endTime).getTime() - new Date(migration.startTime).getTime()) / 1000 : 
        migration.startTime ? (new Date().getTime() - new Date(migration.startTime).getTime()) / 1000 : 0
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