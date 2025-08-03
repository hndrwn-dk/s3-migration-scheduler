# 🚀 S3 Management UI - Complete Setup Guide

## 📋 Quick Start Checklist

### ✅ Prerequisites Verification
Before starting, ensure you have:
- **Node.js** 18.x or higher (`node --version`)
- **npm** 8.x or higher (`npm --version`)  
- **MinIO Client** (`mc --version`)
- **Git** for repository cloning

### ✅ 1. Download & Install Dependencies

```bash
# Clone the repository
git clone https://github.com/hndrwn-dk/s3-migration-scheduler.git
cd s3-migration-scheduler

# Method 1: Use automated setup scripts (RECOMMENDED)
scripts/00-setup-linux.sh    # Linux/MacOS
# OR
scripts\00-setup-windows.bat # Windows

# Method 2: Manual installation
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..

# OR use the root script
npm run install:all
```

**⚠️ Critical**: Make sure `better-sqlite3` is installed properly:
```bash
cd server && npm list better-sqlite3
# Should show: better-sqlite3@12.2.0
```

### ✅ 2. Configure Environment

```bash
# Copy and configure server environment
cp server/.env.example server/.env

# Edit server/.env with your settings:
# PORT=5000
# CORS_ORIGIN=http://localhost:3000
# MIGRATION_LOGS_DIR=./logs
# DATABASE_PATH=./data/migrations.db  # Auto-created
```

### ✅ 3. Configure MinIO Client

```bash
# Add your S3 endpoints (required for bucket operations)
mc alias set source-s3 https://s3.amazonaws.com ACCESS_KEY SECRET_KEY
mc alias set dest-s3 https://your-minio.com ACCESS_KEY SECRET_KEY

# Test connectivity
mc ls source-s3
mc ls dest-s3
```

### ✅ 4. Start the Application

```bash
# Method 1: Use automated start script (RECOMMENDED)
scripts/02-start.sh           # Linux/MacOS  
# OR
scripts\02-start.bat          # Windows

# Method 2: Manual start
npm run dev                   # Start both server and client

# OR start separately:
# Terminal 1: npm run server:dev
# Terminal 2: npm run client:start
```

## 🗄️ SQLite Database - Auto-Initialization

### Database Creation (Automatic)
The SQLite database is **automatically created** when the server starts:

```
📁 server/
├── data/
│   └── migrations.db     # ✅ Auto-created on first run
├── services/
│   └── database.js       # Handles schema creation
└── logs/                 # Migration log files
```

### Schema Auto-Creation
On first startup, the database service will:

1. **Create `server/data/` directory** if it doesn't exist
2. **Initialize `migrations.db`** SQLite database
3. **Create tables automatically**:
   ```sql
   CREATE TABLE migrations (
     id TEXT PRIMARY KEY,
     config_source TEXT NOT NULL,
     config_destination TEXT NOT NULL,
     status TEXT NOT NULL DEFAULT 'starting',
     progress INTEGER DEFAULT 0,
     start_time TEXT NOT NULL,
     -- ... 20+ fields for comprehensive tracking
   );
   
   CREATE TABLE migration_logs (
     migration_id TEXT NOT NULL,
     timestamp TEXT NOT NULL,
     level TEXT NOT NULL,
     message TEXT NOT NULL,
     FOREIGN KEY (migration_id) REFERENCES migrations (id)
   );
   ```

4. **Import existing JSON data** (if any) for backward compatibility
5. **Ready for migrations!**

## 🔧 Troubleshooting Common Issues

### Issue 1: "Cannot find module 'better-sqlite3'"

**Solution:**
```bash
# Method 1: Use dependency fix script (RECOMMENDED)
scripts/01-fix-dependencies.sh    # Linux/MacOS
# OR  
scripts\01-fix-dependencies.bat   # Windows

# Method 2: Manual fix
cd server
npm install better-sqlite3
npm list better-sqlite3  # Verify installation
```

### Issue 2: "UI shown as disconnected"

**Causes & Solutions:**

1. **Server not running**:
   ```bash
   # Check if server is running on port 5000
   curl http://localhost:5000/api/health
   # Should return: {"status": "OK"}
   ```

2. **Wrong environment configuration**:
   ```bash
   # Check server/.env
   PORT=5000
   CORS_ORIGIN=http://localhost:3000
   ```

3. **MinIO client not configured**:
   ```bash
   # Test MinIO connectivity
   mc --version
   mc ls source-s3  # Should list buckets
   ```

### Issue 3: "Failed to check MinIO healthy"

**Solution:**
```bash
# Install MinIO client (if missing)
# Linux/MacOS:
curl https://dl.min.io/client/mc/release/linux-amd64/mc \
  -o /usr/local/bin/mc && chmod +x /usr/local/bin/mc

# Windows:
# Download from: https://dl.min.io/client/mc/release/windows-amd64/mc.exe

# Configure endpoints
mc alias set myhost https://your-minio-server ACCESS_KEY SECRET_KEY
```

### Issue 4: Database Permission Issues

**Solution:**
```bash
# Ensure proper permissions for database directory
chmod 755 server/data/
chmod 644 server/data/migrations.db  # If exists
```

## 📊 Verifying Installation

### 1. Check Server Status
```bash
# Server health check
curl http://localhost:5000/api/health
# Expected: {"status": "OK", "timestamp": "..."}

# Migration endpoint
curl http://localhost:5000/api/migration/status
# Expected: {"success": true, "data": {...stats...}}
```

### 2. Check Database Initialization
```bash
# Database should be created automatically
ls -la server/data/migrations.db

# Check server logs for:
# "📀 SQLite database initialized: /path/to/migrations.db"
```

