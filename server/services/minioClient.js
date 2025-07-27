const { spawn, exec } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { broadcast } = require('./websocket');

class MinioClientService {
  constructor() {
    this.mcPath = process.env.MC_PATH || 'mc';
    this.activeMigrations = new Map();
    this.logDir = path.join(__dirname, '../logs');
    this.ensureLogDirectory();
  }

  async ensureLogDirectory() {
    try {
      await fs.ensureDir(this.logDir);
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
  }

  async checkMcInstallation() {
    return new Promise((resolve) => {
      exec(`${this.mcPath} --version`, (error, stdout, stderr) => {
        if (error) {
          resolve({ installed: false, error: error.message });
        } else {
          resolve({ installed: true, version: stdout.trim() });
        }
      });
    });
  }

  async configureAlias(aliasName, endpoint, accessKey, secretKey) {
    return new Promise((resolve, reject) => {
      const command = `${this.mcPath} alias set ${aliasName} ${endpoint} ${accessKey} ${secretKey}`;
      
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
      const command = `${this.mcPath} ls ${aliasName} --json`;
      
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
      const command = `${this.mcPath} du ${aliasName}/${bucketName} --json`;
      
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
      startTime: new Date(),
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
    let command = `${this.mcPath} mirror`;
    
    if (options.overwrite) command += ' --overwrite';
    if (options.remove) command += ' --remove';
    if (options.exclude && options.exclude.length > 0) {
      options.exclude.forEach(pattern => {
        command += ` --exclude "${pattern}"`;
      });
    }
    
    command += ` ${source} ${destination}`;
    
    console.log(`Starting migration: ${command}`);
    
    // Create log file
    const logStream = fs.createWriteStream(migration.logFile, { flags: 'a' });
    logStream.write(`Migration started at ${new Date().toISOString()}\n`);
    logStream.write(`Command: ${command}\n\n`);

    migration.status = 'running';
    this.broadcastMigrationUpdate(migration);

    const childProcess = spawn(this.mcPath, this.parseCommand(command), {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    migration.process = childProcess;

    childProcess.stdout.on('data', (data) => {
      const output = data.toString();
      logStream.write(output);
      this.parseProgress(migration, output);
    });

    childProcess.stderr.on('data', (data) => {
      const error = data.toString();
      logStream.write(`ERROR: ${error}`);
      migration.errors.push(error);
      this.broadcastMigrationUpdate(migration);
    });

    childProcess.on('close', (code) => {
      logStream.write(`\nMigration finished at ${new Date().toISOString()}\n`);
      logStream.write(`Exit code: ${code}\n`);
      logStream.end();

      migration.status = code === 0 ? 'completed' : 'failed';
      migration.endTime = new Date();
      migration.progress = code === 0 ? 100 : migration.progress;
      
      this.broadcastMigrationUpdate(migration);
      
      // Start reconciliation if migration succeeded
      if (code === 0) {
        this.startReconciliation(migration);
      }
    });

    childProcess.on('error', (error) => {
      migration.status = 'failed';
      migration.errors.push(error.message);
      logStream.write(`PROCESS ERROR: ${error.message}\n`);
      logStream.end();
      this.broadcastMigrationUpdate(migration);
    });
  }

  parseCommand(command) {
    // Convert command string to array for spawn
    return command.split(' ').slice(1); // Remove 'mc' from the beginning
  }

  parseProgress(migration, output) {
    // Parse mc mirror output for progress information
    const lines = output.split('\n');
    
    lines.forEach(line => {
      // Look for transfer progress patterns
      if (line.includes('...')) {
        const match = line.match(/(\d+(?:\.\d+)?)\s*([KMGT]?B)\/s/);
        if (match) {
          migration.stats.speed = this.parseSize(match[1] + match[2]);
        }
      }
      
      // Count transferred objects (simple heuristic)
      if (line.includes('->') || line.includes('copied')) {
        migration.stats.transferredObjects++;
        migration.progress = Math.min(95, (migration.stats.transferredObjects / Math.max(1, migration.stats.totalObjects)) * 100);
      }
    });

    this.broadcastMigrationUpdate(migration);
  }

  async startReconciliation(migration) {
    migration.status = 'reconciling';
    migration.reconciliation = {
      status: 'running',
      startTime: new Date(),
      differences: []
    };

    this.broadcastMigrationUpdate(migration);

    try {
      const differences = await this.performReconciliation(migration.config.source, migration.config.destination);
      
      migration.reconciliation.status = 'completed';
      migration.reconciliation.endTime = new Date();
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
      const command = `${this.mcPath} diff ${source} ${destination} --json`;
      
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