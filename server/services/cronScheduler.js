const cron = require('node-cron');
const database = require('./database');

class CronScheduler {
  constructor() {
    this.scheduledJobs = new Map(); // Map<migrationId, cronJob>
    this.isRunning = false;
    this.checkInterval = null;
  }

  start() {
    if (this.isRunning) {
      console.log('Cron scheduler is already running');
      return;
    }

    console.log('🚀 Starting Cron Migration Scheduler');
    this.isRunning = true;
    
    // Load existing scheduled migrations from database
    this.loadScheduledMigrations();
    
    // Set up periodic check every minute for pending migrations
    this.checkInterval = cron.schedule('* * * * *', () => {
      this.checkPendingMigrations();
    }, {
      scheduled: false
    });
    
    this.checkInterval.start();
    console.log('✅ Cron scheduler started with periodic checks every minute');
  }

  stop() {
    if (!this.isRunning) {
      return;
    }

    console.log('🛑 Stopping Cron Migration Scheduler');
    this.isRunning = false;
    
    // Stop periodic check
    if (this.checkInterval) {
      this.checkInterval.stop();
      this.checkInterval = null;
    }
    
    // Cancel all scheduled jobs
    this.scheduledJobs.forEach((job, migrationId) => {
      console.log(`Cancelling cron job for migration: ${migrationId}`);
      job.destroy();
    });
    
    this.scheduledJobs.clear();
    console.log('✅ Cron scheduler stopped');
  }

  loadScheduledMigrations() {
    try {
      const scheduledMigrations = database.getScheduledMigrations();
      console.log(`📋 Loading ${scheduledMigrations.length} scheduled migrations`);
      
      scheduledMigrations.forEach(migration => {
        this.scheduleExecution(migration);
      });
    } catch (error) {
      console.error('❌ Error loading scheduled migrations:', error);
    }
  }

  scheduleExecution(migration) {
    if (!migration.scheduledTime) {
      console.warn(`⚠️  Migration ${migration.id} has no scheduled time`);
      return;
    }

    const scheduledTime = new Date(migration.scheduledTime);
    const now = new Date();
    const delayMs = scheduledTime.getTime() - now.getTime();

    // If migration is due for immediate execution
    if (delayMs <= 60000) { // Within 1 minute
      console.log(`⚡ Migration ${migration.id} is ready for immediate execution`);
      setImmediate(() => {
        this.executeMigration(migration.id);
      });
      return;
    }

    // Create cron expression from scheduled time
    const cronExpression = this.createCronExpression(scheduledTime);
    
    if (!cronExpression) {
      console.error(`❌ Could not create cron expression for migration ${migration.id}`);
      return;
    }

    console.log(`⏰ Scheduling migration ${migration.id} with cron: ${cronExpression}`);
    console.log(`🎯 Execution time: ${scheduledTime.toISOString()}`);

    try {
      // Create cron job
      const cronJob = cron.schedule(cronExpression, () => {
        console.log(`🚀 Executing scheduled migration: ${migration.id}`);
        this.executeMigration(migration.id);
        
        // Remove from scheduled jobs after execution
        this.scheduledJobs.delete(migration.id);
      }, {
        scheduled: true,
        timezone: 'UTC' // Use UTC for consistency
      });

      // Store the job
      this.scheduledJobs.set(migration.id, cronJob);
      
      console.log(`✅ Migration ${migration.id} scheduled successfully`);
    } catch (error) {
      console.error(`❌ Error scheduling migration ${migration.id}:`, error);
    }
  }

  createCronExpression(scheduledTime) {
    try {
      const minute = scheduledTime.getUTCMinutes();
      const hour = scheduledTime.getUTCHours();
      const day = scheduledTime.getUTCDate();
      const month = scheduledTime.getUTCMonth() + 1; // getUTCMonth() returns 0-11
      
      // Create cron expression: minute hour day month *
      const cronExpression = `${minute} ${hour} ${day} ${month} *`;
      
      // Validate cron expression
      if (cron.validate(cronExpression)) {
        return cronExpression;
      } else {
        console.error(`❌ Invalid cron expression: ${cronExpression}`);
        return null;
      }
    } catch (error) {
      console.error('❌ Error creating cron expression:', error);
      return null;
    }
  }

  async executeMigration(migrationId) {
    console.log(`🚀 Executing scheduled migration: ${migrationId}`);
    
    try {
      // Update status to indicate execution has started
      database.updateMigrationExecutionStatus(migrationId, 'running');
      
      // Get the migration data
      const migration = database.getMigration(migrationId);
      if (!migration) {
        throw new Error('Migration not found');
      }

      // Get the MinIO client service and start migration
      const minioClient = require('./minioClient');
      
      // Call the scheduled migration execution method
      await minioClient.startScheduledMigration(migration);
      
      console.log(`✅ Successfully started execution of scheduled migration: ${migrationId}`);
    } catch (error) {
      console.error(`❌ Failed to execute migration ${migrationId}:`, error);
      database.updateMigrationExecutionStatus(migrationId, 'failed');
    }
  }

