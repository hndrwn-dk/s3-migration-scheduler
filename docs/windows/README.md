# S3 Migration Scheduler - Windows

## 📥 Download

**[📥 Download from GitHub Releases](https://github.com/hndrwn-dk/s3-migration-scheduler/releases/latest)**

Choose your preferred option:
- **`S3 Migration Scheduler-1.0.0-win-x64.zip`** ← **Recommended**
- **`S3 Migration Scheduler-1.0.0-win-x64.exe`** (Installer with shortcuts)

## 🚀 Installation

### ZIP Package (Recommended)
1. **Extract** to any folder (e.g., `C:\Programs\S3MigrationScheduler\`)
2. **Run** `S3 Migration Scheduler.exe`
3. **Done!** No installation required

### Professional Installer
1. **Run** the `.exe` file as Administrator
2. **Follow** the installation wizard
3. **Launch** from Start Menu

## 🎯 System Requirements

- **Windows 7/8/10/11** (64-bit recommended)
- **4GB RAM** minimum, 8GB for large migrations
- **1GB disk space** + space for logs/database
- **Internet connection** for S3 access

## ⚡ Quick Start

1. **Launch** the application
2. **Add Migration**:
   - Click "Add New Migration"
   - Enter source S3 details (endpoint, credentials, bucket)
   - Enter destination S3 details
   - Test connections
3. **Configure & Start**:
   - Set migration name and options
   - Start immediately or schedule for later
   - Monitor progress in real-time

## ✨ Key Features

- **Real-time monitoring** with live progress updates
- **Advanced scheduling** with cron expressions
- **Large-scale reconciliation** for millions of objects
- **Persistent history** with SQLite database
- **Built-in MinIO client** - no dependencies
- **Professional desktop UI** with modern interface

## 📁 File Locations

**Application Files:**
S3MigrationScheduler
├── S3 Migration Scheduler.exe # Main application 
└── resources\ # App resources & MinIO client


**User Data (Persistent):**
%APPDATA%\S3MigrationScheduler
├── data\migrations.db # Migration database 
├── logs\ # Application & migration logs 
└── config\settings.json # User preferences


## 🔧 Troubleshooting

### Won't Start
- Run as Administrator
- Check Windows version (7+ required)
- Whitelist in antivirus software

### Connection Issues
- Verify S3 credentials with another tool
- Check endpoint URL format
- Test network connectivity

### Performance Issues  
- Use reconciliation for 100K+ objects
- Ensure adequate disk space
- Close other memory-intensive apps

## 🔄 Updates

1. **Download** new version from [GitHub Releases](https://github.com/hndrwn-dk/s3-migration-scheduler/releases)
2. **Close** current application
3. **Replace** files with new version
4. **User data** preserved automatically

## 🛠️ Build from Source

**Prerequisites:** Node.js 18+, Visual Studio Build Tools, Git

```powershell
git clone https://github.com/hndrwn-dk/s3-migration-scheduler.git
cd s3-migration-scheduler

# Install & build
npm install
cd client && npm install && npm run build && cd ..
cd server && npm install && cd ..
cd electron-app && npm install && npm run build:win

# Find packages in electron-app/dist/
For detailed build instructions: Windows Packaging Guide

🆘 Support
Having issues?

Check logs: %APPDATA%\S3MigrationScheduler\logs\
Report: GitHub Issues
Build problems: Troubleshooting Guide