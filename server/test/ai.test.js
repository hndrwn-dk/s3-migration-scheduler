const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const http = require('http');

const {
  maskApiKey,
  stripCredentials,
  truncateTail,
  toPublicAiSettings,
  resolveAiConfig,
  parseAssistantContent,
  normalizeInsight,
  buildExplainPrompt,
  buildReconciliationPrompt,
  buildSuggestPrompt,
  chatCompletion
} = require('../services/aiClient');
const { DatabaseService } = require('../services/database');
const { createAiRouter } = require('../routes/ai');

test('maskApiKey never returns the raw key', () => {
  const key = 'sk-test-secret-key-abcd';
  const hint = maskApiKey(key);
  assert.strictEqual(hint, '****abcd');
  assert.equal(hint.includes('sk-test'), false);
  assert.strictEqual(maskApiKey(''), null);
  assert.strictEqual(maskApiKey('ab'), '****');
});

test('toPublicAiSettings omits the api key', () => {
  const secret = 'sk-live-should-not-leak-9999';
  const pub = toPublicAiSettings({
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    apiKey: secret
  });
  const serialized = JSON.stringify(pub);
  assert.equal(serialized.includes(secret), false);
  assert.strictEqual(pub.configured, true);
  assert.strictEqual(pub.keyHint, '****9999');
  assert.strictEqual(pub.apiKey, undefined);
});

test('resolveAiConfig prefers stored values and falls back to env', () => {
  const fromEnv = resolveAiConfig({
    stored: null,
    env: {
      AI_BASE_URL: 'https://example.test/v1/',
      AI_MODEL: 'local-model',
      AI_API_KEY: 'env-key-1234'
    }
  });
  assert.strictEqual(fromEnv.baseUrl, 'https://example.test/v1');
  assert.strictEqual(fromEnv.model, 'local-model');
  assert.strictEqual(fromEnv.apiKey, 'env-key-1234');

  const fromDb = resolveAiConfig({
    stored: { baseUrl: 'http://127.0.0.1:11434/v1', model: 'llama', apiKey: 'db-key-zzzz' },
    env: { AI_API_KEY: 'env-key-1234', AI_MODEL: 'ignored', AI_BASE_URL: 'https://ignored' }
  });
  assert.strictEqual(fromDb.apiKey, 'db-key-zzzz');
  assert.strictEqual(fromDb.model, 'llama');
});

test('stripCredentials removes secrets and truncateTail keeps the end', () => {
  const raw = [
    'copy started',
    'accessKey=AKIAIOSFODNN7EXAMPLE',
    'Authorization: Bearer sk-super-secret-token',
    'secretKey: wJalrXUtnFEMI',
    'normal progress line'
  ].join('\n');
  const cleaned = stripCredentials(raw);
  assert.equal(cleaned.includes('AKIAIOSFODNN7EXAMPLE'), false);
  assert.equal(cleaned.includes('sk-super-secret-token'), false);
  assert.equal(cleaned.includes('wJalrXUtnFEMI'), false);
  assert.equal(cleaned.includes('normal progress line'), true);

  const tail = truncateTail('abcdefghijklmnopqrstuvwxyz', 5);
  assert.strictEqual(tail, 'vwxyz');
});

test('parseAssistantContent reads JSON and fenced JSON', () => {
  const parsed = parseAssistantContent('{"cause":"denied","checks":["key"],"category":"permissions","suggestedAction":"rotate"}');
  assert.strictEqual(parsed.cause, 'denied');
  const fenced = parseAssistantContent('```json\n{"cause":"timeout","checks":[],"category":"network","suggestedAction":"retry"}\n```');
  assert.strictEqual(fenced.category, 'network');
});

test('normalizeInsight drops unknown settings and unknown categories', () => {
  const insight = normalizeInsight({
    cause: 'large bucket',
    checks: 'not-an-array',
    category: 'drop-everything',
    suggestedAction: 'review',
    settings: {
      overwrite: true,
      preserve: false,
      checksum: 'MD5',
      exclude: ['*.tmp', 12],
      dryRun: true,
      retry: false,
      scheduleHint: 'night',
      remove: true
    }
  });
  assert.strictEqual(insight.category, 'unknown');
  assert.deepStrictEqual(insight.checks, []);
  assert.strictEqual(insight.settings.checksum, null);
  assert.deepStrictEqual(insight.settings.exclude, ['*.tmp']);
  assert.strictEqual(insight.settings.remove, undefined);
  assert.strictEqual(insight.settings.overwrite, true);
});

test('prompts include migration facts and exclude secret-looking fields', () => {
  const explain = buildExplainPrompt({
    id: 'mig-1',
    status: 'failed',
    source: 'src/bucket',
    destination: 'dst/bucket',
    errors: ['Access Denied'],
    logTail: 'ERROR Access Denied'
  });
  assert.equal(explain.includes('Access Denied'), true);
  assert.equal(explain.includes('apiKey'), false);

  const recon = buildReconciliationPrompt({
    id: 'mig-2',
    source: 'a/b',
    destination: 'c/d',
    missingCount: 2,
    extraCount: 1,
    sizeMismatchCount: 3,
    samplePaths: ['file-a']
  });
  assert.equal(recon.includes('file-a'), true);
  assert.equal(recon.includes('missing: 2'), true);

  const suggest = buildSuggestPrompt({
    aliasName: 'prod',
    bucketName: 'photos',
    totalSize: 1024,
    totalObjects: 10,
    formattedSize: '1 KB'
  });
  assert.equal(suggest.includes('photos'), true);
  assert.equal(suggest.includes('secret'), false);
});