  async checkPendingMigrations() {
    try {
      // Get migrations that are scheduled but their time has passed
      const pendingMigrations = database.getPendingScheduledMigrations();
      
      if (pendingMigrations.length > 0) {
        console.log(`📋 Found ${pendingMigrations.length} pending scheduled migrations`);
        
        for (const migration of pendingMigrations) {
          if (!this.scheduledJobs.has(migration.id)) {
            console.log(`⚡ Executing overdue migration: ${migration.id}`);
            await this.executeMigration(migration.id);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error checking pending migrations:', error);
    }
  }

  // Public API methods

  scheduleMigration(migrationId, scheduledTime) {
    console.log(`📅 Scheduling migration ${migrationId} for ${scheduledTime}`);
    
    try {
      // Update database with scheduled status
      database.updateMigrationExecutionStatus(migrationId, 'scheduled');
      
      // Get the updated migration
      const migration = database.getMigration(migrationId);
      if (migration) {
        this.scheduleExecution(migration);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`❌ Error scheduling migration ${migrationId}:`, error);
      return false;
    }
  }

  cancelScheduledMigration(migrationId) {
    console.log(`❌ Cancelling scheduled migration ${migrationId}`);
    
    try {
      // Cancel cron job if exists
      const cronJob = this.scheduledJobs.get(migrationId);
      if (cronJob) {
        cronJob.destroy();
        this.scheduledJobs.delete(migrationId);
        console.log(`✅ Cron job cancelled for migration ${migrationId}`);
      }
      
      // Update database status
      database.updateMigrationExecutionStatus(migrationId, 'cancelled');
      return true;
    } catch (error) {
      console.error(`❌ Error cancelling migration ${migrationId}:`, error);
      return false;
    }
  }

  rescheduleMigration(migrationId, newScheduledTime) {
    console.log(`🔄 Rescheduling migration ${migrationId} to ${newScheduledTime}`);
    
    try {
      // Cancel existing cron job
      this.cancelScheduledMigration(migrationId);
      
      // Update the scheduled time in database
      const migration = database.getMigration(migrationId);
      if (!migration) {
        throw new Error('Migration not found');
      }

      migration.scheduledTime = newScheduledTime;
      database.updateMigration(migrationId, migration);
      
      // Schedule with new time
      return this.scheduleMigration(migrationId, newScheduledTime);
    } catch (error) {
      console.error(`❌ Error rescheduling migration ${migrationId}:`, error);
      return false;
    }
  }

  getStats() {
    try {
      const dbStats = database.getScheduledMigrationStats();
      
      return {
        totalScheduled: dbStats.total_scheduled || 0,
        futureScheduled: dbStats.future_scheduled || 0,
        pendingExecution: dbStats.pending_execution || 0,
        activeJobs: this.scheduledJobs.size,
        isRunning: this.isRunning,
        scheduler: 'node-cron',
        version: require('../../package.json').version
      };
    } catch (error) {
      console.error('❌ Error getting scheduler stats:', error);
      return {
        totalScheduled: 0,
        futureScheduled: 0,
        pendingExecution: 0,
        activeJobs: 0,
        isRunning: this.isRunning,
        scheduler: 'node-cron',
        version: 'unknown'
      };
    }
  }

  getScheduledMigrations() {
    try {
      const migrations = database.getScheduledMigrations();
      
      // Add cron job status to each migration
      return migrations.map(migration => ({
        ...migration,
        hasCronJob: this.scheduledJobs.has(migration.id),
        cronJobActive: this.scheduledJobs.has(migration.id) && this.scheduledJobs.get(migration.id).getStatus() === 'scheduled'
      }));
    } catch (error) {
      console.error('❌ Error getting scheduled migrations:', error);
      return [];
    }
  }

  // Diagnostic methods

  getActiveJobs() {
    const jobs = [];
    this.scheduledJobs.forEach((job, migrationId) => {
      jobs.push({
        migrationId,
        status: job.getStatus(),
        running: job.running
      });
    });
    return jobs;
  }

  getSystemInfo() {
    return {
      scheduler: 'node-cron',
      isRunning: this.isRunning,
      activeJobs: this.scheduledJobs.size,
      nodeVersion: process.version,
      uptime: process.uptime(),
      cronVersion: require('node-cron/package.json').version
    };
  }
}

module.exports = new CronScheduler();