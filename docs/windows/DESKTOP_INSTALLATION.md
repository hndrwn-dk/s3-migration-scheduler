# 💻 Desktop Installation Guide

This guide provides instructions for installing and using the S3 Migration Scheduler desktop applications on Windows and Linux systems.

## 📦 Available Packages

The S3 Migration Scheduler is available in multiple formats to suit different deployment scenarios:

### Windows Packages
- **Installer (.exe)** - Full Windows installation with Start Menu integration
- **Portable (.exe)** - Single executable, no installation required
- **ZIP Archive** - Extractable package for manual deployment
- **Script Package** - Node.js-based portable version

### Linux Packages
- **AppImage** - Universal Linux application, works on most distributions
- **DEB Package** - For Debian/Ubuntu and derivatives
- **RPM Package** - For RedHat/CentOS/Fedora and derivatives
- **TAR.GZ Archive** - Extractable package for manual deployment
- **Script Package** - Node.js-based portable version

## 🖥️ Windows Installation

### Option 1: Windows Installer (Recommended)

1. **Download** the latest `S3-Migration-Scheduler-Setup.exe` from the releases page
2. **Run** the installer as Administrator (right-click → "Run as administrator")
3. **Follow** the installation wizard:
   - Choose installation directory (default: `C:\Program Files\S3 Migration Scheduler`)
   - Select additional tasks (desktop shortcut, start menu entry)
   - Complete the installation
4. **Launch** from Start Menu or desktop shortcut

**Features:**
- ✅ Automatic updates
- ✅ Windows integration (Start Menu, shortcuts)
- ✅ Uninstaller included
- ✅ File associations (optional)

### Option 2: Windows Portable

1. **Download** the latest `S3-Migration-Scheduler-Portable.exe`
2. **Create** a folder for the application (e.g., `C:\S3MigrationScheduler`)
3. **Move** the executable to the folder
4. **Double-click** to run

**Features:**
- ✅ No installation required
- ✅ Runs from any location
- ✅ Ideal for USB drives or restricted environments
- ❌ No Windows integration

### Option 3: Windows Script Package

**Requirements:** Node.js 16+ installed

1. **Download** and extract `S3-Migration-Scheduler-Portable-Windows.zip`
2. **Open** Command Prompt in the extracted folder
3. **Run** `Start-S3-Migration-Scheduler.bat`
4. **Wait** for dependencies to install (first run only)
5. **Access** the application at http://localhost:5000

## 🐧 Linux Installation

### Option 1: AppImage (Recommended for most users)

1. **Download** the latest `S3-Migration-Scheduler.AppImage`
2. **Make executable**:
   ```bash
   chmod +x S3-Migration-Scheduler.AppImage
   ```
3. **Run** the application:
   ```bash
   ./S3-Migration-Scheduler.AppImage
   ```

**Optional Desktop Integration:**
```bash
# Install AppImageLauncher for automatic integration, or manually:
mkdir -p ~/.local/share/applications
cp S3-Migration-Scheduler.AppImage ~/.local/bin/
# Create desktop file (see script package for example)
```

### Option 2: DEB Package (Ubuntu/Debian)

1. **Download** the latest `.deb` package
2. **Install** using package manager:
   ```bash
   sudo dpkg -i s3-migration-scheduler_1.0.0_amd64.deb
   sudo apt-get install -f  # Fix dependencies if needed
   ```
3. **Launch** from applications menu or:
   ```bash
   s3-migration-scheduler
   ```

### Option 3: RPM Package (RedHat/CentOS/Fedora)

1. **Download** the latest `.rpm` package
2. **Install** using package manager:
   ```bash
   # Fedora/RHEL 8+
   sudo dnf install s3-migration-scheduler-1.0.0.x86_64.rpm
   
   # CentOS/RHEL 7
   sudo yum install s3-migration-scheduler-1.0.0.x86_64.rpm
   ```
3. **Launch** from applications menu or terminal

### Option 4: TAR.GZ Archive

1. **Download** and extract the archive:
   ```bash
   tar -xzf S3-Migration-Scheduler-linux.tar.gz
   cd S3-Migration-Scheduler-linux
   ```
2. **Run** the executable:
   ```bash
   ./s3-migration-scheduler
   ```

### Option 5: Linux Script Package

**Requirements:** Node.js 16+ installed

1. **Download** and extract `S3-Migration-Scheduler-Portable-Linux.tar.gz`
2. **Navigate** to the extracted folder:
   ```bash
   cd S3-Migration-Scheduler-Portable-Linux
   ```
3. **Run** the startup script:
   ```bash
   ./start-s3-migration-scheduler.sh
   ```
4. **Access** the application at http://localhost:5000

## 🔧 System Requirements

### Minimum Requirements
- **RAM:** 2 GB
- **Storage:** 500 MB available space
- **Network:** Internet connection for S3 operations

### Windows Specific
- **OS:** Windows 10 or later (64-bit)
- **Runtime:** No additional runtime required (bundled)

### Linux Specific
- **OS:** Modern Linux distribution (Ubuntu 18.04+, CentOS 7+, etc.)
- **Libraries:** Basic system libraries (automatically handled by packages)
- **Display:** X11 or Wayland desktop environment

