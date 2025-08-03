const cronScheduler = require('./server/services/cronScheduler');

console.log('🔧 Testing CronScheduler...');

try {
  // Test getScheduledMigrations method
  console.log('\n📋 Testing cronScheduler.getScheduledMigrations...');
  const scheduledMigrations = cronScheduler.getScheduledMigrations();
  console.log(`✅ Found ${scheduledMigrations.length} scheduled migrations`);
  console.log('Scheduled migrations:', JSON.stringify(scheduledMigrations, null, 2));
  
  // Test getStats method  
  console.log('\n📊 Testing cronScheduler.getStats...');
  const stats = cronScheduler.getStats();
  console.log('✅ Stats:', JSON.stringify(stats, null, 2));
  
  // Test if scheduler is running
  console.log('\n🔄 Testing scheduler status...');
  console.log('Is running:', cronScheduler.isRunning);
  
} catch (error) {
  console.error('❌ Error testing cronScheduler:', error);
  console.error('❌ Stack trace:', error.stack);
}

console.log('\n🔧 Test completed');