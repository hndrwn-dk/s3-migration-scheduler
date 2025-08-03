const database = require('./database');

class PersistentScheduler {
  constructor() {
    this.isRunning = false;
    this.checkInterval = 30000; // Check every 30 seconds
    this.intervalId = null;
  }

  start() {
    if (this.isRunning) {
      console.log('Persistent scheduler is already running');
      return;
    }

    console.log('Starting persistent migration scheduler');
    this.isRunning = true;
    
    // Run initial check
    this.checkPendingMigrations();
    
    // Set up periodic checking
    this.intervalId = setInterval(() => {
      this.checkPendingMigrations();
    }, this.checkInterval);
  }

  stop() {
    if (!this.isRunning) {
      return;
    }

    console.log('Stopping persistent migration scheduler');
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async checkPendingMigrations() {
    try {
      // Get migrations that are scheduled but their time has passed
      const pendingMigrations = database.getPendingScheduledMigrations();
      
      if (pendingMigrations.length > 0) {
        console.log(`Found ${pendingMigrations.length} pending scheduled migrations`);
        
        for (const migration of pendingMigrations) {
          try {
            await this.executePendingMigration(migration);
          } catch (error) {
            console.error(`Failed to execute pending migration ${migration.id}:`, error);
            // Update migration status to failed
            database.updateMigrationExecutionStatus(migration.id, 'failed');
          }
        }
      }
    } catch (error) {
      console.error('Error checking pending migrations:', error);
    }
  }

  async executePendingMigration(migration) {
    console.log(`Executing pending migration: ${migration.id}`);
    
    try {
      // Update status to indicate execution has started
      database.updateMigrationExecutionStatus(migration.id, 'running');
      
      // Get the MinIO client service and start migration
      const minioClient = require('./minioClient');
      
      // Call the scheduled migration execution method
      await minioClient.startScheduledMigration(migration);
      
      console.log(`Successfully started execution of scheduled migration: ${migration.id}`);
    } catch (error) {
      console.error(`Failed to execute migration ${migration.id}:`, error);
      throw error;
    }
  }

  // Schedule a new migration
  scheduleMigration(migrationId, scheduledTime) {
    console.log(`Scheduling migration ${migrationId} for ${scheduledTime}`);
    
    try {
      // Update database with scheduled status
      database.updateMigrationExecutionStatus(migrationId, 'scheduled');
      
      const scheduledDate = new Date(scheduledTime);
      const now = new Date();
      const delayMs = scheduledDate.getTime() - now.getTime();
      
      if (delayMs <= 0) {
        console.log(`Migration ${migrationId} is scheduled for immediate execution`);
        // Execute immediately if time has already passed
        setImmediate(() => {
          this.executePendingMigration(database.getMigration(migrationId));
        });
      } else {
        console.log(`Migration ${migrationId} scheduled for execution in ${Math.round(delayMs / 1000)} seconds`);
      }
      
      return true;
    } catch (error) {
      console.error(`Error scheduling migration ${migrationId}:`, error);
      return false;
    }
  }

  // Cancel a scheduled migration
  cancelScheduledMigration(migrationId) {
    console.log(`Cancelling scheduled migration ${migrationId}`);
    
    try {
      database.updateMigrationExecutionStatus(migrationId, 'cancelled');
      return true;
    } catch (error) {
      console.error(`Error cancelling migration ${migrationId}:`, error);
      return false;
    }
  }

  // Reschedule a migration
  rescheduleMigration(migrationId, newScheduledTime) {
    console.log(`Rescheduling migration ${migrationId} to ${newScheduledTime}`);
    
    try {
      // Update the scheduled time in database
      const migration = database.getMigration(migrationId);
      if (!migration) {
        throw new Error('Migration not found');
      }

      migration.scheduledTime = newScheduledTime;
      database.updateMigration(migrationId, migration);
      
      // Update status back to scheduled
      database.updateMigrationExecutionStatus(migrationId, 'scheduled');
      
      return true;
    } catch (error) {
      console.error(`Error rescheduling migration ${migrationId}:`, error);
      return false;
    }
  }

  // Get statistics
  getStats() {
    try {
      const dbStats = database.getScheduledMigrationStats();
      
      return {
        totalScheduled: dbStats.total_scheduled || 0,
        futureScheduled: dbStats.future_scheduled || 0,
        pendingExecution: dbStats.pending_execution || 0,
        activeJobs: 0, // No in-memory jobs with this approach
        isRunning: this.isRunning,
        checkInterval: this.checkInterval
      };
    } catch (error) {
      console.error('Error getting scheduler stats:', error);
      return {
        totalScheduled: 0,
        futureScheduled: 0,
        pendingExecution: 0,
        activeJobs: 0,
        isRunning: this.isRunning,
        checkInterval: this.checkInterval
      };
    }
  }

  // Get scheduled migrations
  getScheduledMigrations() {
    try {
      return database.getScheduledMigrations();
    } catch (error) {
      console.error('Error getting scheduled migrations:', error);
      return [];
    }
  }
}

module.exports = new PersistentScheduler();