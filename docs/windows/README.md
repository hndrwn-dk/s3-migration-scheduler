# S3 Migration Scheduler - Windows Installation Guide

## 📦 Quick Installation

### Option 1: ZIP Package (Recommended)
1. **Download** `S3 Migration Scheduler-1.0.0-win-x64.zip` from [GitHub Releases](https://github.com/hndrwn-dk/s3-migration-scheduler/releases)
2. **Extract** the ZIP file to your desired location (e.g., `C:\Programs\S3MigrationScheduler\`)
3. **Run** `S3 Migration Scheduler.exe`
4. **Done!** No additional installation required

### Option 2: Professional Installer
1. **Download** `S3 Migration Scheduler-1.0.0-win-x64.exe` from [GitHub Releases](https://github.com/hndrwn-dk/s3-migration-scheduler/releases)
2. **Run** the installer as Administrator
3. **Follow** the installation wizard
4. **Launch** from Start Menu or Desktop shortcut

### Option 3: Portable App
1. **Download** `S3 Migration Scheduler-1.0.0-portable-x64.exe` from [GitHub Releases](https://github.com/hndrwn-dk/s3-migration-scheduler/releases)
2. **Run** directly from any location
3. **No installation** required - perfect for USB drives

## 🎯 System Requirements

### Minimum Requirements
- **OS**: Windows 7/8/10/11
- **Architecture**: 64-bit (recommended) or 32-bit
- **RAM**: 4GB minimum, 8GB recommended
- **Disk Space**: 1GB free space
- **Network**: Internet connection for S3 access

### Recommended Setup
- **OS**: Windows 10/11 64-bit
- **RAM**: 8GB+ for large migrations
- **SSD**: For better database performance
- **Stable Network**: For reliable S3 transfers

## 🚀 First-Time Setup

### 1. Launch the Application
- **ZIP/Installer**: Run `S3 Migration Scheduler.exe`
- **Portable**: Run `S3 Migration Scheduler-1.0.0-portable-x64.exe`

### 2. Configure S3 Endpoints
1. **Click** "Add New Migration"
2. **Enter Source S3 Details**:
   - Endpoint URL (e.g., `s3.amazonaws.com`)
   - Access Key ID
   - Secret Access Key
   - Bucket Name
3. **Enter Destination S3 Details**:
   - Endpoint URL
   - Access Key ID  
   - Secret Access Key
   - Bucket Name
4. **Test Connection** to verify credentials

### 3. Create Your First Migration
1. **Set Migration Name** (e.g., "Production to Backup")
2. **Configure Options**:
   - Object filters (optional)
   - Scheduling (immediate or cron)
   - Reconciliation settings
3. **Start Migration** or **Schedule** for later

## 🛠️ Features Overview

### Real-time Monitoring
- **Live Progress** tracking with WebSocket updates
- **Transfer Statistics** (speed, objects, size)
- **Error Reporting** with detailed logs
- **Estimated Time** remaining

### Advanced Scheduling
- **Cron-based** scheduling (e.g., daily, weekly)
- **One-time** migrations
- **Recurring** migrations with customizable intervals
- **Timezone** support

### Large-Scale Reconciliation
- **Handles millions** of objects efficiently
- **Streaming inventory** collection (low memory usage)
- **Database-driven** comparison for speed
- **Detailed reports** on differences

### Data Management
- **SQLite Database** stores all migration history
- **User Data Location**: `%APPDATA%\S3MigrationScheduler\`
- **Logs Directory**: `%APPDATA%\S3MigrationScheduler\logs\`
- **Export/Import** migration configurations

## 📁 File Locations

### Application Files (ZIP/Portable)
```
S3MigrationScheduler\
├── S3 Migration Scheduler.exe    (Main application)
├── resources\                    (Application resources)
│   ├── server\                  (Backend server)
│   ├── client\                  (Frontend UI)
│   └── mc.exe                   (MinIO client)
└── other electron files...
```

### User Data Directory
```
%APPDATA%\S3MigrationScheduler\
├── data\
│   └── migrations.db           (Migration database)
├── logs\
│   ├── app.log                (Application logs)
│   └── migration-{id}.log     (Migration-specific logs)
└── config\
    └── settings.json          (User preferences)
```

## 🔧 Troubleshooting

### Application Won't Start
1. **Check Windows version** (Windows 7+ required)
2. **Run as Administrator** if permission issues
3. **Check antivirus** - whitelist the application
4. **Verify extraction** - re-extract ZIP if corrupted

### Backend Server Issues
1. **Port conflict** - ensure port 5000 is available
2. **Firewall** - allow application through Windows Firewall
3. **Check logs** in `%APPDATA%\S3MigrationScheduler\logs\`

### S3 Connection Problems
1. **Verify credentials** - test with AWS CLI or MinIO client
2. **Check endpoint URL** format (https://s3.amazonaws.com)
3. **Network connectivity** - test internet connection
4. **Proxy settings** - configure if behind corporate proxy

### Performance Issues
1. **Large migrations** - use reconciliation for 100K+ objects
2. **Memory usage** - close other applications during migration
3. **Disk space** - ensure adequate free space for logs/database

## 🔄 Updates

### Manual Updates
1. **Download** new version from GitHub Releases
2. **Close** current application
3. **Replace** files with new version
4. **User data** is preserved automatically

### Automatic Updates (Future)
- Built-in update checker (planned)
- Seamless updates with data preservation

## 📋 Advanced Usage

### Command Line Options
```bash
# Open application in development mode
"S3 Migration Scheduler.exe" --dev

# Custom data directory
"S3 Migration Scheduler.exe" --user-data-dir="C:\CustomPath"

# Debug mode with verbose logging
"S3 Migration Scheduler.exe" --debug
```

### Batch Operations
- **Import** multiple migration configurations
- **Export** settings for backup/sharing
- **Bulk schedule** multiple migrations
- **API access** for automation (advanced users)

## 🆘 Support

### Getting Help
1. **Check logs** in `%APPDATA%\S3MigrationScheduler\logs\`
2. **GitHub Issues**: [Report problems](https://github.com/hndrwn-dk/s3-migration-scheduler/issues)
3. **Documentation**: Additional guides in `/docs/windows/`

### Reporting Issues
Include this information:
- Windows version and architecture
- Application version
- Error message or description
- Log files (if applicable)
- Steps to reproduce

## 📚 Additional Resources

- **[Windows Packaging Guide](WINDOWS_PACKAGING_GUIDE.md)** - For developers
- **[Build Troubleshooting](WINDOWS_BUILD_TROUBLESHOOTING.md)** - Build issues
- **[Desktop Installation](DESKTOP_INSTALLATION.md)** - Detailed setup guide

---

**Need help?** Open an issue on [GitHub](https://github.com/hndrwn-dk/s3-migration-scheduler/issues) or check our documentation!