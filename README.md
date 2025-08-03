# S3 Bucket Migration UI

A comprehensive, enterprise-grade fullstack application for S3 bucket migrations with persistent SQLite database, real-time monitoring, and detailed reconciliation tracking. Features a modern React dashboard with TypeScript, dual real-time connections (WebSocket + SSE), and comprehensive migration difference analysis.

![S3 Bucket Migration UI](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![Database](https://img.shields.io/badge/Database-SQLite-blue)
![Node.js](https://img.shields.io/badge/Node.js-18.x-green)
![React](https://img.shields.io/badge/React-18.x-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![Real-time](https://img.shields.io/badge/Real--time-WebSocket%2BSSE-orange)

## ☕ Support Me

If you find this project helpful, you can support me here:

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-yellow?style=for-the-badge&logo=buymeacoffee&logoColor=white)](https://buymeacoffee.com/hendrawan)

## 📑 Table of Contents
- [☕ Support Me](#-support-me)
- [📸 Screenshots](#-screenshots)
- [🚀 Setup & Installation](#-setup--installation)
- [🔄 Update Guide](#-update-guide)
- [🚀 Features](#-features)
- [📖 Usage Guide](#-usage-guide)
- [🏗️ Architecture](#️-architecture)
- [📚 API Reference](#-api-reference)
- [📄 License](#-license)

## 📸 Screenshots

### Dashboard Overview
*Real-time migration statistics and progress monitoring*

![Dashboard Overview](https://github.com/hndrwn-dk/s3-management-ui/blob/main/docs/images/dashboard-overview.svg?raw=true)
> 📊 **Main Dashboard** - Shows migration statistics, recent activity, and visual charts for tracking migration trends and status distribution.

### Migration Configuration
*Easy setup for S3 endpoints and connections*

![Configuration](https://github.com/hndrwn-dk/s3-management-ui/blob/main/docs/images/configuration.svg?raw=true)
> ⚙️ **Configuration Tab** - Simple interface to add and manage S3 endpoints with connection testing capabilities.

### Migration Wizard
*Step-by-step migration setup with bucket analysis*

![Migration Setup](https://github.com/hndrwn-dk/s3-management-ui/blob/main/docs/images/migration-setup.svg?raw=true)
> 🛠️ **Migration Tab** - Intuitive wizard for setting up migrations with source/destination bucket analysis and preview.

### Migration History & Tracking
*Comprehensive migration history with detailed reconciliation reports*

![Migration History](https://github.com/hndrwn-dk/s3-management-ui/blob/main/docs/images/migration-history.svg?raw=true)
> 📚 **History Tab** - Complete migration tracking with status filters, detailed reconciliation reports, and downloadable logs.

### Real-time Migration Monitoring
*Live progress tracking with detailed logs and reconciliation*

![Migration Logs](https://github.com/hndrwn-dk/s3-management-ui/blob/main/docs/images/migration-logs.svg?raw=true)
> 📊 **Logs Tab** - Real-time migration monitoring with live progress updates, detailed logs, and comprehensive reconciliation analysis.

## 🚀 Setup & Installation

### Prerequisites

- **Node.js** 18.x or higher
- **npm** 7.x or higher  
- **MinIO Client** (`mc`) installed and configured
- **Git** for cloning the repository

### Automated Setup (Recommended)

#### **🐧 Linux/MacOS**
```bash
# 1. Clone and navigate
git clone https://github.com/hndrwn-dk/s3-management-ui.git
cd s3-management-ui

# 2. Run automated setup
chmod +x scripts/00-setup-linux.sh
./scripts/00-setup-linux.sh

# 3. Fix dependencies if needed
./scripts/01-fix-dependencies.sh

# 4. Start the application
./scripts/02-start.sh
```

#### **🪟 Windows**
```batch
REM 1. Clone and navigate
git clone https://github.com/hndrwn-dk/s3-management-ui.git
cd s3-management-ui

REM 2. Run automated setup
scripts\00-setup-windows.bat

REM 3. Fix dependencies if needed
scripts\01-fix-dependencies.bat

REM 4. Start the application
scripts\02-start.bat
```

### Manual Setup (Alternative)

If automated setup fails, follow these steps:

```bash
# 1. Clone repository
git clone https://github.com/hndrwn-dk/s3-management-ui.git
cd s3-management-ui

# 2. Install root dependencies
npm install

# 3. Install server dependencies
cd server && npm install && cd ..

# 4. Install client dependencies  
cd client && npm install && cd ..

# 5. Build client for production
cd client && npm run build && cd ..

# 6. Start the application
npm start
```

### Database Initialization

The SQLite database is **automatically created** on first startup:
- **Location**: `server/data/migrations.db`
- **Auto-creation**: Database and tables created automatically
- **Persistent**: All migration data preserved between restarts

### Access the Application

Once started, access the application at:
- **Dashboard**: http://localhost:3000 (React development server)
- **API Server**: http://localhost:5000 (Express backend)

> **Note**: The setup scripts run in development mode with separate frontend (3000) and backend (5000) ports for optimal development experience.

### Initial Configuration

1. **Open the Configuration tab**
2. **Add your S3 endpoints** (AWS, MinIO, etc.)
3. **Test connections** to verify setup
4. **Start your first migration**

## 🔄 Update Guide

### 📋 How to Update While Preserving Migration Data

When updating S3 Bucket Migration UI with `git pull`, follow these steps to preserve your migration data:

> **🔒 IMPORTANT**: Your SQLite database (`server/data/migrations.db`) contains all migration history and is **NOT** committed to git. However, it will be preserved during updates if you follow this guide.

#### **🐧 Linux/MacOS Update Process**

```bash
# 1. Backup your database BEFORE git pull
./scripts/03-backup-db.sh

# 2. Update the code
git pull origin main

# 3. Update dependencies if needed
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..

# 4. Restore database if needed (optional)
./scripts/04-restore-db.sh

# 5. Start the application
./scripts/02-start.sh
```

#### **🪟 Windows Update Process**

```batch
REM 1. Backup your database BEFORE git pull
scripts\03-backup-db.bat

REM 2. Update the code
git pull origin main

REM 3. Update dependencies if needed
scripts\01-fix-dependencies.bat

REM 4. Restore database if needed (optional)
scripts\04-restore-db.bat

REM 5. Start the application
scripts\02-start.bat
```

#### **🗄️ Database Backup Features**

- ✅ **Timestamped backups**: Each backup has a unique timestamp
- ✅ **Automatic cleanup**: Keeps only the last 10 backups
- ✅ **Size reporting**: Shows backup file size
- ✅ **Safe operation**: Never overwrites existing backups

**Backup Location:**
```
database-backups/
├── migrations_backup_20240801_143022.db
├── migrations_backup_20240801_142055.db
└── migrations_backup_20240801_141234.db
```

#### **🚨 Quick Recovery (If You Forgot to Backup)**

If you already ran `git pull` and your data seems missing:

1. **Check if database exists:**
   ```bash
   # Linux/MacOS: ls -la server/data/migrations.db
   # Windows: dir server\data\migrations.db
   ```

2. **If database exists**: Your data is still there! Just restart the application.

3. **If database missing**: Check for existing backups and restore:
   ```bash
   # Linux/MacOS: ./scripts/04-restore-db.sh
   # Windows: scripts\04-restore-db.bat
   ```

#### **💡 Best Practices**

- **Always backup before updates**: `./scripts/03-backup-db.sh && git pull`
- **Regular backups**: Run backup script periodically
- **Verify after update**: Check migration data in Dashboard/History
- **Test functionality**: Run a small test migration after update

For detailed update instructions and troubleshooting, see: **[📖 UPDATE_GUIDE.md](UPDATE_GUIDE.md)**

## 🚀 Features

### Dashboard & Monitoring
- 📊 **Real-time migration statistics** with live updates
- 📈 **Interactive charts** for progress tracking
- 🔄 **Recent migration activity** with status indicators
- 📱 **Responsive design** for mobile and desktop

### Migration Management
- 🚀 **Automated S3 migrations** with comprehensive options
- 🔍 **Bucket content analysis** before migration
- ⚙️ **Flexible migration options** (overwrite, preserve, exclude patterns)
- 🛡️ **Dry-run mode** for safe testing
- 🔁 **Retry mechanisms** for failed transfers

### Real-time Monitoring
- 🔌 **Dual connection system** (WebSocket + Server-Sent Events)
- 📺 **Live progress updates** during migration
- 📊 **Real-time statistics** (objects transferred, speed, ETA)
- 🔔 **Instant status notifications**

### Comprehensive Reconciliation
- 🔍 **Post-migration verification** with detailed analysis
- 📋 **Missing file detection** with source/destination comparison
- 📊 **Size difference analysis** with byte-level accuracy
- 📄 **Detailed reconciliation reports** with downloadable logs
- 🔄 **File-by-file comparison** for complete accuracy

### Data Persistence & History
- 🗄️ **SQLite database** for reliable data storage
- 📚 **Complete migration history** with filtering options
- 🔍 **Advanced search and filtering** by status, date, source/destination
- 📊 **Historical statistics** and trend analysis
- 💾 **Data backup and restore** functionality

## 📖 Usage Guide

### 1. Configure S3 Endpoints

Start by adding your S3 endpoints in the **Configuration** tab:

```bash
# Example MinIO endpoints
Source: source-aws (AWS S3)
Destination: target-aws (MinIO Server)
```

### 2. Set Up Migration

In the **Migrate** tab:
1. **Select source and destination** buckets
2. **Configure migration options** (overwrite, preserve metadata, etc.)
3. **Run bucket analysis** to preview migration
4. **Start migration** with real-time monitoring

### 3. Monitor Progress

Use the **Logs** tab to:
- **Monitor live progress** with real-time updates
- **View detailed logs** of the migration process
- **Track file-by-file transfers**
- **Monitor error messages** and resolution

### 4. Review Results

After migration completion:
- **Check Dashboard** for updated statistics
- **Review History** for detailed migration records
- **Open Reconciliation Report** for difference analysis
- **Download logs** for archival or troubleshooting

## 🏗️ Architecture

### Technology Stack
- **Frontend**: React 18 with TypeScript
- **Backend**: Node.js with Express
- **Database**: SQLite with better-sqlite3
- **Real-time**: WebSocket + Server-Sent Events
- **Storage**: MinIO Client for S3 operations

### Project Structure
```
s3-management-ui/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── services/       # API and WebSocket services
│   │   └── types/          # TypeScript type definitions
├── server/                 # Node.js backend application
│   ├── routes/             # Express API routes
│   ├── services/           # Business logic services
│   └── data/               # SQLite database storage
├── scripts/                # Automation scripts
└── docs/                   # Documentation and guides
```

### Key Components

#### Backend Services
- **MinIO Client Service**: Handles S3 operations and migrations
- **Database Service**: SQLite operations and data persistence
- **WebSocket Service**: Real-time communication
- **SSE Service**: Server-Sent Events fallback

#### Frontend Components
- **Dashboard**: Main statistics and overview
- **Migration Wizard**: Step-by-step migration setup
- **History Manager**: Migration tracking and filtering
- **Logs Viewer**: Real-time monitoring and log analysis

## 📚 API Reference

### Base URL
```
http://localhost:5000/api
```

### Endpoints

#### Migrations
```bash
GET    /migration              # Get all migrations
GET    /migration/:id          # Get specific migration
POST   /migration              # Start new migration
DELETE /migration/:id          # Cancel migration
GET    /migration/:id/logs     # Get migration logs
```

#### Real-time
```bash
GET    /migration/events       # Server-Sent Events stream
```

### Example API Response
```json
{
  "success": true,
  "data": {
    "id": "ace7d551-c1f3-4c61-9d88-4c04d6e777b5",
    "config": {
      "source": "source-aws/awssourcebucket202",
      "destination": "target-aws/awstargetbucket502"
    },
    "sourceBucket": "awssourcebucket202",
    "destinationBucket": "awstargetbucket502",
    "status": "completed_with_differences",
    "progress": 100,
    "stats": {
      "totalObjects": 161,
      "transferredObjects": 165,
      "totalSize": 2621443910,
      "transferredSize": 2806998464
    }
  }
}
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Built with ❤️ for efficient S3 management and migration**