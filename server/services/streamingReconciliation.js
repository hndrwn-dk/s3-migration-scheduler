const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');
const database = require('./database');

class StreamingReconciliation extends EventEmitter {
  constructor() {
    super();
    this.activeReconciliations = new Map();
    this.mcPath = process.env.MC_PATH || 'mc';
  }

  quoteMcPath() {
    if (this.mcPath.includes(' ')) {
      return `"${this.mcPath}"`;
    }
    return this.mcPath;
  }

  /**
   * Start large-scale reconciliation for millions of objects
   * @param {Object} migration - Migration object with source/destination
   * @param {Object} options - Reconciliation options
   */
  async startLargeScaleReconciliation(migration, options = {}) {
    const {
      chunkSize = 10000,
      maxConcurrentChunks = 4,
      enableCheckpoints = true,
      skipContentVerification = false
    } = options;

    console.log(`🔄 Starting large-scale reconciliation for migration ${migration.id}`);
    console.log(`📊 Configuration: chunkSize=${chunkSize}, maxConcurrent=${maxConcurrentChunks}`);

    try {
      // Initialize reconciliation state
      migration.reconciliation = {
        status: 'initializing',
        startTime: new Date().toISOString(),
        progress: {
          sourceObjectsProcessed: 0,
          destinationObjectsProcessed: 0,
          totalSourceObjects: 0,
          totalDestinationObjects: 0,
          chunksCompleted: 0,
          currentPhase: 'inventory_collection'
        },
        config: {
          chunkSize,
          maxConcurrentChunks,
          enableCheckpoints,
          skipContentVerification
        },
        differences: [],
        stats: {
          missingInDestination: 0,
          missingInSource: 0,
          sizeMismatches: 0,
          contentMismatches: 0,
          perfectMatches: 0
        }
      };

      this.activeReconciliations.set(migration.id, migration);
      
      // Create reconciliation database
      await this.initializeReconciliationDatabase(migration.id);
      
      // Phase 1: Streaming inventory collection
      await this.collectStreamingInventory(migration);
      
      // Phase 2: Chunked comparison
      await this.performChunkedComparison(migration);
      
      // Phase 3: Generate final report
      await this.generateReconciliationReport(migration);
      
      migration.reconciliation.status = 'completed';
      migration.reconciliation.endTime = new Date().toISOString();
      
      console.log(`✅ Large-scale reconciliation completed for migration ${migration.id}`);
      
    } catch (error) {
      console.error(`❌ Large-scale reconciliation failed for migration ${migration.id}:`, error);
      migration.reconciliation.status = 'failed';
      migration.reconciliation.error = error.message;
      migration.reconciliation.endTime = new Date().toISOString();
    }

    // Emit completion event
    this.emit('reconciliation:complete', migration);
    
    return migration.reconciliation;
  }