test('chatCompletion posts to the OpenAI-compatible endpoint without logging the key', async () => {
  const logs = [];
  const originalLog = console.log;
  console.log = (...args) => logs.push(args.join(' '));
  let seenAuth = '';
  let seenPath = '';
  try {
    const result = await chatCompletion({
      baseUrl: 'https://llm.example/v1',
      apiKey: 'sk-should-stay-server-side',
      model: 'test-model',
      messages: [{ role: 'user', content: 'hi' }],
      timeoutMs: 1000,
      fetchImpl: async (url, options) => {
        seenAuth = options.headers.Authorization;
        seenPath = url;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            choices: [{ message: { content: '{"cause":"ok","checks":["a"],"category":"unknown","suggestedAction":"none"}' } }]
          })
        };
      }
    });
    assert.strictEqual(seenPath, 'https://llm.example/v1/chat/completions');
    assert.strictEqual(seenAuth, 'Bearer sk-should-stay-server-side');
    assert.strictEqual(result.cause, 'ok');
    assert.equal(logs.join('\n').includes('sk-should-stay-server-side'), false);
  } finally {
    console.log = originalLog;
  }
});

test('ai settings routes persist a key and never return it', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-settings-'));
  const database = new DatabaseService(path.join(dir, 'migrations.db'));
  const calls = [];
  const router = createAiRouter({
    database,
    env: {},
    fetchImpl: async (url, options) => {
      calls.push({ url, auth: options.headers.Authorization });
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: '{"ok":true,"cause":"ready","checks":[],"category":"unknown","suggestedAction":"none"}' } }]
        })
      };
    },
    getBucketInfo: async () => ({
      name: 'photos',
      totalSize: 2048,
      totalObjects: 4,
      formattedSize: '2 KB'
    }),
    readLogTail: async () => 'ERROR signature mismatch'
  });

  const express = require('express');
  const app = express();
  app.use(express.json());
  app.use('/api/ai', router);
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const created = await request(port, 'PUT', '/api/ai/settings', {
      baseUrl: 'https://llm.example/v1',
      model: 'demo-model',
      apiKey: 'sk-route-secret-key-7777'
    });
    assert.strictEqual(created.status, 200);
    assert.equal(JSON.stringify(created.body).includes('sk-route-secret-key-7777'), false);
    assert.strictEqual(created.body.data.configured, true);
    assert.strictEqual(created.body.data.keyHint, '****7777');

    const loaded = await request(port, 'GET', '/api/ai/settings');
    assert.equal(JSON.stringify(loaded.body).includes('sk-route-secret-key-7777'), false);
    assert.strictEqual(loaded.body.data.model, 'demo-model');
    assert.strictEqual(loaded.body.data.baseUrl, 'https://llm.example/v1');

    const kept = await request(port, 'PUT', '/api/ai/settings', {
      baseUrl: 'https://llm.example/v1',
      model: 'demo-model-2'
    });
    assert.strictEqual(kept.body.data.model, 'demo-model-2');
    assert.strictEqual(kept.body.data.keyHint, '****7777');

    const tested = await request(port, 'POST', '/api/ai/test', {});
    assert.strictEqual(tested.status, 200);
    assert.strictEqual(tested.body.success, true);
    assert.equal(calls[0].auth, 'Bearer sk-route-secret-key-7777');

    database.insertMigration({
      id: 'mig-fail',
      config: { source: 'src/bucket', destination: 'dst/bucket', options: {} },
      status: 'failed',
      progress: 10,
      startTime: new Date().toISOString(),
      logFile: null,
      errors: ['signature mismatch'],
      stats: {}
    });
    const explained = await request(port, 'POST', '/api/ai/explain-failure', { migrationId: 'mig-fail' });
    assert.strictEqual(explained.status, 200);
    assert.strictEqual(explained.body.data.cause, 'ready');

    database.updateMigration('mig-fail', {
      reconciliation: {
        status: 'completed',
        differences: [],
        missingFiles: [{ path: 'a.txt' }],
        extraFiles: [],
        sizeDifferences: [{ path: 'b.txt' }]
      }
    });
    const summary = await request(port, 'POST', '/api/ai/summarize-reconciliation', { migrationId: 'mig-fail' });
    assert.strictEqual(summary.status, 200);
    assert.ok(summary.body.data.suggestedAction);

    const suggestion = await request(port, 'POST', '/api/ai/suggest-migration', {
      aliasName: 'prod',
      bucketName: 'photos'
    });
    assert.strictEqual(suggestion.status, 200);
    assert.ok(suggestion.body.data);

    const missing = await request(port, 'POST', '/api/ai/explain-failure', {});
    assert.strictEqual(missing.status, 400);
  } finally {
    database.close();
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function request(port, method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path: urlPath,
      method,
      headers: payload ? {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      } : {}
    }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let parsed = {};
        try {
          parsed = text ? JSON.parse(text) : {};
        } catch (error) {
          parsed = { raw: text };
        }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}
