const express = require('express');
const router = express.Router();
const minioClient = require('../services/minioClient');
const streamingReconciliation = require('../services/streamingReconciliation');

console.log('Migration routes file loaded - scheduled routes should be available');

// SSE endpoint for streaming migration updates
router.get('/stream', async (req, res) => {
  // Set headers for SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  const clientId = `sse_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`SSE client connected: ${clientId}`);

  // Send initial connection message
  res.write(`data: ${JSON.stringify({
    type: 'connection',
    clientId,
    message: 'Connected to S3 Migration Stream',
    timestamp: new Date().toISOString()
  })}\n\n`);

  // Send initial migration data
  try {
    const migrations = minioClient.getAllMigrations();
    console.log(`SSE sending initial data: ${migrations.length} migrations to client ${clientId}`);
    res.write(`data: ${JSON.stringify({
      type: 'initial_data',
      data: migrations,
      timestamp: new Date().toISOString()
    })}\n\n`);
  } catch (error) {
    console.error(`SSE failed to load initial migration data for ${clientId}:`, error);
    res.write(`data: ${JSON.stringify({
      type: 'error',
      message: 'Failed to load initial migration data',
      error: error.message,
      timestamp: new Date().toISOString()
    })}\n\n`);
  }

  // Keep connection alive with heartbeat
  const heartbeat = setInterval(() => {
    res.write(`data: ${JSON.stringify({
      type: 'heartbeat',
      timestamp: new Date().toISOString()
    })}\n\n`);
  }, 30000); // Every 30 seconds

  // Register SSE client for migration updates
  const migrationUpdateHandler = (migration) => {
    try {
      res.write(`data: ${JSON.stringify({
        type: 'migration_update',
        data: migration,
        timestamp: new Date().toISOString()
      })}\n\n`);
    } catch (error) {
      console.error(`Error sending SSE update to ${clientId}:`, error);
    }
  };

  // Add this client to SSE clients tracking
  if (!global.sseClients) {
    global.sseClients = new Map();
  }
  global.sseClients.set(clientId, {
    res,
    onMigrationUpdate: migrationUpdateHandler
  });

  // Handle client disconnect
  req.on('close', () => {
    console.log(`SSE client disconnected: ${clientId}`);
    clearInterval(heartbeat);
    if (global.sseClients) {
      global.sseClients.delete(clientId);
    }
  });

  req.on('error', (err) => {
    console.error(`SSE client error for ${clientId}:`, err);
    clearInterval(heartbeat);
    if (global.sseClients) {
      global.sseClients.delete(clientId);
    }
  });
});

