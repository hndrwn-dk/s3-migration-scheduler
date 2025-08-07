# S3 Migration Scheduler - Windows

## 📥 Download

**[📥 Download from GitHub Releases](https://github.com/hndrwn-dk/s3-migration-scheduler/releases/latest)**

Choose your preferred package format:

### 🎯 **Recommended: ZIP Package**
- **x64**: `S3 Migration Scheduler-1.0.0-win-x64.zip` (~151MB)
- **x86**: `S3 Migration Scheduler-1.0.0-win-ia32.zip` (~138MB)

### 📦 **Professional Installer (NSIS)**
- **x64**: `S3 Migration Scheduler-1.0.0-win-x64.exe` (~114MB)
- **x86**: `S3 Migration Scheduler-1.0.0-win-ia32.exe` (~104MB)

### 🎪 **Portable Executable**
- **x64**: `S3 Migration Scheduler-1.0.0-portable-x64.exe` (~113MB)
- **x86**: `S3 Migration Scheduler-1.0.0-portable-ia32.exe` (~104MB)
- **Universal**: `S3 Migration Scheduler-1.0.0-portable.exe` (~217MB)

## 🚀 Installation

### ZIP Package (Recommended)
```powershell
# 1. Download ZIP file
# 2. Extract to any folder
# Example: C:\Programs\S3MigrationScheduler\

# 3. Run the application
& "C:\Programs\S3MigrationScheduler\S3 Migration Scheduler.exe"
```

**Benefits:**
- ✅ No installation required
- ✅ Portable - can be moved anywhere
- ✅ No registry changes
- ✅ Easy to update

### Professional Installer
```powershell
# 1. Download .exe installer
# 2. Run as Administrator
# 3. Follow installation wizard
# 4. Launch from Start Menu
```

**Benefits:**
- ✅ Desktop shortcut created
- ✅ Start Menu integration
- ✅ Add/Remove Programs entry
- ✅ Professional deployment

### Portable Executable
```powershell
# 1. Download portable .exe
# 2. Run directly - no installation needed
# 3. Self-contained application
```

**Benefits:**
- ✅ Single file deployment
- ✅ No extraction needed
- ✅ Self-contained
- ✅ USB stick friendly

## 🎯 System Requirements

- **OS**: Windows 7/8/10/11 (64-bit recommended)
- **RAM**: 4GB minimum, 8GB for large migrations
- **Disk**: 1GB free space + space for logs/database
- **Network**: Internet connection for S3 access
- **.NET**: Not required (standalone application)

**Architecture Support:**
- **x64**: Intel/AMD 64-bit processors (recommended)
- **x86**: 32-bit processors (legacy systems)

## ⚡ Quick Start

1. **Download** your preferred package format
2. **Install/Extract** using instructions above
3. **Launch** the application
4. **Add Migration**:
   - Click "Add New Migration"
   - Enter source S3 details (endpoint, credentials, bucket)
   - Enter destination S3 details
   - Test connections ✅
5. **Configure & Start**:
   - Set migration name and options
   - Start immediately or schedule for later
   - Monitor progress in real-time 📊

## ✨ Key Features

- **Real-time monitoring** with live progress updates
- **Advanced scheduling** with cron expressions
- **Large-scale reconciliation** for millions of objects
- **Persistent database** with SQLite (local storage)
- **Built-in MinIO client** - no external dependencies
- **Professional Windows UI** with native desktop integration
- **Background processing** with system tray support
- **Detailed logging** for troubleshooting and auditing

## 📁 File Locations

### Application Files (ZIP/Portable)
```
S3MigrationScheduler\
├── S3 Migration Scheduler.exe    # Main application
├── resources\
│   ├── app.asar                  # Application code
│   ├── server\                   # Backend Node.js server
│   ├── client\                   # Frontend React app
│   └── mc.exe                    # MinIO client
└── ...                           # Electron runtime files
```

### Application Files (Installed)
```
C:\Program Files\S3 Migration Scheduler\
├── S3 Migration Scheduler.exe
├── resources\
└── Uninstall S3 Migration Scheduler.exe
```

### User Data (All Installation Types)
```
%APPDATA%\S3MigrationScheduler\
├── data\
│   └── migrations.db           # SQLite database
├── logs\
│   ├── app.log                # Application logs
│   └── migration-{id}.log     # Migration-specific logs
└── config\
    └── settings.json          # User preferences
```

### System Integration (Installer Only)
```powershell
%USERPROFILE%\Desktop\         # Desktop shortcut
%APPDATA%\Microsoft\Windows\Start Menu\Programs\  # Start Menu
```

## 🔧 Troubleshooting

### Application Won't Start
```powershell
# Check if running as Administrator is needed
# Right-click > "Run as administrator"

# Check Windows version compatibility
systeminfo | findstr "OS Name"

# Temporarily disable antivirus/Windows Defender
# Add application folder to exclusions
```

### Connection Issues
```powershell
# Test S3 connectivity manually
ping s3.amazonaws.com

# Check endpoint URL format
# Example: https://s3.amazonaws.com
# Example: http://minio.local:9000

# Verify credentials with AWS CLI
aws s3 ls s3://your-bucket-name
```

### Performance Issues
```powershell
# Check available RAM
wmic computersystem get TotalPhysicalMemory

# Check disk space
dir C:\ | findstr "bytes free"

# Close memory-intensive applications
taskmgr
```

### Backend Server Issues
```powershell
# Check if port 5000 is available
netstat -an | findstr :5000

# Kill conflicting processes
netstat -ano | findstr :5000
taskkill /PID <process_id> /F
```

### Database Issues
```powershell
# Check database file location
dir "%APPDATA%\S3MigrationScheduler\data\migrations.db"

# Reset database (backup first!)
ren "%APPDATA%\S3MigrationScheduler\data\migrations.db" "migrations.db.backup"
```

## 🔄 Updates

### ZIP/Portable Updates
1. **Download** new version from [GitHub Releases](https://github.com/hndrwn-dk/s3-migration-scheduler/releases)
2. **Close** current application completely
3. **Backup** configuration: `%APPDATA%\S3MigrationScheduler\`
4. **Replace** application folder with new version
5. **User data** preserved automatically in `%APPDATA%`

### Installer Updates
1. **Download** new installer
2. **Run** new installer (will upgrade automatically)
3. **User data** preserved during upgrade

## 🛠️ Build from Source

**Prerequisites:**
- Node.js 18+
- Visual Studio Build Tools (for better-sqlite3)
- Git

**Quick Build:**
```powershell
git clone https://github.com/hndrwn-dk/s3-migration-scheduler.git
cd s3-migration-scheduler

# Install & build all components
npm install
cd client && npm install && npm run build && cd ..
cd server && npm install && cd ..
cd electron-app && npm install && npm run build:win

# Find packages in electron-app\dist\
dir electron-app\dist\
```

**For detailed build instructions:** [Windows Build Guide](BUILD.md)

## 🎯 Advanced Configuration

### Environment Variables
```powershell
# Custom data directory
$env:S3_MIGRATION_DATA_DIR = "D:\S3MigrationData"

# Debug mode
$env:DEBUG = "true"

# Custom port (if 5000 conflicts)
$env:PORT = "8080"

# Run with custom settings
$env:S3_MIGRATION_DATA_DIR = "D:\CustomData"
& "S3 Migration Scheduler.exe"
```

### Command Line Options
```powershell
# Start minimized to system tray
& "S3 Migration Scheduler.exe" --minimized

# Start with specific data directory
& "S3 Migration Scheduler.exe" --data-dir="D:\S3Data"

# Enable debug mode
& "S3 Migration Scheduler.exe" --debug
```

### Windows Service (Advanced)
```powershell
# Install as Windows Service (requires admin)
# Note: Use with caution, mainly for server deployments

# Create service wrapper script
nssm install "S3MigrationScheduler" "C:\Path\To\S3 Migration Scheduler.exe"
nssm set "S3MigrationScheduler" DisplayName "S3 Migration Scheduler Service"
nssm set "S3MigrationScheduler" Description "S3 bucket migration and scheduling service"
nssm start "S3MigrationScheduler"
```

## 🔐 Security Considerations

### Windows Defender / Antivirus
- **Add exclusion** for application folder
- **Allow network access** for S3 connections
- **Trust the application** if flagged (false positive common with Electron apps)

### Firewall Configuration
```powershell
# Allow through Windows Firewall (if needed)
netsh advfirewall firewall add rule name="S3 Migration Scheduler" dir=in action=allow program="C:\Path\To\S3 Migration Scheduler.exe"
```

### Data Security
- **Credentials** stored locally in encrypted format
- **Database** stored in user's AppData (isolated per user)
- **Logs** may contain sensitive information - secure access appropriately

## 🆘 Support

### Log Files
```powershell
# Application logs
notepad "%APPDATA%\S3MigrationScheduler\logs\app.log"

# Migration-specific logs
dir "%APPDATA%\S3MigrationScheduler\logs\migration-*.log"

# Windows Event Viewer (for system-level issues)
eventvwr.msc
```

### System Information for Support
```powershell
# Gather system info for bug reports
systeminfo > systeminfo.txt
dxdiag /t dxdiag.txt

# Application version info
& "S3 Migration Scheduler.exe" --version
```

### Common Issues Resolution
1. **App won't start**: Check permissions, run as administrator
2. **Connection fails**: Verify S3 credentials and network connectivity
3. **Slow performance**: Increase RAM, use SSD, close other apps
4. **Port conflicts**: Change port in environment variables
5. **Database corruption**: Restore from backup or reset database

### Getting Help
- **GitHub Issues**: [Report problems](https://github.com/hndrwn-dk/s3-migration-scheduler/issues)
- **Logs**: Always include relevant log files with issue reports
- **System Info**: Provide Windows version, architecture, and error details

---

**🎉 Ready to migrate S3 buckets on Windows!**

**[Download Now](https://github.com/hndrwn-dk/s3-migration-scheduler/releases/latest)** | **[Report Issues](https://github.com/hndrwn-dk/s3-migration-scheduler/issues)** | **[Docker Alternative](../docker/)**
