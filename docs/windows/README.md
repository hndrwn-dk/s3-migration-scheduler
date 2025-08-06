# S3 Migration Scheduler - Windows

## 📦 Download & Install

### Quick Installation (Recommended)

1. **[📥 Download from GitHub Releases](https://github.com/hndrwn-dk/s3-migration-scheduler/releases/latest)**
2. **Choose your option:**
   - **`S3 Migration Scheduler-1.0.0-win-x64.zip`** ← **Recommended**
   - **`S3 Migration Scheduler-1.0.0-win-x64.exe`** (Installer)
3. **Extract and run** - No installation required!

### Installation Options

#### Option 1: ZIP Package (Recommended)
- **Download**: `S3 Migration Scheduler-1.0.0-win-x64.zip`
- **Extract** to your desired location (e.g., `C:\Programs\S3MigrationScheduler\`)
- **Run**: `S3 Migration Scheduler.exe`
- **Done!** No installation required

#### Option 2: Professional Installer
- **Download**: `S3 Migration Scheduler-1.0.0-win-x64.exe`
- **Run** the installer as Administrator
- **Follow** the installation wizard
- **Launch** from Start Menu or Desktop shortcut

## 🎯 System Requirements

- **OS**: Windows 7/8/10/11 (64-bit recommended)
- **RAM**: 4GB minimum, 8GB recommended for large migrations
- **Disk Space**: 1GB free space
- **Network**: Internet connection for S3 access

## 🚀 Quick Start

1. **Launch** the application
2. **Add S3 Endpoints**:
   - Click "Add New Migration"
   - Enter source S3 credentials (endpoint, access key, secret key, bucket)
   - Enter destination S3 credentials
   - Test connections
3. **Create Migration**:
   - Set migration name
   - Configure options (filters, scheduling)
   - Start immediately or schedule for later
4. **Monitor Progress** in real-time

## 🌟 Features

- **📅 Advanced Scheduling** - Cron-based automation with recurring migrations
- **📊 Real-time Monitoring** - Live progress tracking with WebSocket updates
- **🗃️ Large-scale Reconciliation** - Efficiently handles millions of objects
- **💾 Persistent History** - SQLite database stores all migration data
- **🔧 Built-in MinIO Client** - No external dependencies required
- **🖥️ Professional UI** - Modern React interface in Electron

## 📁 Application Structure

### Installed Files
```
S3MigrationScheduler\
├── S3 Migration Scheduler.exe    # Main application
├── resources\                    # Application resources
│   ├── server\                  # Backend server
│   ├── client\                  # Frontend UI
│   └── mc.exe                   # MinIO client
└── Other Electron files...
```

### User Data (Persistent)
```
%APPDATA%\S3MigrationScheduler\
├── data\
│   └── migrations.db           # Migration database
├── logs\
│   ├── app.log                # Application logs
│   └── migration-{id}.log     # Migration-specific logs
└── config\
    └── settings.json          # User preferences
```

## 🔧 Troubleshooting

### Application Won't Start
1. **Check Windows version** (Windows 7+ required)
2. **Run as Administrator** if permission issues
3. **Check antivirus** - whitelist the application
4. **Re-extract ZIP** if files seem corrupted

### Backend Server Issues
1. **Port conflict** - ensure port 5000 is available
2. **Firewall** - allow application through Windows Firewall
3. **Check logs** in `%APPDATA%\S3MigrationScheduler\logs\`

### S3 Connection Problems
1. **Verify credentials** - test with AWS CLI or another S3 client
2. **Check endpoint URL** format (e.g., `https://s3.amazonaws.com`)
3. **Network connectivity** - test internet connection
4. **Proxy settings** - configure if behind corporate proxy

### Performance Issues
1. **Large migrations** - use reconciliation feature for 100K+ objects
2. **Memory usage** - close other applications during migration
3. **Disk space** - ensure adequate free space for logs/database

## 🔄 Updates

### Automatic Updates (Future)
- Built-in update checker (planned for future versions)

### Manual Updates
1. **Download** new version from [GitHub Releases](https://github.com/hndrwn-dk/s3-migration-scheduler/releases)
2. **Close** current application
3. **Replace** files with new version
4. **User data** is preserved automatically in `%APPDATA%`

## 🛠️ Build from Source

### Prerequisites
- **Node.js** 18+
- **npm** 8+
- **Visual Studio Build Tools** (for native modules)
- **Git**

### Build Steps
```powershell
# Clone repository
git clone https://github.com/hndrwn-dk/s3-migration-scheduler.git
cd s3-migration-scheduler

# Install dependencies
npm install
cd client && npm install && npm run build && cd ..
cd server && npm install && cd ..
cd electron-app && npm install && cd ..

# Build Windows application
cd electron-app
npm run build:win

# Find packages in dist/ directory
ls dist/
```

**Detailed Build Guide**: [Windows Packaging Guide](WINDOWS_PACKAGING_GUIDE.md)

## 📋 Advanced Usage

### Command Line Options
```cmd
# Custom data directory
"S3 Migration Scheduler.exe" --user-data-dir="C:\CustomPath"

# Debug mode
"S3 Migration Scheduler.exe" --debug

# Development mode  
"S3 Migration Scheduler.exe" --dev
```

### Portable Usage
- Run from USB drive or network location
- Data stored in local `%APPDATA%` by default
- Use `--user-data-dir` to specify portable data location

### Enterprise Deployment
- Use MSI installer for group policy deployment
- Centralized configuration via shared config files
- Network storage for shared migration databases

## 🆘 Support

### Getting Help
1. **Check logs**: `%APPDATA%\S3MigrationScheduler\logs\`
2. **GitHub Issues**: [Report problems](https://github.com/hndrwn-dk/s3-migration-scheduler/issues)
3. **Documentation**: Additional guides in this directory

### Reporting Issues
Include this information:
- Windows version and architecture
- Application version
- Error message or logs
- Steps to reproduce

## 📚 Additional Resources

- **[Packaging Guide](WINDOWS_PACKAGING_GUIDE.md)** - For developers building from source
- **[Troubleshooting Guide](WINDOWS_BUILD_TROUBLESHOOTING.md)** - Common build issues
- **[Main Documentation](../../README.md)** - Complete project overview

---

**🎉 Ready to start migrating S3 buckets efficiently on Windows!**

**Download**: [GitHub Releases](https://github.com/hndrwn-dk/s3-migration-scheduler/releases/latest) | **Issues**: [GitHub Issues](https://github.com/hndrwn-dk/s3-migration-scheduler/issues)