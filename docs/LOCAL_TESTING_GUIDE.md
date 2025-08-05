# 🧪 Local Testing Guide - Large-Scale Reconciliation System

## 🚀 **Quick Start Testing**

### **Prerequisites**
- Node.js 18+ installed
- MinIO Client (`mc`) installed and configured
- Git repository cloned locally

### **1. Setup Local Environment**

```bash
# Clone and setup
git clone https://github.com/hndrwn-dk/s3-migration-scheduler
cd s3-migration-scheduler

# Install dependencies
npm install
cd server && npm install
cd ../client && npm install
cd ..
```

### **2. Start the Application**

```bash
# Terminal 1: Start the backend
cd server
npm start

# Terminal 2: Start the frontend (in development mode)
cd client
npm start
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

---

## 🎯 **Testing Scenarios**

### **Scenario 1: Small Migration (Traditional Mode)**
*Tests the standard reconciliation for <100K objects*

#### **Setup Mock Data**
```bash
# Create test buckets with small dataset
mc mb local/test-source-small
mc mb local/test-dest-small

# Add some test files (< 1000 objects)
for i in {1..500}; do
  echo "Test content $i" | mc pipe local/test-source-small/file-$i.txt
done

# Copy most files to destination (simulate partial migration)
mc mirror local/test-source-small/ local/test-dest-small/ --exclude "file-4*.txt"
```

#### **Test via API**
```bash
# Start migration
curl -X POST http://localhost:5000/api/migration/start \
  -H "Content-Type: application/json" \
  -d '{
    "source": "local/test-source-small",
    "destination": "local/test-dest-small",
    "scheduleType": "immediate"
  }'

# Monitor progress
curl http://localhost:5000/api/migration/status/{migration-id}
```

**Expected Result**: Uses traditional `mc diff` reconciliation

---

### **Scenario 2: Large Migration (Streaming Mode)**
*Tests the new streaming reconciliation for 100K+ objects*

#### **Setup Mock Large Dataset**
```bash
# Create test script for large dataset
cat > generate_large_dataset.sh << 'EOF'
#!/bin/bash
echo "Creating large test dataset..."

mc mb local/test-source-large
mc mb local/test-dest-large

# Generate 50,000 files (will trigger large-scale mode)
for i in {1..50000}; do
  if [ $((i % 1000)) -eq 0 ]; then
    echo "Generated $i files..."
  fi
  
  # Create files with different sizes
  SIZE=$((RANDOM % 1000 + 100))
  head -c $SIZE /dev/urandom | base64 | mc pipe local/test-source-large/large-file-$i.dat
done

echo "Copying 80% of files to destination (simulating partial migration)..."
# Copy most files but skip every 5th file to create differences
mc mirror local/test-source-large/ local/test-dest-large/ --exclude "*[05].dat"

echo "Large dataset ready for testing!"
EOF

chmod +x generate_large_dataset.sh
./generate_large_dataset.sh
```

#### **Test Large-Scale Reconciliation**
```bash
# Start large migration
curl -X POST http://localhost:5000/api/migration/start \
  -H "Content-Type: application/json" \
  -d '{
    "source": "local/test-source-large",
    "destination": "local/test-dest-large",
    "scheduleType": "immediate"
  }'

# Get migration ID from response, then monitor streaming progress
MIGRATION_ID="your-migration-id-here"

# Monitor real-time streaming progress
curl http://localhost:5000/api/migration/reconciliation/$MIGRATION_ID/progress

# Watch detailed stats
curl http://localhost:5000/api/migration/reconciliation/$MIGRATION_ID/stats

# Check all active reconciliations
curl http://localhost:5000/api/migration/reconciliations/active
```

**Expected Result**: Uses new streaming reconciliation with SQLite database

---

### **Scenario 3: Testing Different Object Counts**

#### **Quick Test Script**
```bash
cat > test_different_scales.sh << 'EOF'
#!/bin/bash

test_scale() {
  local count=$1
  local suffix=$2
  
  echo "🧪 Testing with $count objects ($suffix mode)..."
  
  mc mb local/test-$suffix 2>/dev/null || true
  mc mb local/test-$suffix-dest 2>/dev/null || true
  mc rm local/test-$suffix --recursive --force 2>/dev/null || true
  mc rm local/test-$suffix-dest --recursive --force 2>/dev/null || true
  
  # Generate files
  for i in $(seq 1 $count); do
    echo "Content $i" | mc pipe local/test-$suffix/file-$i.txt
  done
  
  # Partial copy (90% of files)
  mc mirror local/test-$suffix/ local/test-$suffix-dest/ --exclude "*[09].txt"
  
  echo "✅ Dataset ready: $count objects"
  echo "📊 Expected mode: $suffix"
  echo "🔗 Test with: source=local/test-$suffix, dest=local/test-$suffix-dest"
  echo ""
}