// Get all migrations
router.get('/', async (req, res) => {
  try {
    const migrations = minioClient.getAllMigrations();
    console.log(`API getAllMigrations returning ${migrations.length} migrations`);
    
    // Ensure all migrations have required fields and extract bucket names
    const sanitizedMigrations = migrations.map(migration => {
      // Extract bucket names from source and destination paths
      const extractBucketName = (path) => {
        if (!path || typeof path !== 'string') return 'Unknown';
        // Handle formats like "source-aws/bucket123" or "alias/bucket123/subfolder"
        const parts = path.split('/');
        return parts.length >= 2 ? parts[1] : parts[0] || 'Unknown';
      };
      
      const sourceBucket = extractBucketName(migration.config?.source);
      const destinationBucket = extractBucketName(migration.config?.destination);
      
      return {
        id: migration.id || 'unknown',
        config: migration.config || { source: 'Unknown', destination: 'Unknown', options: {} },
        sourceBucket: sourceBucket,
        destinationBucket: destinationBucket,
        status: migration.status || 'unknown',
        progress: migration.progress || 0,
        startTime: migration.startTime || new Date().toISOString(),
        endTime: migration.endTime || null,
        stats: migration.stats || { totalObjects: 0, transferredObjects: 0, totalSize: 0, transferredSize: 0, speed: 0 },
        errors: migration.errors || [],
        reconciliation: migration.reconciliation || null,
        duration: migration.endTime ? 
          (new Date(migration.endTime).getTime() - new Date(migration.startTime).getTime()) / 1000 : 
          migration.startTime ? (new Date().getTime() - new Date(migration.startTime).getTime()) / 1000 : 0
      };
    });
    
    console.log(`API returning ${sanitizedMigrations.length} sanitized migrations`);
    res.json({ success: true, data: sanitizedMigrations });
  } catch (error) {
    console.error('Error getting migrations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start a new migration
router.post('/start', async (req, res) => {
  try {
    const { source, destination, scheduledTime, options = {} } = req.body;

    // Validate required fields
    if (!source || !destination) {
      return res.status(400).json({
        success: false,
        error: 'Source and destination are required'
      });
    }

    // Validate source and destination format (should include alias)
    if (!source.includes('/') || !destination.includes('/')) {
      return res.status(400).json({
        success: false,
        error: 'Source and destination must include alias (e.g., alias/bucket)'
      });
    }

    const migrationConfig = {
      source,
      destination,
      ...(scheduledTime && { scheduledTime }), // Include scheduledTime if present
      options: {
        overwrite: options.overwrite || false,
        remove: options.remove || false,
        exclude: options.exclude || [],
        ...options
      }
    };

    const result = await minioClient.startMigration(migrationConfig);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Migration start error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test route to verify routes are loading (must come before /:id route)
router.get('/test', (req, res) => {
  console.log('TEST route called - routes are loading properly');
  res.json({ success: true, message: 'Test route working', timestamp: new Date().toISOString() });
});

// Scheduled migration endpoints (must come before /:id route)
router.get('/scheduled', async (req, res) => {
  console.log('GET /scheduled route called');
  try {
    console.log('Loading cronScheduler...');
    const cronScheduler = require('../services/cronScheduler');
    
    console.log('Getting scheduled migrations...');
    const scheduledMigrations = cronScheduler.getScheduledMigrations();
    console.log('Getting scheduler stats...');
    const schedulerStats = cronScheduler.getStats();
    
    console.log('Scheduled migrations count:', scheduledMigrations.length);
    console.log('Scheduler stats:', schedulerStats);
    
    res.json({ 
      success: true, 
      data: {
        migrations: scheduledMigrations,
        stats: schedulerStats
      }
    });
  } catch (error) {
    console.error('Error getting scheduled migrations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/scheduled/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cronScheduler = require('../services/cronScheduler');
    
    const cancelled = cronScheduler.cancelScheduledMigration(id);
    
    if (cancelled) {
      res.json({ 
        success: true, 
        message: `Migration ${id} has been cancelled`
      });
    } else {
      res.status(404).json({ 
        success: false, 
        error: 'Scheduled migration not found or already executed' 
      });
    }
  } catch (error) {
    console.error(`Error cancelling scheduled migration ${req.params.id}:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/scheduled/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduledTime } = req.body;
    
    if (!scheduledTime) {
      return res.status(400).json({ 
        success: false, 
        error: 'scheduledTime is required' 
      });
    }
    
    const newScheduledTime = new Date(scheduledTime);
    if (newScheduledTime <= new Date()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Scheduled time must be in the future' 
      });
    }
    
    const cronScheduler = require('../services/cronScheduler');
    const rescheduled = cronScheduler.rescheduleMigration(id, scheduledTime);
    
    if (rescheduled) {
      res.json({ 
        success: true, 
        message: `Migration ${id} rescheduled for ${scheduledTime}`,
        scheduledTime 
      });
    } else {
      res.status(404).json({ 
        success: false, 
        error: 'Migration not found or could not be rescheduled' 
      });
    }
  } catch (error) {
    console.error(`Error rescheduling migration ${req.params.id}:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/scheduler/stats', async (req, res) => {
  try {
    const cronScheduler = require('../services/cronScheduler');
    const stats = cronScheduler.getStats();
    
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error getting scheduler stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get detailed scheduler system information
router.get('/scheduler/info', async (req, res) => {
  try {
    const cronScheduler = require('../services/cronScheduler');
    const systemInfo = cronScheduler.getSystemInfo();
    const activeJobs = cronScheduler.getActiveJobs();
    
    res.json({ 
      success: true, 
      data: {
        systemInfo,
        activeJobs,
        totalActiveJobs: activeJobs.length
      }
    });
  } catch (error) {
    console.error('Error getting scheduler info:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Fix stuck migrations manually
router.post('/fix-stuck', async (req, res) => {
  try {
    console.log('Manual request to fix stuck migrations');
    const database = require('../services/database');
    const fixedCount = database.fixStuckMigrations();
    
    res.json({ 
      success: true, 
      message: `Fixed ${fixedCount} stuck migration(s)`,
      fixedCount 
    });
  } catch (error) {
    console.error('Error fixing stuck migrations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get migration status
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const status = minioClient.getMigrationStatus(id);
    console.log(`Migration status for ${id}:`, JSON.stringify(status, null, 2));
    
    // Extract bucket names from source and destination paths
    const extractBucketName = (path) => {
      console.log(`Extracting bucket name from path: "${path}"`);
      if (!path || typeof path !== 'string') {
        console.log(`Invalid path: ${path}`);
        return 'Unknown';
      }
      // Handle formats like "source-aws/bucket123" or "alias/bucket123/subfolder"
      const parts = path.split('/');
      console.log(`Path parts:`, parts);
      const bucketName = parts.length >= 2 ? parts[1] : parts[0] || 'Unknown';
      console.log(`Extracted bucket name: "${bucketName}"`);
      return bucketName;
    };
    
    // Enhance the response with bucket names
    const enhancedStatus = {
      ...status,
      sourceBucket: extractBucketName(status.config?.source),
      destinationBucket: extractBucketName(status.config?.destination)
    };
    
    res.json({ success: true, data: enhancedStatus });
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
  }
});

// Get migration logs
router.get('/:id/logs', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Logs requested for migration: ${id}`);
    
    // Add timeout to prevent hanging requests
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({ 
          success: false, 
          error: 'Request timeout while generating comprehensive logs. Please try again.' 
        });
      }
    }, 30000); // 30 second timeout

    const logs = await minioClient.getMigrationLogs(id);
    
    clearTimeout(timeout);
    
    if (!res.headersSent) {
      res.json({ success: true, data: { logs } });
    }
  } catch (error) {
    console.error(`Error getting logs for ${req.params.id}:`, error.message);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});

// Cancel migration
router.post('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await minioClient.cancelMigration(id);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
  }
});

// Validate migration configuration
router.post('/validate', async (req, res) => {
  try {
    const { source, destination } = req.body;

    if (!source || !destination) {
      return res.status(400).json({
        success: false,
        error: 'Source and destination are required'
      });
    }

    // Extract alias names
    const sourceAlias = source.split('/')[0];
    const destAlias = destination.split('/')[0];

    // Try to list buckets to validate aliases
    const validationResults = {
      sourceValid: false,
      destinationValid: false,
      errors: []
    };

    try {
      await minioClient.listBuckets(sourceAlias);
      validationResults.sourceValid = true;
    } catch (error) {
      validationResults.errors.push(`Source alias invalid: ${error.message}`);
    }

    try {
      await minioClient.listBuckets(destAlias);
      validationResults.destinationValid = true;
    } catch (error) {
      validationResults.errors.push(`Destination alias invalid: ${error.message}`);
    }

    validationResults.valid = validationResults.sourceValid && validationResults.destinationValid;

    res.json({ success: true, data: validationResults });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Force refresh migrations from disk
router.post('/refresh', async (req, res) => {
  try {
    await minioClient.loadMigrations();
    const migrations = minioClient.getAllMigrations();
    res.json({ 
      success: true, 
      data: { 
        count: migrations.length,
        message: `Refreshed ${migrations.length} migrations from storage` 
      } 
    });
  } catch (error) {
    console.error('Error refreshing migrations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get system status and migration statistics
router.get('/status', async (req, res) => {
  try {
    const stats = minioClient.getMigrationStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error getting migration status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update reconciliation sizes for existing migration
router.post('/:id/update-reconciliation-sizes', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`API request to update reconciliation sizes for migration: ${id}`);
    
    const updatedMigration = await minioClient.updateReconciliationSizes(id);
    
    if (updatedMigration) {
      res.json({ 
        success: true, 
        message: 'Reconciliation sizes updated successfully',
        data: updatedMigration 
      });
    } else {
      res.status(404).json({ 
        success: false, 
        error: 'Migration not found or no reconciliation data available' 
      });
    }
  } catch (error) {
    console.error(`Error updating reconciliation sizes for ${req.params.id}:`, error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get reconciliation progress for large migrations
router.get('/reconciliation/:id/progress', async (req, res) => {
  try {
    const { id } = req.params;
    const progress = streamingReconciliation.getReconciliationProgress(id);
    
    if (!progress) {
      return res.status(404).json({ 
        error: 'Reconciliation not found or not using streaming reconciliation' 
      });
    }

    res.json({
      success: true,
      data: progress
    });
  } catch (error) {
    console.error('Error getting reconciliation progress:', error);
    res.status(500).json({ 
      error: 'Failed to get reconciliation progress',
      details: error.message 
    });
  }
});

// Download reconciliation report
router.get('/reconciliation/:id/report', async (req, res) => {
  try {
    const { id } = req.params;
    const migration = minioClient.getMigrationStatus(id);
    
    if (!migration || !migration.reconciliation?.reportPath) {
      return res.status(404).json({ 
        error: 'Reconciliation report not found' 
      });
    }

    const reportPath = migration.reconciliation.reportPath;
    const reportName = `reconciliation_report_${id}.json`;
    
    res.download(reportPath, reportName, (err) => {
      if (err) {
        console.error('Error downloading report:', err);
        res.status(500).json({ 
          error: 'Failed to download report',
          details: err.message 
        });
      }
    });
  } catch (error) {
    console.error('Error accessing reconciliation report:', error);
    res.status(500).json({ 
      error: 'Failed to access reconciliation report',
      details: error.message 
    });
  }
});

// Get reconciliation statistics summary
router.get('/reconciliation/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    const migration = minioClient.getMigrationStatus(id);
    
    if (!migration || !migration.reconciliation) {
      return res.status(404).json({ 
        error: 'Migration or reconciliation not found' 
      });
    }

    const reconciliation = migration.reconciliation;
    const isStreaming = !!reconciliation.progress;

    const stats = {
      migrationId: id,
      reconciliationType: isStreaming ? 'large-scale-streaming' : 'traditional',
      status: reconciliation.status,
      startTime: reconciliation.startTime,
      endTime: reconciliation.endTime,
      duration: reconciliation.endTime ? 
        calculateDuration(reconciliation.startTime, reconciliation.endTime) : null,
      
      // Progress information (streaming only)
      progress: isStreaming ? {
        currentPhase: reconciliation.progress.currentPhase,
        sourceObjectsProcessed: reconciliation.progress.sourceObjectsProcessed,
        destinationObjectsProcessed: reconciliation.progress.destinationObjectsProcessed,
        totalSourceObjects: reconciliation.progress.totalSourceObjects,
        totalDestinationObjects: reconciliation.progress.totalDestinationObjects,
        chunksCompleted: reconciliation.progress.chunksCompleted
      } : null,

      // Results summary
      results: reconciliation.stats ? {
        perfectMatches: reconciliation.stats.perfectMatches,
        missingInDestination: reconciliation.stats.missingInDestination,
        missingInSource: reconciliation.stats.missingInSource,
        sizeMismatches: reconciliation.stats.sizeMismatches,
        contentMismatches: reconciliation.stats.contentMismatches,
        totalDifferences: (reconciliation.stats.missingInDestination || 0) + 
                         (reconciliation.stats.missingInSource || 0) + 
                         (reconciliation.stats.sizeMismatches || 0) + 
                         (reconciliation.stats.contentMismatches || 0)
      } : null,

      // Legacy compatibility
      differences: reconciliation.differences?.length || 0,
      hasReport: !!reconciliation.reportPath
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting reconciliation stats:', error);
    res.status(500).json({ 
      error: 'Failed to get reconciliation stats',
      details: error.message 
    });
  }
});

// Cleanup reconciliation resources (for completed migrations)
router.delete('/reconciliation/:id/cleanup', async (req, res) => {
  try {
    const { id } = req.params;
    await streamingReconciliation.cleanupReconciliation(id);
    
    res.json({
      success: true,
      message: `Reconciliation resources cleaned up for migration ${id}`
    });
  } catch (error) {
    console.error('Error cleaning up reconciliation:', error);
    res.status(500).json({ 
      error: 'Failed to cleanup reconciliation resources',
      details: error.message 
    });
  }
});

// Get all active reconciliations
router.get('/reconciliations/active', async (req, res) => {
  try {
    const activeReconciliations = [];
    
    // Get all active migrations and check for reconciliation status
    const migrations = minioClient.getAllMigrations();
    
    for (const migration of migrations) {
      if (migration.status === 'reconciling' || 
          (migration.reconciliation && 
           ['running', 'initializing', 'collecting_inventory', 'comparing'].includes(migration.reconciliation.status))) {
        
        const progress = streamingReconciliation.getReconciliationProgress(migration.id);
        activeReconciliations.push({
          migrationId: migration.id,
          status: migration.reconciliation.status,
          startTime: migration.reconciliation.startTime,
          reconciliationType: progress ? 'large-scale-streaming' : 'traditional',
          progress: progress || null
        });
      }
    }

    res.json({
      success: true,
      data: {
        activeCount: activeReconciliations.length,
        reconciliations: activeReconciliations
      }
    });
  } catch (error) {
    console.error('Error getting active reconciliations:', error);
    res.status(500).json({ 
      error: 'Failed to get active reconciliations',
      details: error.message 
    });
  }
});

function calculateDuration(startTime, endTime) {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffMs = end - start;
  
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
  
  return `${hours}h ${minutes}m ${seconds}s`;
}

module.exports = router;