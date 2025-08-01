const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data/migrations.db');
console.log('Database path:', dbPath);

try {
  const db = new Database(dbPath);
  
  // Check if tables exist
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('Tables:', tables);
  
  // Check migrations count
  const count = db.prepare("SELECT COUNT(*) as count FROM migrations").get();
  console.log('Migration count:', count);
  
  // Get all migrations
  const migrations = db.prepare("SELECT id, config_source, config_destination, status FROM migrations").all();
  console.log('Migrations:', migrations);
  
  db.close();
} catch (error) {
  console.error('Database error:', error);
}