const database = require('./database');

class MigrationScheduler {
  constructor() {
    this.scheduledJobs = new Map();
    this.checkInterval = 60000; // Check every minute for pending migrations
    this.initializeScheduler();
  }

  initializeScheduler() {
    console.log('Initializing migration scheduler');
    
    // Load existing scheduled migrations from database
    this.loadScheduledMigrations();
    
    // Start periodic check for pending migrations
    this.startPeriodicCheck();
  }

  loadScheduledMigrations() {
    try {
      const scheduledMigrations = database.getScheduledMigrations();
      console.log(`Loading ${scheduledMigrations.length} scheduled migrations`);
      
      scheduledMigrations.forEach(migration => {
        this.scheduleExecution(migration);
      });
    } catch (error) {
      console.error('Error loading scheduled migrations:', error);
    }
  }

  scheduleExecution(migration) {
    if (!migration.scheduledTime) {
      console.warn(`Migration ${migration.id} has no scheduled time`);
      return;
    }

    const scheduledTime = new Date(migration.scheduledTime);
    const now = new Date();
    const delay = scheduledTime.getTime() - now.getTime();

    if (delay <= 0) {
      // Migration is ready to execute
      console.log(`Migration ${migration.id} is ready for immediate execution`);
      this.executeMigration(migration.id);
      return;
    }

    // Schedule for future execution
    console.log(`Scheduling migration ${migration.id} for execution in ${Math.round(delay / 1000)} seconds`);
    
    const timeoutId = setTimeout(() => {
      this.executeMigration(migration.id);
      this.scheduledJobs.delete(migration.id);
    }, delay);

    this.scheduledJobs.set(migration.id, {
      timeoutId,
      scheduledTime: migration.scheduledTime,
      migration
    });
  }

  scheduleOneTime(migrationId, scheduledTime) {
    console.log(`Scheduling migration ${migrationId} for ${scheduledTime}`);
    
    try {
      // Update database with scheduled time and status
      database.updateMigrationExecutionStatus(migrationId, 'scheduled');
      
      // Get the updated migration
      const migration = database.getMigration(migrationId);
      if (migration) {
        this.scheduleExecution(migration);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`Error scheduling migration ${migrationId}:`, error);
      return false;
    }
  }

  cancelScheduled(migrationId) {
    console.log(`Cancelling scheduled migration ${migrationId}`);
    
    const job = this.scheduledJobs.get(migrationId);
    if (job) {
      clearTimeout(job.timeoutId);
      this.scheduledJobs.delete(migrationId);
      
      // Update database status
      database.updateMigrationExecutionStatus(migrationId, 'cancelled');
      return true;
    }
    
    return false;
  }

  reschedule(migrationId, newScheduledTime) {
    console.log(`Rescheduling migration ${migrationId} to ${newScheduledTime}`);
    
    // Cancel existing schedule
    this.cancelScheduled(migrationId);
    
    // Create new schedule
    return this.scheduleOneTime(migrationId, newScheduledTime);
  }

  executeMigration(migrationId) {
    console.log(`Executing scheduled migration ${migrationId}`);
    
    try {
      // Update status to pending execution
      database.updateMigrationExecutionStatus(migrationId, 'pending');
      
      // Get the MinIO client service and start migration
      const minioClient = require('./minioClient');
      
      const migration = database.getMigration(migrationId);
      if (!migration) {
        console.error(`Migration ${migrationId} not found for execution`);
        return;
      }

      // Start the actual migration
      minioClient.startScheduledMigration(migration);
      
    } catch (error) {
      console.error(`Error executing scheduled migration ${migrationId}:`, error);
      database.updateMigrationExecutionStatus(migrationId, 'failed');
    }
  }

  startPeriodicCheck() {
    // Check for pending migrations every minute
    setInterval(() => {
      this.checkPendingMigrations();
    }, this.checkInterval);
  }

  checkPendingMigrations() {
    try {
      const pendingMigrations = database.getPendingScheduledMigrations();
      
      if (pendingMigrations.length > 0) {
        console.log(`Found ${pendingMigrations.length} pending scheduled migrations`);
        
        pendingMigrations.forEach(migration => {
          if (!this.scheduledJobs.has(migration.id)) {
            this.executeMigration(migration.id);
          }
        });
      }
    } catch (error) {
      console.error('Error checking pending migrations:', error);
    }
  }

  getScheduledMigrations() {
    return Array.from(this.scheduledJobs.values()).map(job => ({
      id: job.migration.id,
      scheduledTime: job.scheduledTime,
      timeRemaining: new Date(job.scheduledTime).getTime() - Date.now(),
      migration: job.migration
    }));
  }

  getStats() {
    const dbStats = database.getScheduledMigrationStats();
    const activeJobs = this.scheduledJobs.size;
    
    return {
      totalScheduled: dbStats.total_scheduled || 0,
      futureScheduled: dbStats.future_scheduled || 0,
      pendingExecution: dbStats.pending_execution || 0,
      activeJobs
    };
  }

  shutdown() {
    console.log('Shutting down migration scheduler');
    
    // Cancel all scheduled jobs
    this.scheduledJobs.forEach((job, migrationId) => {
      clearTimeout(job.timeoutId);
      console.log(`Cancelled scheduled migration ${migrationId}`);
    });
    
    this.scheduledJobs.clear();
  }
}

module.exports = new MigrationScheduler();