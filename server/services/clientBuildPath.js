const fs = require('fs');
const path = require('path');

function resolveClientBuildPath({ serverDir, envPath } = {}) {
  const candidates = [
    envPath,
    path.join(serverDir, '../client/build'),
    path.join(serverDir, '../client')
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'index.html'))) {
      return candidate;
    }
  }

  return null;
}

module.exports = { resolveClientBuildPath };