  /**
   * Initialize SQLite database for efficient object tracking
   */
  async initializeReconciliationDatabase(migrationId) {
    const dbPath = path.join(process.cwd(), 'data', `reconciliation_${migrationId}.db`);
    
    // Create reconciliation-specific database
    database.run(`
      CREATE TABLE IF NOT EXISTS object_inventory_${migrationId} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bucket_type TEXT NOT NULL,
        object_key TEXT NOT NULL,
        size INTEGER NOT NULL,
        etag TEXT,
        last_modified TEXT,
        chunk_id INTEGER,
        processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT DEFAULT '{}',
        UNIQUE(bucket_type, object_key)
      )
    `);

    database.run(`
      CREATE INDEX IF NOT EXISTS idx_object_key_${migrationId} 
      ON object_inventory_${migrationId}(object_key, bucket_type)
    `);

    database.run(`
      CREATE INDEX IF NOT EXISTS idx_chunk_${migrationId} 
      ON object_inventory_${migrationId}(chunk_id)
    `);

    database.run(`
      CREATE TABLE IF NOT EXISTS reconciliation_checkpoints_${migrationId} (
        checkpoint_type TEXT PRIMARY KEY,
        last_processed_chunk INTEGER,
        total_chunks INTEGER,
        data TEXT DEFAULT '{}',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log(`📊 Initialized reconciliation database for migration ${migrationId}`);
  }

  /**
   * Collect inventory using streaming approach to handle millions of objects
   */
  async collectStreamingInventory(migration) {
    console.log(`📥 Starting streaming inventory collection for migration ${migration.id}`);
    
    migration.reconciliation.progress.currentPhase = 'inventory_collection';
    migration.reconciliation.status = 'collecting_inventory';

    const promises = [
      this.streamBucketInventory(migration, 'source', migration.config.source),
      this.streamBucketInventory(migration, 'destination', migration.config.destination)
    ];

    await Promise.all(promises);
    
    console.log(`✅ Inventory collection completed for migration ${migration.id}`);
  }

  /**
   * Stream bucket inventory efficiently without loading everything into memory
   */
  async streamBucketInventory(migration, bucketType, bucketPath) {
    return new Promise((resolve, reject) => {
      console.log(`🔄 Starting ${bucketType} inventory stream: ${bucketPath}`);
      
      const command = `${this.quoteMcPath()} ls ${bucketPath} --recursive --json`;
      const process = spawn('sh', ['-c', command], {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let buffer = '';
      let chunkId = 0;
      let currentChunk = [];
      let totalProcessed = 0;
      const chunkSize = migration.reconciliation.config.chunkSize;

      process.stdout.on('data', (data) => {
        buffer += data.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line

        for (const line of lines) {
          if (line.trim()) {
            try {
              const objectInfo = JSON.parse(line);
              
              // Only process actual files, not directories
              if (objectInfo.type === 'file' || objectInfo.size > 0) {
                currentChunk.push({
                  bucket_type: bucketType,
                  object_key: objectInfo.key,
                  size: objectInfo.size || 0,
                  etag: objectInfo.etag || '',
                  last_modified: objectInfo.lastModified || new Date().toISOString(),
                  chunk_id: chunkId,
                  metadata: JSON.stringify({
                    type: objectInfo.type,
                    url: objectInfo.url || ''
                  })
                });

                if (currentChunk.length >= chunkSize) {
                  this.processBucketChunk(migration.id, currentChunk);
                  totalProcessed += currentChunk.length;
                  
                  // Update progress
                  if (bucketType === 'source') {
                    migration.reconciliation.progress.sourceObjectsProcessed = totalProcessed;
                  } else {
                    migration.reconciliation.progress.destinationObjectsProcessed = totalProcessed;
                  }

                  this.emit('reconciliation:progress', {
                    migrationId: migration.id,
                    phase: 'inventory_collection',
                    bucketType,
                    processed: totalProcessed,
                    chunkId
                  });

                  currentChunk = [];
                  chunkId++;
                }
              }
            } catch (parseError) {
              console.warn(`⚠️ Skipping invalid JSON line in ${bucketType} inventory:`, line);
            }
          }
        }
      });

      process.stderr.on('data', (data) => {
        const error = data.toString();
        console.warn(`⚠️ ${bucketType} inventory warning:`, error);
      });

      process.on('close', (code) => {
        // Process remaining objects in buffer
        if (currentChunk.length > 0) {
          this.processBucketChunk(migration.id, currentChunk);
          totalProcessed += currentChunk.length;
          
          if (bucketType === 'source') {
            migration.reconciliation.progress.sourceObjectsProcessed = totalProcessed;
            migration.reconciliation.progress.totalSourceObjects = totalProcessed;
          } else {
            migration.reconciliation.progress.destinationObjectsProcessed = totalProcessed;
            migration.reconciliation.progress.totalDestinationObjects = totalProcessed;
          }
        }

        console.log(`✅ ${bucketType} inventory completed: ${totalProcessed} objects in ${chunkId + 1} chunks`);
        
        if (code === 0) {
          resolve({ totalObjects: totalProcessed, totalChunks: chunkId + 1 });
        } else {
          reject(new Error(`${bucketType} inventory failed with code ${code}`));
        }
      });

      process.on('error', (error) => {
        console.error(`❌ ${bucketType} inventory process error:`, error);
        reject(error);
      });
    });
  }

  /**
   * Process a chunk of bucket objects into the database
   */
  processBucketChunk(migrationId, chunk) {
    if (chunk.length === 0) return;

    const placeholders = chunk.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
    const values = chunk.flatMap(obj => [
      obj.bucket_type,
      obj.object_key,
      obj.size,
      obj.etag,
      obj.last_modified,
      obj.chunk_id,
      new Date().toISOString(),
      obj.metadata
    ]);

    const query = `
      INSERT OR REPLACE INTO object_inventory_${migrationId} 
      (bucket_type, object_key, size, etag, last_modified, chunk_id, processed_at, metadata)
      VALUES ${placeholders}
    `;

    try {
      database.run(query, values);
    } catch (error) {
      console.error(`❌ Failed to insert chunk into database:`, error);
    }
  }

  /**
   * Perform chunked comparison using database queries instead of in-memory operations
   */
  async performChunkedComparison(migration) {
    console.log(`🔍 Starting chunked comparison for migration ${migration.id}`);
    
    migration.reconciliation.progress.currentPhase = 'comparison';
    migration.reconciliation.status = 'comparing';

    // Get total number of unique object keys for progress tracking
    const totalUniqueObjects = database.get(`
      SELECT COUNT(DISTINCT object_key) as total
      FROM object_inventory_${migration.id}
    `).total;

    console.log(`📊 Total unique objects to compare: ${totalUniqueObjects}`);

    const batchSize = 5000; // Process 5000 unique keys at a time
    let offset = 0;
    let processedObjects = 0;

    while (true) {
      const differences = await this.compareObjectBatch(migration.id, offset, batchSize);
      
      if (differences.length === 0) {
        break; // No more objects to process
      }

      // Update reconciliation stats
      differences.forEach(diff => {
        switch (diff.status) {
          case 'missing_in_destination':
            migration.reconciliation.stats.missingInDestination++;
            migration.reconciliation.differences.push({
              type: 'missing',
              location: 'destination',
              path: diff.object_key,
              sourceSize: diff.source_size,
              sourceEtag: diff.source_etag
            });
            break;
          case 'missing_in_source':
            migration.reconciliation.stats.missingInSource++;
            migration.reconciliation.differences.push({
              type: 'extra',
              location: 'destination',
              path: diff.object_key,
              destSize: diff.dest_size,
              destEtag: diff.dest_etag
            });
            break;
          case 'size_mismatch':
            migration.reconciliation.stats.sizeMismatches++;
            migration.reconciliation.differences.push({
              type: 'size_mismatch',
              path: diff.object_key,
              sourceSize: diff.source_size,
              destSize: diff.dest_size,
              sourceEtag: diff.source_etag,
              destEtag: diff.dest_etag
            });
            break;
          case 'content_mismatch':
            migration.reconciliation.stats.contentMismatches++;
            migration.reconciliation.differences.push({
              type: 'content_mismatch',
              path: diff.object_key,
              sourceSize: diff.source_size,
              destSize: diff.dest_size,
              sourceEtag: diff.source_etag,
              destEtag: diff.dest_etag
            });
            break;
          case 'match':
            migration.reconciliation.stats.perfectMatches++;
            break;
        }
      });

      processedObjects += differences.length;
      migration.reconciliation.progress.chunksCompleted++;

      // Emit progress update
      this.emit('reconciliation:progress', {
        migrationId: migration.id,
        phase: 'comparison',
        processed: processedObjects,
        total: totalUniqueObjects,
        percentage: Math.round((processedObjects / totalUniqueObjects) * 100)
      });

      offset += batchSize;
    }

    console.log(`✅ Comparison completed for migration ${migration.id}: ${processedObjects} objects processed`);
  }

  /**
   * Compare a batch of objects using efficient SQL queries
   */
  async compareObjectBatch(migrationId, offset, batchSize) {
    const query = `
      SELECT 
        COALESCE(s.object_key, d.object_key) as object_key,
        CASE 
          WHEN s.object_key IS NULL THEN 'missing_in_source'
          WHEN d.object_key IS NULL THEN 'missing_in_destination' 
          WHEN s.size != d.size THEN 'size_mismatch'
          WHEN s.etag != d.etag THEN 'content_mismatch'
          ELSE 'match'
        END as status,
        s.size as source_size,
        d.size as dest_size,
        s.etag as source_etag,
        d.etag as dest_etag,
        s.last_modified as source_modified,
        d.last_modified as dest_modified
      FROM (
        SELECT DISTINCT object_key 
        FROM object_inventory_${migrationId}
        ORDER BY object_key
        LIMIT ${batchSize} OFFSET ${offset}
      ) keys
      LEFT JOIN object_inventory_${migrationId} s 
        ON s.object_key = keys.object_key AND s.bucket_type = 'source'
      LEFT JOIN object_inventory_${migrationId} d 
        ON d.object_key = keys.object_key AND d.bucket_type = 'destination'
    `;

    try {
      return database.all(query);
    } catch (error) {
      console.error(`❌ Failed to compare object batch:`, error);
      return [];
    }
  }

  /**
   * Generate comprehensive reconciliation report
   */
  async generateReconciliationReport(migration) {
    console.log(`📋 Generating reconciliation report for migration ${migration.id}`);
    
    migration.reconciliation.progress.currentPhase = 'reporting';

    const stats = migration.reconciliation.stats;
    const totalObjects = stats.perfectMatches + stats.missingInDestination + 
                        stats.missingInSource + stats.sizeMismatches + stats.contentMismatches;

    const report = {
      migrationId: migration.id,
      summary: {
        totalObjectsCompared: totalObjects,
        perfectMatches: stats.perfectMatches,
        totalDifferences: stats.missingInDestination + stats.missingInSource + 
                         stats.sizeMismatches + stats.contentMismatches,
        successRate: totalObjects > 0 ? ((stats.perfectMatches / totalObjects) * 100).toFixed(2) : 0
      },
      breakdown: {
        missingInDestination: stats.missingInDestination,
        missingInSource: stats.missingInSource,
        sizeMismatches: stats.sizeMismatches,
        contentMismatches: stats.contentMismatches
      },
      performance: {
        startTime: migration.reconciliation.startTime,
        endTime: migration.reconciliation.endTime,
        totalDuration: this.calculateDuration(migration.reconciliation.startTime),
        sourceObjectsProcessed: migration.reconciliation.progress.sourceObjectsProcessed,
        destinationObjectsProcessed: migration.reconciliation.progress.destinationObjectsProcessed
      },
      recommendations: this.generateRecommendations(stats)
    };

    // Save report to file
    const reportPath = path.join(process.cwd(), 'data', `reconciliation_report_${migration.id}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    migration.reconciliation.reportPath = reportPath;
    migration.reconciliation.report = report;

    console.log(`✅ Reconciliation report generated: ${reportPath}`);
    return report;
  }

  /**
   * Generate recommendations based on reconciliation results
   */
  generateRecommendations(stats) {
    const recommendations = [];

    if (stats.missingInDestination > 0) {
      recommendations.push({
        type: 'missing_files',
        severity: 'high',
        message: `${stats.missingInDestination} files are missing in destination`,
        action: 'Run incremental sync to copy missing files'
      });
    }

    if (stats.sizeMismatches > 0) {
      recommendations.push({
        type: 'size_mismatches',
        severity: 'high',
        message: `${stats.sizeMismatches} files have size mismatches`,
        action: 'Re-copy files with size differences'
      });
    }

    if (stats.contentMismatches > 0) {
      recommendations.push({
        type: 'content_mismatches',
        severity: 'medium',
        message: `${stats.contentMismatches} files have content/ETag mismatches`,
        action: 'Verify and re-copy files if necessary'
      });
    }

    if (stats.missingInSource > 0) {
      recommendations.push({
        type: 'extra_files',
        severity: 'low',
        message: `${stats.missingInSource} extra files found in destination`,
        action: 'Review and clean up if necessary'
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        type: 'perfect_migration',
        severity: 'info',
        message: 'Perfect migration! All files match exactly',
        action: 'No action required'
      });
    }

    return recommendations;
  }

  /**
   * Calculate duration in human-readable format
   */
  calculateDuration(startTime) {
    const start = new Date(startTime);
    const now = new Date();
    const diffMs = now - start;
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  /**
   * Clean up reconciliation resources
   */
  async cleanupReconciliation(migrationId) {
    try {
      // Drop temporary tables
      database.run(`DROP TABLE IF EXISTS object_inventory_${migrationId}`);
      database.run(`DROP TABLE IF EXISTS reconciliation_checkpoints_${migrationId}`);
      
      // Remove from active reconciliations
      this.activeReconciliations.delete(migrationId);
      
      console.log(`🧹 Cleaned up reconciliation resources for migration ${migrationId}`);
    } catch (error) {
      console.error(`❌ Failed to cleanup reconciliation for ${migrationId}:`, error);
    }
  }

  /**
   * Get reconciliation progress for a migration
   */
  getReconciliationProgress(migrationId) {
    const migration = this.activeReconciliations.get(migrationId);
    if (!migration?.reconciliation) {
      return null;
    }

    return {
      id: migrationId,
      status: migration.reconciliation.status,
      progress: migration.reconciliation.progress,
      stats: migration.reconciliation.stats,
      startTime: migration.reconciliation.startTime,
      currentPhase: migration.reconciliation.progress.currentPhase
    };
  }
}

module.exports = new StreamingReconciliation();