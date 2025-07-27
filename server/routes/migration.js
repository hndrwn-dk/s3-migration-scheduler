const express = require('express');
const router = express.Router();
const minioClient = require('../services/minioClient');

// Get all migrations
router.get('/', async (req, res) => {
  try {
    const migrations = minioClient.getAllMigrations();
    res.json({ success: true, data: migrations });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start a new migration
router.post('/start', async (req, res) => {
  try {
    const { source, destination, options = {} } = req.body;

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

// Get migration status
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const status = minioClient.getMigrationStatus(id);
    res.json({ success: true, data: status });
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
  }
});

// Get migration logs
router.get('/:id/logs', async (req, res) => {
  try {
    const { id } = req.params;
    const logs = await minioClient.getMigrationLogs(id);
    res.json({ success: true, data: { logs } });
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
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

module.exports = router;