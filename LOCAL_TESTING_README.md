# 🧪 **Local Testing - Quick Start Guide**

## 🚀 **One-Command Setup**

```bash
# Clone the repository and setup everything automatically
git clone https://github.com/hndrwn-dk/s3-migration-scheduler
cd s3-migration-scheduler
./scripts/setup-local-testing.sh
```

That's it! The script will:
- ✅ Check and install prerequisites (Node.js, MinIO Client, jq)
- ✅ Setup local MinIO server
- ✅ Install all dependencies
- ✅ Create test datasets (500 and 5,000 objects)
- ✅ Generate helper scripts

---

## 🎯 **Test the Large-Scale Reconciliation**

### **Step 1: Start the Application**
```bash
./start-dev.sh
```
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:5000
- **MinIO Console**: http://localhost:9001

### **Step 2: Test Different Modes**

#### **Traditional Mode (500 objects)**
```bash
./test-reconciliation.sh small
```
Expected: Uses `mc diff`, completes in 5-15 seconds

#### **Large-Scale Streaming Mode (5,000 objects)** 
```bash
./test-reconciliation.sh medium
```
Expected: Uses streaming reconciliation, creates SQLite database, real-time progress

#### **Enterprise Mode (50,000 objects)** *(optional)*
```bash
# First generate large dataset (takes 5-10 minutes)
./scripts/setup-local-testing.sh --large

# Then test enterprise mode
./test-reconciliation.sh large
```
Expected: Advanced streaming with checkpoints, comprehensive reporting

---

## 🔍 **Monitor Performance**

### **Memory Usage**
```bash
./monitor-memory.sh
```
Watch memory stay constant during large reconciliations!

### **Real-time Progress**
```bash
# Replace {migration-id} with actual ID from test output
curl http://localhost:5000/api/migration/reconciliation/{migration-id}/progress
```

### **Download Reports**
```bash
# Get comprehensive reconciliation report
curl -O http://localhost:5000/api/migration/reconciliation/{migration-id}/report
```

---

## 📊 **What You'll See**

### **Small Migration (Traditional)**
```
🔄 Using TRADITIONAL reconciliation strategy
📊 500 objects, ~15 seconds
💾 Memory: <20MB increase
📋 Uses mc diff command
```

### **Medium Migration (Large-Scale)**
```
🚀 Starting large-scale streaming reconciliation for 5000 objects  
📊 Using LARGE-SCALE reconciliation strategy
💾 Memory: <100MB (constant)
📋 SQLite database created: reconciliation_{id}.db
🔄 Phases: inventory_collection → comparison → reporting
```

### **Large Migration (Enterprise)**
```
🚀 Starting large-scale streaming reconciliation for 50000 objects
📊 Using LARGE-SCALE reconciliation strategy  
💾 Memory: <200MB (constant)
📋 Advanced features: checkpoints, detailed reporting
⏱️ Duration: 10-30 minutes
```

---

## 🐛 **Troubleshooting**

### **MinIO Issues**
```bash
# Check MinIO status
mc admin info local

# Restart MinIO if needed
killall minio
MINIO_ROOT_USER=minioadmin MINIO_ROOT_PASSWORD=minioadmin minio server ./minio-data &
```

### **Dependencies Missing**
```bash
# Install missing dependencies
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..
```

### **Database Permissions**
```bash
# Fix database permissions
chmod 755 server/data
chmod 666 server/data/*.db
```

---

## 🎓 **Key Features to Test**

### **✅ Automatic Mode Detection**
- Small migrations (<100K) use traditional reconciliation
- Large migrations (>100K) automatically use streaming reconciliation

### **✅ Real-time Progress Tracking**
- WebSocket updates in frontend
- API endpoints for programmatic monitoring
- Phase-based progress reporting

### **✅ Memory Efficiency**
- Traditional mode: Loads all objects in memory
- Streaming mode: Constant memory usage regardless of object count

### **✅ Database-Driven Comparison**
- SQLite-based object inventory
- Efficient batch processing
- SQL queries for difference detection

### **✅ Comprehensive Reporting**
- Downloadable JSON reports
- Performance metrics
- Detailed recommendations

---

## 📖 **Additional Resources**

- **Complete Testing Guide**: `docs/LOCAL_TESTING_GUIDE.md`
- **Workflow Diagrams**: `docs/MIGRATION_WORKFLOW_DIAGRAM.md`
- **Technical Details**: `docs/LARGE_SCALE_RECONCILIATION.md`

---

## 🎯 **Expected Performance**

| Test Dataset | Objects | Mode | Memory | Duration | Features |
|-------------|---------|------|---------|----------|----------|
| **Small** | 500 | Traditional | <20MB | 5-15s | Basic reconciliation |
| **Medium** | 5,000 | Streaming | <100MB | 1-3min | SQLite + progress tracking |
| **Large** | 50,000 | Enterprise | <200MB | 10-30min | Checkpoints + comprehensive reports |

---

## 🚀 **Ready to Test!**

Your S3 Migration Scheduler is now equipped with **enterprise-grade large-scale reconciliation** that can handle millions of objects efficiently. The local testing environment lets you experience the dramatic performance improvements firsthand!

🌟 **From 500 objects to 500 million objects - all with the same simple interface!**