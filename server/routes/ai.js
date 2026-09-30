const express = require('express');
const rateLimit = require('express-rate-limit');
const fs = require('fs-extra');
const {
  toPublicAiSettings,
  resolveAiConfig,
  stripCredentials,
  truncateTail,
  buildExplainPrompt,
  buildReconciliationPrompt,
  buildSuggestPrompt,
  chatCompletion,
  assistantMessages
} = require('../services/aiClient');

const LOG_TAIL_LIMIT = 8000;

function createAiRouter(deps = {}) {
  const database = deps.database || require('../services/database');
  const env = deps.env || process.env;
  const fetchImpl = deps.fetchImpl;
  const getBucketInfo = deps.getBucketInfo || ((aliasName, bucketName) => {
    const minioClient = require('../services/minioClient');
    return minioClient.getBucketInfo(aliasName, bucketName);
  });
  const readLogTail = deps.readLogTail || ((migration) => readStoredLogTail(database, migration));

  const router = express.Router();
  router.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many AI requests. Try again later.' }
  }));

  router.get('/settings', (req, res) => {
    const config = currentConfig();
    res.json({ success: true, data: toPublicAiSettings(config) });
  });

  router.put('/settings', (req, res) => {
    const { baseUrl, model, apiKey } = req.body || {};
    if (!baseUrl || typeof baseUrl !== 'string' || !/^https?:\/\//i.test(baseUrl.trim())) {
      return res.status(400).json({ success: false, error: 'A valid http(s) base URL is required' });
    }
    if (!model || typeof model !== 'string' || !model.trim()) {
      return res.status(400).json({ success: false, error: 'Model name is required' });
    }

    database.saveAiSettings({
      baseUrl: baseUrl.trim(),
      model: model.trim(),
      apiKey: typeof apiKey === 'string' && apiKey.trim() ? apiKey.trim() : undefined
    });

    res.json({ success: true, data: toPublicAiSettings(currentConfig()) });
  });

  router.post('/test', async (req, res) => {
    try {
      await complete('Reply with JSON {"cause":"ready","checks":[],"category":"unknown","suggestedAction":"none"}');
      res.json({ success: true, data: { ok: true } });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post('/explain-failure', async (req, res) => {
    try {
      const migrationId = req.body?.migrationId;
      if (!migrationId) {
        return res.status(400).json({ success: false, error: 'migrationId is required' });
      }

      const migration = database.getMigration(migrationId);
      if (!migration) {
        return res.status(404).json({ success: false, error: 'Migration not found' });
      }
      if (migration.status !== 'failed') {
        return res.status(400).json({ success: false, error: 'Failure explanation is available for failed migrations' });
      }

      const logTail = stripCredentials(await readLogTail(migration));
      const prompt = buildExplainPrompt({
        id: migration.id,
        status: migration.status,
        source: migration.config?.source,
        destination: migration.config?.destination,
        errors: (migration.errors || []).map((item) => stripCredentials(String(item))),
        logTail: truncateTail(logTail, LOG_TAIL_LIMIT)
      });
      const insight = await complete(prompt);
      res.json({ success: true, data: insight });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post('/summarize-reconciliation', async (req, res) => {
    try {
      const migrationId = req.body?.migrationId;
      if (!migrationId) {
        return res.status(400).json({ success: false, error: 'migrationId is required' });
      }

      const migration = database.getMigration(migrationId);
      if (!migration) {
        return res.status(404).json({ success: false, error: 'Migration not found' });
      }
      if (!migration.reconciliation) {
        return res.status(400).json({ success: false, error: 'No reconciliation data for this migration' });
      }

      const reconciliation = migration.reconciliation;
      const prompt = buildReconciliationPrompt({
        id: migration.id,
        source: migration.config?.source,
        destination: migration.config?.destination,
        missingCount: (reconciliation.missingFiles || []).length,
        extraCount: (reconciliation.extraFiles || []).length,
        sizeMismatchCount: (reconciliation.sizeDifferences || []).length,
        samplePaths: samplePaths(reconciliation)
      });
      const insight = await complete(prompt);
      res.json({ success: true, data: insight });
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post('/suggest-migration', async (req, res) => {
    try {
      const aliasName = req.body?.aliasName;
      const bucketName = req.body?.bucketName;
      if (!aliasName || !bucketName) {
        return res.status(400).json({ success: false, error: 'aliasName and bucketName are required' });
      }

      const info = await getBucketInfo(aliasName, bucketName);
      const prompt = buildSuggestPrompt({
        aliasName,
        bucketName,
        totalSize: info.totalSize || 0,
        totalObjects: info.totalObjects || 0,
        formattedSize: info.formattedSize || '0 B'
      });
      const insight = await complete(prompt);
      res.json({ success: true, data: insight });
    } catch (error) {
      sendError(res, error);
    }
  });

  return router;

  function currentConfig() {
    return resolveAiConfig({ stored: database.getAiSettings(), env });
  }

  function complete(prompt) {
    const config = currentConfig();
    return chatCompletion({
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      model: config.model,
      messages: assistantMessages(prompt),
      fetchImpl
    });
  }
}

async function readStoredLogTail(database, migration) {
  let logs = '';
  try {
    logs = database.getMigrationLogs(migration.id) || '';
  } catch (error) {
    logs = '';
  }

  if (!String(logs).trim() && migration.logFile) {
    try {
      logs = await fs.readFile(migration.logFile, 'utf8');
    } catch (error) {
      logs = '';
    }
  }

  const errors = (migration.errors || []).map((item) => String(item)).join('\n');
  return truncateTail(stripCredentials(`${errors}\n${logs}`), LOG_TAIL_LIMIT);
}

function samplePaths(reconciliation, limit = 20) {
  const paths = [];
  const push = (file) => {
    if (paths.length >= limit) return;
    if (typeof file === 'string' && file.trim()) paths.push(file.trim());
    else if (file && typeof file.path === 'string' && file.path.trim()) paths.push(file.path.trim());
  };
  (reconciliation.missingFiles || []).forEach(push);
  (reconciliation.extraFiles || []).forEach(push);
  (reconciliation.sizeDifferences || []).forEach(push);
  (reconciliation.differences || []).forEach(push);
  return paths;
}

function sendError(res, error) {
  const status = error.status || 500;
  res.status(status).json({
    success: false,
    error: error.message || 'AI request failed'
  });
}

module.exports = {
  createAiRouter
};