### 3. Check Real-time Connections
1. **Open http://localhost:3000**
2. **Check connection status** in header:
   - ✅ "Connected (WebSocket)" - Primary connection active
   - ✅ "Connected (SSE)" - Fallback connection active
   - ❌ "Disconnected" - Check server logs

### 4. Test Migration Flow
1. **Go to Configure tab** → Set up S3 endpoints
2. **Go to Migrate tab** → Start a test migration
3. **Check Dashboard** → Should show real-time statistics
4. **Check History** → Should persist migration data
5. **Check Logs** → Should show migration details

## 🎯 Expected Behavior After Setup

### ✅ Dashboard Features
- **Real-time statistics** from SQLite database
- **Accurate completion rates** (no more 0% success rate)
- **Recent activity tracking** (last 24 hours)
- **Persistent data** across server restarts

### ✅ Connection Indicators
- **Primary**: WebSocket connection (low latency)
- **Fallback**: Server-Sent Events (automatic failover)
- **Status**: Visual indicators showing active connection type

### ✅ Data Persistence
- **Migration history** survives server restarts
- **Detailed reconciliation** for "completed_with_differences"
- **Comprehensive logging** with database backup
- **Consistent UI** across all components

## 📁 Directory Structure After Setup

```
s3-migration-scheduler/
├── package.json                 # Root dependencies
├── server/
│   ├── .env                    # ✅ Environment configuration
│   ├── data/
│   │   └── migrations.db       # ✅ Auto-created SQLite database
│   ├── logs/                   # Migration log files
│   ├── services/
│   │   ├── database.js         # SQLite service
│   │   ├── minioClient.js      # MinIO + DB integration
│   │   └── websocket.js        # Real-time connections
│   └── node_modules/           # ✅ Server dependencies
├── client/
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── services/
│   │   │   ├── api.ts         # API client
│   │   │   ├── websocket.ts   # WebSocket client
│   │   │   └── sse.ts         # SSE client
│   │   └── types/             # TypeScript definitions
│   └── node_modules/          # ✅ Client dependencies
└── scripts/                   # Setup automation scripts
    ├── 00-setup-linux.sh      # Initial setup (Linux/MacOS)
    ├── 00-setup-windows.bat   # Initial setup (Windows)
    ├── 01-fix-dependencies.*  # Dependency troubleshooting  
    ├── 02-start.*             # Application startup
    └── README.md              # Script documentation
```

## 🚀 Quick Commands Reference

```bash
# Full setup from scratch (RECOMMENDED)
git clone https://github.com/hndrwn-dk/s3-migration-scheduler.git
cd s3-migration-scheduler
scripts/00-setup-linux.sh     # Linux/MacOS (or scripts\00-setup-windows.bat for Windows)
cp server/.env.example server/.env
# Edit server/.env with your settings
scripts/02-start.sh     # Linux/MacOS (or scripts\02-start.bat for Windows)

# Alternative manual commands
npm run dev              # Start both server & client
npm run server:dev       # Server only (with nodemon)
npm run client:start     # Client only

# Troubleshooting
scripts/01-fix-dependencies.sh  # Fix dependency issues
# OR scripts\01-fix-dependencies.bat for Windows

# Production
npm run build           # Build client for production
npm run start          # Start production server

# Maintenance
npm run server:logs     # View server logs
ls server/data/        # Check database file
mc --version          # Verify MinIO client
```

## 🎉 Success Indicators

When everything is working correctly, you should see:

1. **Server Console**:
   ```
   📀 SQLite database initialized: /path/to/migrations.db
   🚀 Server running on port 5000
   🔌 WebSocket server initialized
   📡 SSE endpoint ready at /api/migration/stream
   ```

2. **Client Browser**:
   ```
   http://localhost:3000
   Header: "Connected (WebSocket)" or "Connected (SSE)"
   Dashboard: Shows accurate migration statistics
   ```

3. **Database File**:
   ```bash
   ls -la server/data/migrations.db
   # Should exist and have recent timestamp
   ```

Now your S3 Management UI is ready with enterprise-grade SQLite persistence, dual real-time connectivity, and comprehensive migration tracking! 🎯

## 📝 Using the Existing Scripts

The repository includes automated scripts for easy setup and maintenance:

### **00-setup** (Initial Setup)
- `scripts/00-setup-linux.sh` (Linux/MacOS)
- `scripts\00-setup-windows.bat` (Windows)
- **Purpose**: Installs all dependencies (root, server, client)
- **Usage**: Run once after cloning the repository

### **01-fix-dependencies** (Troubleshooting)
- `scripts/01-fix-dependencies.sh` (Linux/MacOS)  
- `scripts\01-fix-dependencies.bat` (Windows)
- **Purpose**: Fixes missing or corrupted dependencies
- **Usage**: Run when you get "Cannot find module" errors

### **02-start** (Application Startup)
- `scripts/02-start.sh` (Linux/MacOS)
- `scripts\02-start.bat` (Windows)  
- **Purpose**: Starts both server and client applications
- **Usage**: Run to start the complete application

### **Recommended Workflow:**
```bash
# 1. Clone and setup
git clone https://github.com/hndrwn-dk/s3-migration-scheduler.git
cd s3-migration-scheduler

# 2. Initial setup (run once)
scripts/00-setup-linux.sh    # Linux/MacOS
# OR
scripts\00-setup-windows.bat # Windows

# 3. Configure environment  
cp server/.env.example server/.env
# Edit server/.env with your settings

# 4. Start application
scripts/02-start.sh          # Linux/MacOS
# OR  
scripts\02-start.bat         # Windows

# 5. If you encounter issues, run:
scripts/01-fix-dependencies.sh    # Linux/MacOS
# OR
scripts\01-fix-dependencies.bat   # Windows
```