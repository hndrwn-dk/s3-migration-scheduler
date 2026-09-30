const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const { resolveClientBuildPath } = require('../services/clientBuildPath');

test('resolveClientBuildPath prefers the packaged client folder when build/index.html is absent', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'client-build-'));
  const serverDir = path.join(root, 'server');
  const packagedClient = path.join(root, 'client');
  fs.mkdirSync(serverDir);
  fs.mkdirSync(packagedClient);
  fs.writeFileSync(path.join(packagedClient, 'index.html'), '<html></html>');

  const resolved = resolveClientBuildPath({ serverDir });
  assert.strictEqual(resolved, packagedClient);
});

test('resolveClientBuildPath uses client/build for the Docker layout', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'client-build-'));
  const serverDir = path.join(root, 'server');
  const dockerClient = path.join(root, 'client', 'build');
  fs.mkdirSync(serverDir);
  fs.mkdirSync(dockerClient, { recursive: true });
  fs.writeFileSync(path.join(dockerClient, 'index.html'), '<html></html>');

  const resolved = resolveClientBuildPath({ serverDir });
  assert.strictEqual(resolved, dockerClient);
});

test('resolveClientBuildPath uses CLIENT_BUILD_PATH when that folder contains index.html', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'client-build-'));
  const serverDir = path.join(root, 'server');
  const explicit = path.join(root, 'explicit');
  fs.mkdirSync(serverDir);
  fs.mkdirSync(explicit);
  fs.writeFileSync(path.join(explicit, 'index.html'), '<html></html>');

  const resolved = resolveClientBuildPath({ serverDir, envPath: explicit });
  assert.strictEqual(resolved, explicit);
});