# Test different scales
test_scale 500 "small"      # Traditional mode
test_scale 50000 "medium"   # Large-scale mode  
test_scale 150000 "large"   # Enterprise mode

echo "🎯 All test datasets created!"
echo "💡 Use the frontend or API to test different reconciliation modes"
EOF

chmod +x test_different_scales.sh
./test_different_scales.sh
```

---

## 🔍 **Monitoring & Debugging**

### **1. Real-time Monitoring**

#### **WebSocket Connection (Browser Console)**
```javascript
// Connect to WebSocket for live updates
const ws = new WebSocket('ws://localhost:5000');

ws.onmessage = function(event) {
  const data = JSON.parse(event.data);
  if (data.type === 'migration:update') {
    console.log('📊 Migration Update:', data.data);
    
    if (data.data.reconciliation?.progress) {
      console.log('🔄 Reconciliation Progress:', {
        phase: data.data.reconciliation.progress.currentPhase,
        sourceProcessed: data.data.reconciliation.progress.sourceObjectsProcessed,
        destProcessed: data.data.reconciliation.progress.destinationObjectsProcessed
      });
    }
  }
};
```

#### **API Monitoring Script**
```bash
cat > monitor_reconciliation.sh << 'EOF'
#!/bin/bash

MIGRATION_ID=$1
if [ -z "$MIGRATION_ID" ]; then
  echo "Usage: $0 <migration-id>"
  exit 1
fi

echo "🔍 Monitoring reconciliation: $MIGRATION_ID"
echo "Press Ctrl+C to stop monitoring"

while true; do
  clear
  echo "=== RECONCILIATION MONITOR ==="
  echo "Migration ID: $MIGRATION_ID"
  echo "Time: $(date)"
  echo ""
  
  # Get progress
  curl -s http://localhost:5000/api/migration/reconciliation/$MIGRATION_ID/progress | jq -r '
    if .success then
      "📊 Status: " + .data.status + "\n" +
      "🔄 Phase: " + .data.progress.currentPhase + "\n" +
      "📥 Source Objects: " + (.data.progress.sourceObjectsProcessed | tostring) + "\n" +
      "📤 Dest Objects: " + (.data.progress.destinationObjectsProcessed | tostring) + "\n" +
      "📦 Chunks Completed: " + (.data.progress.chunksCompleted | tostring)
    else
      "❌ " + .error
    end
  '
  
  echo ""
  echo "=== STATISTICS ==="
  curl -s http://localhost:5000/api/migration/reconciliation/$MIGRATION_ID/stats | jq -r '
    if .success and .data.results then
      "✅ Perfect Matches: " + (.data.results.perfectMatches | tostring) + "\n" +
      "❌ Missing in Dest: " + (.data.results.missingInDestination | tostring) + "\n" +
      "➕ Extra in Dest: " + (.data.results.missingInSource | tostring) + "\n" +
      "📏 Size Mismatches: " + (.data.results.sizeMismatches | tostring) + "\n" +
      "🔍 Content Mismatches: " + (.data.results.contentMismatches | tostring)
    else
      "📊 Statistics not yet available"
    end
  '
  
  sleep 2
done
EOF

chmod +x monitor_reconciliation.sh
```

### **2. Database Inspection**

#### **Check Reconciliation Database**
```bash
# View reconciliation data (replace {migration-id} with actual ID)
sqlite3 server/data/reconciliation_{migration-id}.db << 'EOF'
.headers on
.mode table

-- Check inventory counts
SELECT bucket_type, COUNT(*) as object_count 
FROM object_inventory_{migration-id} 
GROUP BY bucket_type;

-- Check chunk processing progress
SELECT chunk_id, bucket_type, COUNT(*) as objects_in_chunk
FROM object_inventory_{migration-id}
GROUP BY chunk_id, bucket_type
ORDER BY chunk_id;

-- Sample objects
SELECT bucket_type, object_key, size, etag 
FROM object_inventory_{migration-id} 
LIMIT 10;

.quit
EOF
```

---

## 📊 **Performance Testing**

### **1. Memory Usage Monitoring**

```bash
cat > monitor_memory.sh << 'EOF'
#!/bin/bash

echo "🔍 Monitoring Node.js memory usage"
echo "Press Ctrl+C to stop"

while true; do
  # Get Node.js process memory
  ps -p $(pgrep -f "node.*server") -o pid,vsz,rss,pcpu,comm 2>/dev/null || echo "Server not running"
  
  # Get system memory
  echo "💾 System Memory:"
  free -h | grep -E "Mem:|Swap:"
  
  echo "---"
  sleep 5
done
EOF

chmod +x monitor_memory.sh
./monitor_memory.sh
```

### **2. Performance Benchmarking**

```bash
cat > benchmark_reconciliation.sh << 'EOF'
#!/bin/bash

