const CATEGORIES = new Set([
  'credentials',
  'network',
  'permissions',
  'client_flags',
  'differences',
  'settings',
  'unknown'
]);

const CHECKSUMS = new Set(['CRC64NVME', 'CRC32', 'CRC32C', 'SHA1', 'SHA256']);

const SENSITIVE_LINE = /(api[_-]?key|secret(?:key)?|password|token|authorization|credential|access[_-]?key)\s*[:=]/i;
const AWS_ACCESS_KEY = /\bAKIA[0-9A-Z]{16}\b/g;
const BEARER = /Bearer\s+\S+/gi;

const SYSTEM_PROMPT = [
  'You are an S3 migration assistant.',
  'Return only a JSON object with cause (string), checks (array of strings), category (one of credentials, network, permissions, client_flags, differences, settings, unknown), and suggestedAction (string).',
  'When suggesting settings, also include a settings object with overwrite, preserve, checksum, exclude, dryRun, retry, and scheduleHint.',
  'Never instruct the operator to delete destination data automatically.',
  'Do not invent file paths that were not provided.'
].join(' ');

function maskApiKey(apiKey) {
  if (!apiKey) return null;
  const value = String(apiKey);
  if (value.length <= 4) return '****';
  return `****${value.slice(-4)}`;
}

function toPublicAiSettings(config) {
  return {
    baseUrl: config.baseUrl,
    model: config.model,
    configured: Boolean(config.apiKey),
    keyHint: maskApiKey(config.apiKey)
  };
}

function resolveAiConfig({ stored, env = {} }) {
  const baseUrl = String((stored && stored.baseUrl) || env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
  const model = String((stored && stored.model) || env.AI_MODEL || 'gpt-4o-mini');
  const apiKey = String((stored && stored.apiKey) || env.AI_API_KEY || '');
  return { baseUrl, model, apiKey };
}

function stripCredentials(text) {
  return String(text || '')
    .split('\n')
    .map((line) => {
      if (SENSITIVE_LINE.test(line)) return '[redacted]';
      return line.replace(AWS_ACCESS_KEY, '[redacted]').replace(BEARER, 'Bearer [redacted]');
    })
    .join('\n');
}

function truncateTail(text, maxLength) {
  const value = String(text || '');
  if (value.length <= maxLength) return value;
  return value.slice(value.length - maxLength);
}

function parseAssistantContent(content) {
  const raw = String(content || '').trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : raw;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('AI provider did not return JSON');
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

function normalizeInsight(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const settings = source.settings && typeof source.settings === 'object' ? source.settings : null;
  const insight = {
    cause: typeof source.cause === 'string' && source.cause.trim()
      ? source.cause.trim()
      : 'No explanation was returned.',
    checks: Array.isArray(source.checks)
      ? source.checks.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim())
      : [],
    category: CATEGORIES.has(source.category) ? source.category : 'unknown',
    suggestedAction: typeof source.suggestedAction === 'string' && source.suggestedAction.trim()
      ? source.suggestedAction.trim()
      : 'Review the migration details before taking action.'
  };

  if (settings) {
    insight.settings = {
      overwrite: Boolean(settings.overwrite),
      preserve: Boolean(settings.preserve),
      checksum: CHECKSUMS.has(settings.checksum) ? settings.checksum : null,
      exclude: Array.isArray(settings.exclude)
        ? settings.exclude.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim())
        : [],
      dryRun: Boolean(settings.dryRun),
      retry: Boolean(settings.retry),
      scheduleHint: typeof settings.scheduleHint === 'string' ? settings.scheduleHint.trim() : ''
    };
  }

  return insight;
}

function buildExplainPrompt(facts) {
  return [
    'Explain this failed S3 migration.',
    `id: ${facts.id}`,
    `status: ${facts.status}`,
    `source: ${facts.source}`,
    `destination: ${facts.destination}`,
    `errors: ${(facts.errors || []).join(' | ')}`,
    'log tail:',
    facts.logTail || ''
  ].join('\n');
}

function buildReconciliationPrompt(facts) {
  return [
    'Summarize reconciliation differences. Do not recommend deleting destination data automatically.',
    `id: ${facts.id}`,
    `source: ${facts.source}`,
    `destination: ${facts.destination}`,
    `missing: ${facts.missingCount}`,
    `extra: ${facts.extraCount}`,
    `size mismatches: ${facts.sizeMismatchCount}`,
    `sample paths: ${(facts.samplePaths || []).join(', ')}`
  ].join('\n');
}

function buildSuggestPrompt(facts) {
  return [
    'Suggest migration settings for this bucket. Do not start a job.',
    `alias: ${facts.aliasName}`,
    `bucket: ${facts.bucketName}`,
    `objects: ${facts.totalObjects}`,
    `size bytes: ${facts.totalSize}`,
    `formatted size: ${facts.formattedSize}`,
    'Return settings for overwrite, preserve, checksum, exclude, dryRun, retry, and scheduleHint.'
  ].join('\n');
}

async function chatCompletion({
  baseUrl,
  apiKey,
  model,
  messages,
  timeoutMs = 30000,
  fetchImpl = global.fetch
}) {
  if (!apiKey) {
    const error = new Error('AI provider is not configured');
    error.status = 400;
    throw error;
  }

  const url = `${String(baseUrl).replace(/\/+$/, '')}/chat/completions`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const error = new Error(`AI provider returned ${response.status}`);
      error.status = 502;
      throw error;
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content || '';
    return normalizeInsight(parseAssistantContent(content));
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error('AI provider timed out');
      timeoutError.status = 504;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function assistantMessages(userContent) {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userContent }
  ];
}

module.exports = {
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
  chatCompletion,
  assistantMessages
};