### Script Package Requirements
- **Node.js:** Version 16 or later
- **npm:** Included with Node.js
- **Network:** Internet connection for initial dependency download

## 🚀 First Launch

### Initial Setup

1. **Launch** the application using your preferred method
2. **Wait** for the application to start (may take a few seconds on first run)
3. **Configure** your first S3 endpoint:
   - Go to the "Configuration" tab
   - Add your S3 credentials and endpoint details
   - Test the connection
4. **Set up** your first migration:
   - Go to the "Migration" tab
   - Select source and destination buckets
   - Configure migration options
   - Start or schedule the migration

### Data Storage Locations

The application stores data in the following locations:

**Windows:**
- **User Data:** `%APPDATA%\S3MigrationScheduler\`
- **Database:** `%APPDATA%\S3MigrationScheduler\data\migrations.db`
- **Logs:** `%APPDATA%\S3MigrationScheduler\logs\`

**Linux:**
- **User Data:** `~/.config/S3MigrationScheduler/`
- **Database:** `~/.config/S3MigrationScheduler/data/migrations.db`
- **Logs:** `~/.config/S3MigrationScheduler/logs/`

**Script Packages:**
- **Data:** `./data/` (relative to application folder)
- **Logs:** `./logs/` (relative to application folder)

## 🛠️ Troubleshooting

### Common Issues

#### Application Won't Start

**Windows:**
- Ensure you have the latest Visual C++ Redistributable installed
- Try running as Administrator
- Check Windows Defender/antivirus exclusions
- Verify the executable isn't corrupted (re-download)

**Linux:**
- Check execute permissions: `chmod +x filename`
- Install missing libraries:
  ```bash
  # Ubuntu/Debian
  sudo apt-get install libgtk-3-0 libxss1 libasound2
  
  # CentOS/RHEL
  sudo yum install gtk3 libXScrnSaver alsa-lib
  ```
- Try running from terminal to see error messages

#### Script Package Issues

**Dependencies Won't Install:**
- Ensure Node.js is properly installed: `node --version`
- Check internet connection
- Clear npm cache: `npm cache clean --force`
- Try running with elevated privileges

**Port Already in Use:**
- Another application is using port 5000
- Kill existing processes: `taskkill /F /IM node.exe` (Windows) or `pkill -f node` (Linux)
- Or edit the startup script to use a different port

#### Performance Issues

- **Increase memory:** Close other applications
- **Network slowness:** Check your internet connection and S3 endpoint
- **Large migrations:** Use the scheduling feature for off-peak hours
- **High CPU usage:** Reduce concurrent migration threads in settings

### Getting Help

1. **Check Logs:**
   - Application logs are in the data directory
   - Enable debug mode for detailed logging
   
2. **Test Configuration:**
   - Use the connection test in Configuration tab
   - Verify S3 credentials and permissions
   
3. **Report Issues:**
   - Visit the GitHub repository
   - Include log files and system information
   - Describe steps to reproduce the issue

## 🔄 Updates and Maintenance

### Automatic Updates (Installer Versions)

- Windows installer version checks for updates automatically
- Linux package versions depend on your system's package manager
- AppImage versions can be updated by downloading the latest version

### Manual Updates

1. **Backup** your data directory
2. **Download** the latest version
3. **Install/Replace** the application
4. **Verify** data migration completed successfully

### Data Backup

Regular backups are recommended:

```bash
# Windows (PowerShell)
Copy-Item "$env:APPDATA\S3MigrationScheduler\data" "backup-$(Get-Date -Format 'yyyy-MM-dd')" -Recurse

# Linux
cp -r ~/.config/S3MigrationScheduler/data "backup-$(date +%Y-%m-%d)"

# Script packages
cp -r ./data "./backup-$(date +%Y-%m-%d)"
```

## 📋 Uninstallation

### Windows Installer Version
1. **Use** Windows "Add or Remove Programs"
2. **Find** "S3 Migration Scheduler"
3. **Click** "Uninstall" and follow prompts
4. **Choose** whether to keep user data

### Windows Portable/Script
1. **Delete** the application folder
2. **Remove** data folder if desired (see data locations above)

### Linux Package Versions
```bash
# DEB packages
sudo apt-get remove s3-migration-scheduler

# RPM packages
sudo dnf remove s3-migration-scheduler  # or yum

# Keep data: packages don't remove user data by default
```

### Linux AppImage/TAR.GZ/Script
1. **Delete** the application files
2. **Remove** data folder if desired: `rm -rf ~/.config/S3MigrationScheduler`

## 🎯 Next Steps

After installation:

1. **Read** the main README for feature overview
2. **Check** the SETUP_GUIDE for detailed configuration
3. **Review** the UPDATE_GUIDE for version-specific notes
4. **Consider** the Docker deployment for server environments

## 📞 Support

For additional help:
- 📖 **Documentation:** Main README and setup guides
- 🐛 **Issues:** GitHub repository issue tracker
- 💬 **Community:** GitHub discussions
- 📧 **Contact:** See repository for contact information

The desktop application provides the most user-friendly experience for S3 migrations with a native interface and offline capabilities!