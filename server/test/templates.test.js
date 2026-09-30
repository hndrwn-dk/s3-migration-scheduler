const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const { DatabaseService } = require('../services/database');

function createDb() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'migration-templates-'));
  return new DatabaseService(path.join(dir, 'migrations.db'));
}

const sample = {
  name: 'Nightly mirror',
  sourceAlias: 'aws',
  sourceBucket: 'source-bucket',
  destinationAlias: 'minio',
  destinationBucket: 'dest-bucket',
  options: {
    overwrite: false,
    remove: false,
    exclude: ['*.tmp'],
    preserve: true,
    retry: true,
    dryRun: false,
    watch: false
  }
};

test('saveTemplate stores a named migration pattern and lists it', () => {
  const db = createDb();
  const saved = db.saveTemplate(sample);
  const listed = db.listTemplates();

  assert.strictEqual(listed.length, 1);
  assert.strictEqual(listed[0].id, saved.id);
  assert.strictEqual(listed[0].name, 'Nightly mirror');
  assert.strictEqual(listed[0].sourceAlias, 'aws');
  assert.deepStrictEqual(listed[0].options.exclude, ['*.tmp']);
  db.close();
});

test('saveTemplate updates an existing template with the same name', () => {
  const db = createDb();
  const first = db.saveTemplate(sample);
  const second = db.saveTemplate({
    ...sample,
    destinationBucket: 'other-bucket'
  });

  assert.strictEqual(second.id, first.id);
  assert.strictEqual(db.listTemplates().length, 1);
  assert.strictEqual(db.getTemplate(first.id).destinationBucket, 'other-bucket');
  db.close();
});

test('deleteTemplate removes the saved pattern', () => {
  const db = createDb();
  const saved = db.saveTemplate(sample);
  assert.strictEqual(db.deleteTemplate(saved.id), true);
  assert.strictEqual(db.listTemplates().length, 0);
  assert.strictEqual(db.deleteTemplate(saved.id), false);
  db.close();
});

test('saveTemplate rejects a template without a name or buckets', () => {
  const db = createDb();
  assert.throws(() => db.saveTemplate({ ...sample, name: '  ' }), /Template name is required/);
  assert.throws(() => db.saveTemplate({ ...sample, sourceBucket: '' }), /bucket are required/);
  db.close();
});
