const { spawn, exec } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { broadcast } = require('./websocket');

class MinioClientService {
  constructor() {
    // Detect MinIO client path
    this.mcPath = this.detectMcPath();
    this.activeMigrations = new Map();
    this.logDir = path.join(__dirname, '../logs');
    this.migrationsFile = path.join(this.logDir, 'migrations.json');
    this.ensureLogDirectory();
    this.loadMigrations();
  }

  detectMcPath() {
    if (process.env.MC_PATH) {
      return process.env.MC_PATH;
    }
    
    // Try common Windows paths
    if (process.platform === 'win32') {
      const commonPaths = [
        path.join(process.cwd(), 'mc.exe'), // Project root - YOUR LOCATION
        path.join(process.cwd(), 'server', 'mc.exe'), // Server folder
        'C:\\Program Files\\Minio\\mc.exe',
        'C:\\Program Files\\MinIO\\mc.exe', 
        'C:\\Program Files (x86)\\Minio\\mc.exe',
        'C:\\Program Files (x86)\\MinIO\\mc.exe',
        'C:\\Windows\\System32\\mc.exe',
        'mc.exe',
        'mc'
      ];
      
      for (const testPath of commonPaths) {
        if (fs.existsSync(testPath)) {
          console.log(`Found MinIO client at: ${testPath}`);
          return testPath;
        }
      }
    }
    
    return 'mc'; // Fallback to PATH
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

  async loadMigrations() {
    try {
      if (await fs.pathExists(this.migrationsFile)) {
        const data = await fs.readJson(this.migrationsFile);
        if (Array.isArray(data)) {
          // Keep only migrations from the last 7 days and limit to 100 most recent
          const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          const recentMigrations = data
            .filter(migration => new Date(migration.startTime) > oneWeekAgo)
            .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
            .slice(0, 100);
          
          recentMigrations.forEach(migration => {
            this.activeMigrations.set(migration.id, migration);
          });
          console.log(`Loaded ${recentMigrations.length} recent migrations from disk`);
          
          // If we filtered out old migrations, save the cleaned up list
          if (recentMigrations.length < data.length) {
            this.saveMigrations();
          }
        }
      }
    } catch (error) {
      console.error('Failed to load migrations:', error);
    }
  }

  async saveMigrations() {
    try {
      const migrations = Array.from(this.activeMigrations.values());
      await fs.writeJson(this.migrationsFile, migrations, { spaces: 2 });
    } catch (error) {
      console.error('Failed to save migrations:', error);
    }
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

    this.activeMigrations.set(migrationId, migration);
    
    // Save migrations to disk for persistence
    this.saveMigrations();

    try {
      await this.executeMigration(migration);
      return { migrationId, status: 'started' };
    } catch (error) {
      migration.status = 'failed';
      migration.errors.push(error.message);
      throw error;
    }
  }

  async executeMigration(migration) {
    const { source, destination, options = {} } = migration.config;
    
    // Build mc mirror command
    let command = `${this.quoteMcPath()} mirror`;
    
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

    const childProcess = spawn(this.mcPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
      shell: process.platform === 'win32', // Use shell on Windows
      windowsHide: false, // Don't hide window on Windows for debugging
      timeout: 300000 // 5 minutes timeout
    });

    migration.process = childProcess;

    childProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('MC STDOUT:', output);
      logStream.write(`STDOUT: ${output}`);
      this.parseProgress(migration, output);
    });

    childProcess.stderr.on('data', (data) => {
      const error = data.toString();
      console.log('MC STDERR:', error);
      logStream.write(`STDERR: ${error}`);
      migration.errors.push(error);
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
    const parts = command.split(' ').slice(1); // Remove 'mc' from the beginning
    
    let currentArg = '';
    let inQuotes = false;
    
    for (let part of parts) {
      if (part.startsWith('"') && part.endsWith('"')) {
        // Complete quoted argument
        args.push(part.slice(1, -1));
      } else if (part.startsWith('"')) {
        // Start of quoted argument
        currentArg = part.slice(1);
        inQuotes = true;
      } else if (part.endsWith('"') && inQuotes) {
        // End of quoted argument
        currentArg += ' ' + part.slice(0, -1);
        args.push(currentArg);
        currentArg = '';
        inQuotes = false;
      } else if (inQuotes) {
        // Middle of quoted argument
        currentArg += ' ' + part;
      } else {
        // Regular argument
        args.push(part);
      }
    }
    
    console.log('Parsed command args:', args);
    return args;
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
      
      // Count transferred objects (various patterns)
      if (trimmedLine.includes('->') || 
          trimmedLine.includes('copied') || 
          trimmedLine.includes('COPY') ||
          trimmedLine.includes('PUT')) {
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
      const differences = await this.performReconciliation(migration.config.source, migration.config.destination);
      
      migration.reconciliation.status = 'completed';
      migration.reconciliation.endTime = new Date().toISOString();
      migration.reconciliation.differences = differences;
      migration.status = differences.length === 0 ? 'verified' : 'completed_with_differences';
      
    } catch (error) {
      migration.reconciliation.status = 'failed';
      migration.reconciliation.error = error.message;
      migration.errors.push(`Reconciliation failed: ${error.message}`);
    }

    this.broadcastMigrationUpdate(migration);
  }

  async performReconciliation(source, destination) {
    // Compare source and destination using mc diff
    return new Promise((resolve, reject) => {
      const command = `${this.quoteMcPath()} diff ${source} ${destination} --json`;
      
      exec(command, (error, stdout, stderr) => {
        if (error && !stdout) {
          reject(new Error(`Reconciliation failed: ${stderr || error.message}`));
          return;
        }

        try {
          const lines = stdout.trim().split('\n').filter(line => line);
          const differences = [];

          lines.forEach(line => {
            try {
              const data = JSON.parse(line);
              if (data.status && data.status !== 'same') {
                differences.push({
                  path: data.source || data.target,
                  status: data.status,
                  sourceSize: data.sourceSize || 0,
                  targetSize: data.targetSize || 0
                });
              }
            } catch (e) {
              // Skip invalid JSON lines
            }
          });

          resolve(differences);
        } catch (parseError) {
          resolve([]); // Return empty array if parsing fails
        }
      });
    });
  }

  broadcastMigrationUpdate(migration) {
    // Save migrations to disk for persistence
    this.saveMigrations();
    
    broadcast({
      type: 'migration_update',
      data: {
        id: migration.id,
        status: migration.status,
        progress: migration.progress,
        stats: migration.stats,
        errors: migration.errors,
        reconciliation: migration.reconciliation,
        duration: migration.endTime ? 
          (migration.endTime - migration.startTime) / 1000 : 
          (new Date() - migration.startTime) / 1000
      }
    }, 'migrations');
  }

  async getMigrationLogs(migrationId) {
    const migration = this.activeMigrations.get(migrationId);
    if (!migration) {
      throw new Error('Migration not found');
    }

    try {
      const logs = await fs.readFile(migration.logFile, 'utf8');
      return logs;
    } catch (error) {
      throw new Error('Failed to read migration logs');
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
    return Array.from(this.activeMigrations.values()).map(migration => ({
      id: migration.id,
      config: migration.config,
      status: migration.status,
      progress: migration.progress,
      startTime: migration.startTime,
      endTime: migration.endTime,
      stats: migration.stats,
      errors: migration.errors,
      reconciliation: migration.reconciliation
    }));
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