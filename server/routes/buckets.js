const express = require('express');
const router = express.Router();
const minioClient = require('../services/minioClient');

// Check MinIO client installation
router.get('/health', async (req, res) => {
  try {
    const health = await minioClient.checkMcInstallation();
    res.json({ success: true, data: health });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Configure S3 alias
router.post('/alias', async (req, res) => {
  try {
    const { aliasName, endpoint, accessKey, secretKey } = req.body;

    // Validate required fields
    if (!aliasName || !endpoint || !accessKey || !secretKey) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required: aliasName, endpoint, accessKey, secretKey'
      });
    }

    // Validate alias name format
    if (!/^[a-zA-Z0-9_-]+$/.test(aliasName)) {
      return res.status(400).json({
        success: false,
        error: 'Alias name can only contain letters, numbers, hyphens, and underscores'
      });
    }

    const result = await minioClient.configureAlias(aliasName, endpoint, accessKey, secretKey);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Alias configuration error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// List buckets for an alias
router.get('/list/:aliasName', async (req, res) => {
  try {
    const { aliasName } = req.params;

    if (!aliasName) {
      return res.status(400).json({
        success: false,
        error: 'Alias name is required'
      });
    }

    const buckets = await minioClient.listBuckets(aliasName);
    res.json({ success: true, data: buckets });
  } catch (error) {
    console.error('List buckets error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get bucket information
router.get('/info/:aliasName/:bucketName', async (req, res) => {
  try {
    const { aliasName, bucketName } = req.params;

    if (!aliasName || !bucketName) {
      return res.status(400).json({
        success: false,
        error: 'Alias name and bucket name are required'
      });
    }

    const bucketInfo = await minioClient.getBucketInfo(aliasName, bucketName);
    res.json({ success: true, data: bucketInfo });
  } catch (error) {
    console.error('Get bucket info error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test alias connection
router.post('/test/:aliasName', async (req, res) => {
  try {
    const { aliasName } = req.params;

    if (!aliasName) {
      return res.status(400).json({
        success: false,
        error: 'Alias name is required'
      });
    }

    // Try to list buckets to test connection
    const buckets = await minioClient.listBuckets(aliasName);
    
    res.json({ 
      success: true, 
      data: { 
        connected: true, 
        bucketsCount: buckets.length,
        message: 'Connection successful' 
      } 
    });
  } catch (error) {
    res.json({ 
      success: true, 
      data: { 
        connected: false, 
        error: error.message 
      } 
    });
  }
});

// Get detailed bucket analysis for migration planning
router.get('/analyze/:aliasName/:bucketName', async (req, res) => {
  try {
    const { aliasName, bucketName } = req.params;

    if (!aliasName || !bucketName) {
      return res.status(400).json({
        success: false,
        error: 'Alias name and bucket name are required'
      });
    }

    // Get basic bucket info
    const bucketInfo = await minioClient.getBucketInfo(aliasName, bucketName);
    
    // Additional analysis could be added here
    const analysis = {
      ...bucketInfo,
      estimatedMigrationTime: calculateEstimatedTime(bucketInfo.totalSize),
      recommendations: generateRecommendations(bucketInfo)
    };

    res.json({ success: true, data: analysis });
  } catch (error) {
    console.error('Bucket analysis error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper function to calculate estimated migration time
function calculateEstimatedTime(totalSize) {
  // Rough estimation based on average transfer speeds
  // Assumes ~50MB/s average transfer speed
  const avgSpeedMBps = 50;
  const sizeInMB = totalSize / (1024 * 1024);
  const estimatedSeconds = sizeInMB / avgSpeedMBps;
  
  if (estimatedSeconds < 60) {
    return `${Math.ceil(estimatedSeconds)} seconds`;
  } else if (estimatedSeconds < 3600) {
    return `${Math.ceil(estimatedSeconds / 60)} minutes`;
  } else {
    return `${Math.ceil(estimatedSeconds / 3600)} hours`;
  }
}

// Helper function to generate migration recommendations
function generateRecommendations(bucketInfo) {
  const recommendations = [];
  
  if (bucketInfo.totalSize > 1024 * 1024 * 1024 * 10) { // > 10GB
    recommendations.push('Consider using parallel transfers for large datasets');
  }
  
  if (bucketInfo.totalObjects > 10000) {
    recommendations.push('High object count detected - monitor progress closely');
  }
  
  if (bucketInfo.totalSize < 1024 * 1024) { // < 1MB
    recommendations.push('Small bucket - migration should complete quickly');
  }
  
  recommendations.push('Always verify data integrity after migration');
  recommendations.push('Consider scheduling migration during low-traffic periods');
  
  return recommendations;
}

module.exports = router;