run_benchmark() {
  local object_count=$1
  local test_name=$2
  
  echo "🏁 Benchmark: $test_name ($object_count objects)"
  
  # Record start time
  start_time=$(date +%s)
  start_memory=$(ps -p $(pgrep -f "node.*server") -o rss= 2>/dev/null || echo "0")
  
  # Start migration via API
  response=$(curl -s -X POST http://localhost:5000/api/migration/start \
    -H "Content-Type: application/json" \
    -d "{\"source\": \"local/test-$test_name\", \"destination\": \"local/test-$test_name-dest\", \"scheduleType\": \"immediate\"}")
  
  migration_id=$(echo $response | jq -r '.migrationId')
  
  if [ "$migration_id" = "null" ]; then
    echo "❌ Failed to start migration"
    return
  fi
  
  echo "📊 Migration ID: $migration_id"
  
  # Wait for completion
  while true; do
    status=$(curl -s http://localhost:5000/api/migration/status/$migration_id | jq -r '.migration.status')
    
    if [ "$status" = "completed" ] || [ "$status" = "verified" ] || [ "$status" = "completed_with_differences" ]; then
      break
    elif [ "$status" = "failed" ]; then
      echo "❌ Migration failed"
      return
    fi
    
    sleep 2
  done
  
  # Record end time
  end_time=$(date +%s)
  end_memory=$(ps -p $(pgrep -f "node.*server") -o rss= 2>/dev/null || echo "0")
  
  duration=$((end_time - start_time))
  memory_used=$((end_memory - start_memory))
  
  echo "⏱️  Duration: ${duration}s"
  echo "💾 Memory increase: ${memory_used}KB"
  echo "📊 Objects/second: $((object_count / duration))"
  echo ""
}

# Run benchmarks
run_benchmark 1000 "small"
run_benchmark 10000 "medium" 
run_benchmark 50000 "large"
EOF

chmod +x benchmark_reconciliation.sh
```

---

## 🐛 **Debugging Common Issues**

### **1. Large-Scale Mode Not Triggering**

```bash
# Check if estimation is working
curl -X POST http://localhost:5000/api/migration/estimate \
  -H "Content-Type: application/json" \
  -d '{"source": "local/test-source-large"}'

# Should return estimatedObjects > 100000 for large-scale mode
```

### **2. Database Connection Issues**

```bash
# Check if SQLite databases are created
ls -la server/data/reconciliation_*.db

# Check database permissions
chmod 666 server/data/reconciliation_*.db
```

### **3. Memory Leaks**

```bash
# Monitor Node.js heap usage
cat > check_heap.js << 'EOF'
setInterval(() => {
  const used = process.memoryUsage();
  console.log('Memory Usage:', {
    rss: Math.round(used.rss / 1024 / 1024) + 'MB',
    heapUsed: Math.round(used.heapUsed / 1024 / 1024) + 'MB',
    heapTotal: Math.round(used.heapTotal / 1024 / 1024) + 'MB'
  });
}, 5000);
EOF

node check_heap.js &
```

---

## 📋 **Test Checklist**

### **Basic Functionality**
- [ ] Small migration (<1K objects) uses traditional mode
- [ ] Large migration (>100K objects) uses streaming mode
- [ ] WebSocket updates work in real-time
- [ ] Progress tracking shows correct phases
- [ ] Memory usage stays constant during large migrations

### **API Endpoints**
- [ ] `GET /reconciliation/:id/progress` returns real-time data
- [ ] `GET /reconciliation/:id/stats` shows correct statistics
- [ ] `GET /reconciliation/:id/report` downloads JSON report
- [ ] `DELETE /reconciliation/:id/cleanup` cleans up resources
- [ ] `GET /reconciliations/active` lists active reconciliations

### **Database Operations**
- [ ] SQLite tables created for large migrations
- [ ] Object inventory populated correctly
- [ ] Batch comparisons work efficiently
- [ ] Cleanup removes temporary tables

### **Performance Verification**
- [ ] Memory usage <200MB for 100K+ objects
- [ ] Processing speed >1000 objects/second
- [ ] No memory leaks during long operations
- [ ] Resume capability works after interruption

---

## 🎯 **Expected Test Results**

### **Small Migration (500 objects)**
```
Mode: Traditional
Duration: 5-15 seconds
Memory: <20MB increase
Reconciliation: mc diff based
```

### **Large Migration (50K objects)**
```
Mode: Large-scale streaming
Duration: 2-5 minutes  
Memory: <100MB increase
Reconciliation: SQLite based
Database: reconciliation_{id}.db created
```

### **Very Large Migration (150K objects)**
```
Mode: Enterprise streaming
Duration: 10-30 minutes
Memory: <200MB increase
Features: Checkpoints, detailed reporting
```

This testing guide ensures your large-scale reconciliation system works perfectly in your local environment! 🚀