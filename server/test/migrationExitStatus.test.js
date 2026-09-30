const assert = require('assert');
const test = require('node:test');
const {
  resolveProcessExitStatus,
  canResumeMigration
} = require('../services/migrationExitStatus');

test('a user pause stays paused when the process exits', () => {
  assert.strictEqual(resolveProcessExitStatus(1, 'pause'), 'paused');
  assert.strictEqual(resolveProcessExitStatus(0, 'pause'), 'paused');
});

test('a user cancel stays cancelled when the process exits', () => {
  assert.strictEqual(resolveProcessExitStatus(1, 'cancel'), 'cancelled');
});

test('a normal exit is completed or failed', () => {
  assert.strictEqual(resolveProcessExitStatus(0, undefined), 'completed');
  assert.strictEqual(resolveProcessExitStatus(1, undefined), 'failed');
});

test('resume is offered for paused, failed, and cancelled jobs', () => {
  assert.strictEqual(canResumeMigration('paused'), true);
  assert.strictEqual(canResumeMigration('failed'), true);
  assert.strictEqual(canResumeMigration('cancelled'), true);
  assert.strictEqual(canResumeMigration('running'), false);
  assert.strictEqual(canResumeMigration('completed'), false);
});
