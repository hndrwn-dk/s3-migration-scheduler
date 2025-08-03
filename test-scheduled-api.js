const database = require('./server/services/database');

console.log('🔧 Testing Scheduled Migrations API...');

try {
  // Test database connection
  console.log('✅ Database connected');
  
  // Test getScheduledMigrations method
  console.log('\n📋 Testing getScheduledMigrations...');
  const scheduledMigrations = database.getScheduledMigrations();
  console.log(`✅ Found ${scheduledMigrations.length} scheduled migrations`);
  console.log('Scheduled migrations:', JSON.stringify(scheduledMigrations, null, 2));
  
  // Test getScheduledMigrationStats method  
  console.log('\n📊 Testing getScheduledMigrationStats...');
  const stats = database.getScheduledMigrationStats();
  console.log('✅ Stats:', JSON.stringify(stats, null, 2));
  
  // Test getting all migrations to see what's in the database
  console.log('\n📋 Testing getAllMigrations...');
  const allMigrations = database.getAllMigrations();
  console.log(`✅ Found ${allMigrations.length} total migrations`);
  
  // Show a sample migration if any exist
  if (allMigrations.length > 0) {
    console.log('Sample migration:', JSON.stringify(allMigrations[0], null, 2));
  }
  
} catch (error) {
  console.error('❌ Error testing database:', error);
  console.error('❌ Stack trace:', error.stack);
}

console.log('\n🔧 Test completed');