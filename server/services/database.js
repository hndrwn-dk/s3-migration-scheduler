const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs-extra');

class DatabaseService {
  constructor() {
    this.dbPath = path.join(__dirname, '../data/migrations.db');
    this.ensureDataDirectory();
    this.db = new Database(this.dbPath);
    
    // Enable WAL mode for better concurrency
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    
    this.initializeTables();
    console.log('SQLite database initialized:', this.dbPath);
  }

  ensureDataDirectory() {
    const dataDir = path.dirname(this.dbPath);
    fs.ensureDirSync(dataDir);
  }

  initializeTables() {
    // Migration table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id TEXT PRIMARY KEY,
        config_source TEXT NOT NULL,
        config_destination TEXT NOT NULL,
        config_options TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'starting',
        progress INTEGER DEFAULT 0,
        start_time TEXT NOT NULL,
        end_time TEXT,
        log_file TEXT,
        errors TEXT DEFAULT '[]',
        stats_total_objects INTEGER DEFAULT 0,
        stats_transferred_objects INTEGER DEFAULT 0,
        stats_total_size INTEGER DEFAULT 0,
        stats_transferred_size INTEGER DEFAULT 0,
        stats_speed REAL DEFAULT 0,
        reconciliation_status TEXT,
        reconciliation_differences TEXT DEFAULT '[]',
        reconciliation_missing_files TEXT DEFAULT '[]',
        reconciliation_extra_files TEXT DEFAULT '[]',
        reconciliation_size_differences TEXT DEFAULT '[]',
        scheduled_time TEXT,
        execution_status TEXT DEFAULT 'immediate',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Migration logs table for better log management
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS migration_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        migration_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        level TEXT NOT NULL DEFAULT 'info',
        message TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (migration_id) REFERENCES migrations (id)
      )
    `);

    // Handle database schema migration for existing installations FIRST
    this.migrateSchemaIfNeeded();

    // Create indexes for better performance (after schema migration)
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_migrations_status ON migrations(status);
      CREATE INDEX IF NOT EXISTS idx_migrations_start_time ON migrations(start_time);
      CREATE INDEX IF NOT EXISTS idx_migrations_updated_at ON migrations(updated_at);
      CREATE INDEX IF NOT EXISTS idx_migrations_scheduled_time ON migrations(scheduled_time);
      CREATE INDEX IF NOT EXISTS idx_migrations_execution_status ON migrations(execution_status);
      CREATE INDEX IF NOT EXISTS idx_migration_logs_migration_id ON migration_logs(migration_id);
      CREATE INDEX IF NOT EXISTS idx_migration_logs_timestamp ON migration_logs(timestamp);
    `);

    console.log('Database tables initialized successfully');
  }

  // Handle database schema migration for existing installations
  migrateSchemaIfNeeded() {
    try {
      // Check if scheduled_time column exists
      const columns = this.db.prepare("PRAGMA table_info(migrations)").all();
      const hasScheduledTime = columns.some(col => col.name === 'scheduled_time');
      const hasExecutionStatus = columns.some(col => col.name === 'execution_status');

      if (!hasScheduledTime) {
        console.log('Adding scheduled_time column to migrations table');
        this.db.exec('ALTER TABLE migrations ADD COLUMN scheduled_time TEXT');
      }

      if (!hasExecutionStatus) {
        console.log('Adding execution_status column to migrations table');
        this.db.exec("ALTER TABLE migrations ADD COLUMN execution_status TEXT DEFAULT 'immediate'");
      }

      if (!hasScheduledTime || !hasExecutionStatus) {
        console.log('Database schema migration completed for scheduled migrations');
      }
    } catch (error) {
      console.error('Error during database schema migration:', error);
    }
  }

  // Migration CRUD operations
  insertMigration(migration) {
    // Validate migration config before insertion
    if (!migration.config || !migration.config.source || !migration.config.destination) {
      console.error('Invalid migration config:', migration);
      throw new Error('Migration config must have source and destination');
    }

    const stmt = this.db.prepare(`
      INSERT INTO migrations (
        id, config_source, config_destination, config_options,
        status, progress, start_time, log_file,
        errors, stats_total_objects, stats_transferred_objects,
        stats_total_size, stats_transferred_size, stats_speed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      const result = stmt.run(
        migration.id,
        migration.config.source,
        migration.config.destination,
        JSON.stringify(migration.config.options || {}),
        migration.status,
        migration.progress,
        migration.startTime,
        migration.logFile,
        JSON.stringify(migration.errors || []),
        migration.stats?.totalObjects || 0,
        migration.stats?.transferredObjects || 0,
        migration.stats?.totalSize || 0,
        migration.stats?.transferredSize || 0,
        migration.stats?.speed || 0
      );

      // Verify insertion was successful
      if (result.changes === 1) {
        console.log(`Migration inserted successfully: ${migration.id}, source: ${migration.config.source}, dest: ${migration.config.destination}`);
        
        // Double-check by reading it back
        const verification = this.db.prepare('SELECT id FROM migrations WHERE id = ?').get(migration.id);
        if (verification) {
          console.log(`Migration verified in database: ${migration.id}`);
        } else {
          console.error(`Migration verification failed: ${migration.id} not found after insert`);
        }
      } else {
        console.error(`Migration insert failed: expected 1 change, got ${result.changes}`);
      }
      
      return result;
    } catch (error) {
      console.error(`Database insert error for migration ${migration.id}:`, error);
      throw error;
    }
  }

  updateMigration(migrationId, updates) {
    const fields = [];
    const values = [];

    // Build dynamic update query
    Object.keys(updates).forEach(key => {
      switch (key) {
        case 'status':
        case 'progress':
        case 'endTime':
          fields.push(`${key.replace(/([A-Z])/g, '_$1').toLowerCase()} = ?`);
          values.push(updates[key]);
          break;
        case 'errors':
          fields.push('errors = ?');
          values.push(JSON.stringify(updates[key]));
          break;
        case 'stats':
          if (updates[key]) {
            fields.push('stats_total_objects = ?', 'stats_transferred_objects = ?', 
                       'stats_total_size = ?', 'stats_transferred_size = ?', 'stats_speed = ?');
            values.push(
              updates[key].totalObjects || 0,
              updates[key].transferredObjects || 0,
              updates[key].totalSize || 0,
              updates[key].transferredSize || 0,
              updates[key].speed || 0
            );
          }
          break;
        case 'reconciliation':
          if (updates[key]) {
            fields.push('reconciliation_status = ?', 'reconciliation_differences = ?',
                       'reconciliation_missing_files = ?', 'reconciliation_extra_files = ?',
                       'reconciliation_size_differences = ?');
            values.push(
              updates[key].status || null,
              JSON.stringify(updates[key].differences || []),
              JSON.stringify(updates[key].missingFiles || []),
              JSON.stringify(updates[key].extraFiles || []),
              JSON.stringify(updates[key].sizeDifferences || [])
            );
          }
          break;
      }
    });

    if (fields.length === 0) return;

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(migrationId);

    const stmt = this.db.prepare(`
      UPDATE migrations 
      SET ${fields.join(', ')} 
      WHERE id = ?
    `);

    const result = stmt.run(...values);
    console.log(`🔄 Migration updated: ${migrationId}`);
    return result;
  }

  getMigration(migrationId) {
    const stmt = this.db.prepare(`
      SELECT * FROM migrations WHERE id = ?
    `);
    
    const row = stmt.get(migrationId);
    return row ? this.formatMigrationRow(row) : null;
  }

  getAllMigrations(limit = 100) {
    const stmt = this.db.prepare(`
      SELECT * FROM migrations 
      ORDER BY start_time DESC 
      LIMIT ?
    `);
    
    const rows = stmt.all(limit);
    console.log(`Database getAllMigrations: found ${rows.length} rows`);
    const formatted = rows.map(row => this.formatMigrationRow(row));
    console.log(`Database getAllMigrations: returning ${formatted.length} formatted migrations`);
    return formatted;
  }

  getMigrationsByStatus(status) {
    const stmt = this.db.prepare(`
      SELECT * FROM migrations 
      WHERE status = ? 
      ORDER BY start_time DESC
    `);
    
    const rows = stmt.all(status);
    return rows.map(row => this.formatMigrationRow(row));
  }

  getRecentMigrations(hours = 24) {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    const stmt = this.db.prepare(`
      SELECT * FROM migrations 
      WHERE start_time > ? 
      ORDER BY start_time DESC
    `);
    
    const rows = stmt.all(cutoffTime);
    return rows.map(row => this.formatMigrationRow(row));
  }

  getMigrationStats() {
    const stmt = this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status IN ('completed', 'verified') THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status IN ('running', 'reconciling', 'starting') THEN 1 ELSE 0 END) as running,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled,
        SUM(CASE WHEN status = 'completed_with_differences' THEN 1 ELSE 0 END) as completed_with_differences,
        SUM(stats_transferred_size) as total_data_transferred,
        AVG(stats_speed) as average_speed
      FROM migrations
    `);
    
    const stats = stmt.get();
    
    // Get recent activity (last 24 hours)
    const recentStmt = this.db.prepare(`
      SELECT COUNT(*) as recent_activity 
      FROM migrations 
      WHERE start_time > datetime('now', '-24 hours')
    `);
    
    const recent = recentStmt.get();
    
    return {
      ...stats,
      recent_activity: recent.recent_activity,
      success_rate: stats.total > 0 ? ((stats.completed / stats.total) * 100) : 0
    };
  }

  // Log operations
  addMigrationLog(migrationId, level, message) {
    const stmt = this.db.prepare(`
      INSERT INTO migration_logs (migration_id, timestamp, level, message)
      VALUES (?, ?, ?, ?)
    `);
    
    const result = stmt.run(migrationId, new Date().toISOString(), level, message);
    return result;
  }

  getMigrationLogs(migrationId, limit = 1000) {
    const stmt = this.db.prepare(`
      SELECT timestamp, level, message
      FROM migration_logs 
      WHERE migration_id = ? 
      ORDER BY timestamp ASC
      LIMIT ?
    `);
    
    const logs = stmt.all(migrationId, limit);
    return logs.map(log => `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`).join('\n');
  }

  // Cleanup operations
  cleanupOldMigrations(daysToKeep = 30) {
    const cutoffTime = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000).toISOString();
    
    // Delete old logs first
    const logsStmt = this.db.prepare(`
      DELETE FROM migration_logs 
      WHERE migration_id IN (
        SELECT id FROM migrations WHERE start_time < ?
      )
    `);
    
    // Delete old migrations
    const migrationsStmt = this.db.prepare(`
      DELETE FROM migrations WHERE start_time < ?
    `);
    
    const logResult = logsStmt.run(cutoffTime);
    const migrationResult = migrationsStmt.run(cutoffTime);
    
    console.log(`Cleaned up ${migrationResult.changes} old migrations and ${logResult.changes} log entries`);
    return { migrations: migrationResult.changes, logs: logResult.changes };
  }

  // Helper method to format database row to migration object
  formatMigrationRow(row) {
    // Debug logging for null values
    if (!row.config_source || !row.config_destination) {
      console.warn(`Migration ${row.id} has null config: source=${row.config_source}, dest=${row.config_destination}`);
    }

    return {
      id: row.id,
      config: {
        source: row.config_source || 'Unknown',
        destination: row.config_destination || 'Unknown',
        options: JSON.parse(row.config_options || '{}')
      },
      status: row.status,
      progress: row.progress,
      startTime: row.start_time,
      endTime: row.end_time,
      logFile: row.log_file,
      errors: JSON.parse(row.errors || '[]'),
      stats: {
        totalObjects: row.stats_total_objects,
        transferredObjects: row.stats_transferred_objects,
        totalSize: row.stats_total_size,
        transferredSize: row.stats_transferred_size,
        speed: row.stats_speed
      },
      reconciliation: row.reconciliation_status ? {
        status: row.reconciliation_status,
        differences: JSON.parse(row.reconciliation_differences || '[]'),
        missingFiles: JSON.parse(row.reconciliation_missing_files || '[]'),
        extraFiles: JSON.parse(row.reconciliation_extra_files || '[]'),
        sizeDifferences: JSON.parse(row.reconciliation_size_differences || '[]')
      } : null,
      duration: row.end_time ? 
        (new Date(row.end_time).getTime() - new Date(row.start_time).getTime()) / 1000 : 
        (new Date().getTime() - new Date(row.start_time).getTime()) / 1000
    };
  }

  // Migration from JSON file (for backward compatibility)
  importFromJSON(jsonFilePath) {
    try {
      if (fs.existsSync(jsonFilePath)) {
        const data = fs.readJsonSync(jsonFilePath);
        if (Array.isArray(data)) {
          let imported = 0;
          data.forEach(migration => {
            try {
              this.insertMigration(migration);
              imported++;
            } catch (error) {
              // Skip duplicates or invalid entries
              console.warn(`Skipping migration ${migration.id}:`, error.message);
            }
          });
          console.log(`Imported ${imported} migrations from JSON file`);
          return imported;
        }
      }
    } catch (error) {
      console.error('Error importing from JSON:', error);
    }
    return 0;
  }

  // Cleanup invalid migrations with null config
  cleanupInvalidMigrations() {
    const stmt = this.db.prepare(`
      DELETE FROM migrations 
      WHERE config_source IS NULL OR config_destination IS NULL OR config_source = '' OR config_destination = ''
    `);
    
    const result = stmt.run();
    if (result.changes > 0) {
      console.log(`Cleaned up ${result.changes} invalid migrations with null/empty config`);
    }
    return result.changes;
  }

  // Scheduled migration methods
  getScheduledMigrations() {
    const stmt = this.db.prepare(`
      SELECT * FROM migrations 
      WHERE execution_status = 'scheduled' 
      AND scheduled_time > datetime('now')
      ORDER BY scheduled_time ASC
    `);
    return stmt.all().map(row => this.formatMigrationRow(row));
  }

  getPendingScheduledMigrations() {
    const stmt = this.db.prepare(`
      SELECT * FROM migrations 
      WHERE execution_status = 'scheduled' 
      AND scheduled_time <= datetime('now')
      ORDER BY scheduled_time ASC
    `);
    return stmt.all().map(row => this.formatMigrationRow(row));
  }

  updateMigrationExecutionStatus(migrationId, status) {
    const stmt = this.db.prepare(`
      UPDATE migrations 
      SET execution_status = ?, updated_at = datetime('now')
      WHERE id = ?
    `);
    return stmt.run(status, migrationId);
  }

  getScheduledMigrationStats() {
    const stmt = this.db.prepare(`
      SELECT 
        COUNT(*) as total_scheduled,
        COUNT(CASE WHEN scheduled_time > datetime('now') THEN 1 END) as future_scheduled,
        COUNT(CASE WHEN scheduled_time <= datetime('now') AND execution_status = 'scheduled' THEN 1 END) as pending_execution
      FROM migrations 
      WHERE execution_status = 'scheduled'
    `);
    return stmt.get();
  }

  close() {
    if (this.db) {
      this.db.close();
      console.log('Database connection closed');
    }
  }
}

module.exports = new DatabaseService();