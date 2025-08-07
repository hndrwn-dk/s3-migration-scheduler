# S3 Migration Scheduler - Linux

## 📥 Download

**[📥 Download from GitHub Releases](https://github.com/hndrwn-dk/s3-migration-scheduler/releases/latest)**

Choose your preferred package format:

### 🎯 **Recommended: AppImage (Universal)**
- **x64**: `S3 Migration Scheduler-1.0.0.AppImage` (146MB)
- **ARM64**: `S3 Migration Scheduler-1.0.0-arm64.AppImage` (146MB)

### 📦 **DEB Packages (Ubuntu/Debian/Mint)**
- **x64**: `s3-migration-scheduler-desktop_1.0.0_amd64.deb` (99MB)
- **ARM64**: `s3-migration-scheduler-desktop_1.0.0_arm64.deb` (94MB)

### 🔴 **RPM Packages (RedHat/CentOS/SUSE/Fedora)**
- **x64**: `s3-migration-scheduler-desktop-1.0.0.x86_64.rpm` (97MB)
- **ARM64**: `s3-migration-scheduler-desktop-1.0.0.aarch64.rpm` (95MB)

### 📁 **TAR.GZ Archives (Generic Linux)**
- **x64**: `s3-migration-scheduler-desktop-1.0.0.tar.gz` (139MB)
- **ARM64**: `s3-migration-scheduler-desktop-1.0.0-arm64.tar.gz` (138MB)

## 🚀 Installation

### AppImage (Recommended)
```bash
# Download
wget https://github.com/hndrwn-dk/s3-migration-scheduler/releases/latest/download/S3\ Migration\ Scheduler-1.0.0.AppImage

# Make executable  
chmod +x "S3 Migration Scheduler-1.0.0.AppImage"

# Run directly
./"S3 Migration Scheduler-1.0.0.AppImage"
```

### DEB Package (Ubuntu/Debian)
```bash
# Download
wget https://github.com/hndrwn-dk/s3-migration-scheduler/releases/latest/download/s3-migration-scheduler-desktop_1.0.0_amd64.deb

# Install
sudo dpkg -i s3-migration-scheduler-desktop_1.0.0_amd64.deb
sudo apt-get install -f  # Fix dependencies if needed

# Launch from menu or command line
s3-migration-scheduler-desktop
```

### RPM Package (RHEL/CentOS/Fedora)
```bash
# Download
wget https://github.com/hndrwn-dk/s3-migration-scheduler/releases/latest/download/s3-migration-scheduler-desktop-1.0.0.x86_64.rpm

# Install
sudo rpm -i s3-migration-scheduler-desktop-1.0.0.x86_64.rpm
# OR with dependency resolution
sudo dnf install s3-migration-scheduler-desktop-1.0.0.x86_64.rpm

# Launch
s3-migration-scheduler-desktop
```

### TAR.GZ Archive
```bash
# Download
wget https://github.com/hndrwn-dk/s3-migration-scheduler/releases/latest/download/s3-migration-scheduler-desktop-1.0.0.tar.gz

# Extract
tar -xzf s3-migration-scheduler-desktop-1.0.0.tar.gz

# Run
cd s3-migration-scheduler-desktop-1.0.0
./s3-migration-scheduler-desktop
```

## 🎯 System Requirements

- **OS**: Linux (64-bit) - most modern distributions
- **RAM**: 4GB minimum, 8GB for large migrations
- **Disk**: 1GB free space + space for logs/database
- **Network**: Internet connection for S3 access

**Supported Distributions:**
- Ubuntu 18.04+, Debian 9+
- CentOS/RHEL 7+, Fedora 30+
- openSUSE 15+, Arch Linux
- Most other modern distributions

## ⚡ Quick Start

1. **Download** your preferred package format
2. **Install/Run** using instructions above  
3. **Add Migration**: Click "Add New Migration"
4. **Configure S3**: Enter source and destination details
5. **Start**: Begin migration or schedule for later
6. **Monitor**: Track progress in real-time

## ✨ Key Features

- **Real-time monitoring** with live progress updates
- **Advanced scheduling** with cron expressions  
- **Large-scale reconciliation** for millions of objects
- **Persistent database** with SQLite
- **Built-in MinIO client** - no external dependencies
- **Professional Linux UI** with native desktop integration

## 📁 File Locations

**User Data (Persistent):**
```
~/.config/S3MigrationScheduler/
├── data/migrations.db           # Migration database
├── logs/                        # Application & migration logs  
└── config/settings.json         # User preferences
```

**System Installation (DEB/RPM):**
```
/opt/S3MigrationScheduler/       # Application files
/usr/bin/s3-migration-scheduler-desktop  # Launcher
/usr/share/applications/         # Desktop entry
```

## 🔧 Troubleshooting

### AppImage Won't Run
```bash
# Check executable permissions
chmod +x "S3 Migration Scheduler-1.0.0.AppImage"

# Install FUSE if needed (older systems)
sudo apt-get install fuse libfuse2  # Ubuntu/Debian
sudo yum install fuse-libs          # RHEL/CentOS
```

### Missing Dependencies (TAR.GZ)
```bash
# Ubuntu/Debian
sudo apt-get install libgtk-3-0 libxss1 libasound2

# RHEL/CentOS/Fedora  
sudo dnf install gtk3 libXScrnSaver alsa-lib
```

### Port Conflicts
```bash
# Check if port 5000 is in use
sudo netstat -tlnp | grep :5000

# Kill conflicting process
sudo fuser -k 5000/tcp
```

## 🔄 Updates

**AppImage**: Download new version and replace old file  
**DEB**: `sudo apt-get update && sudo apt-get upgrade`  
**RPM**: `sudo dnf upgrade` or `sudo yum update`  
**TAR.GZ**: Download and extract new version

## 🐳 Docker Alternative

```bash
# Quick start with Docker
docker run -d --name s3-migration \
  -p 5000:5000 \
  -v $(pwd)/data:/app/data \
  hndrwn/s3-migration-scheduler:latest

# Access at http://localhost:5000
```

## 🛠️ Build from Source

**Prerequisites:** Node.js 18+, Git

```bash
git clone https://github.com/hndrwn-dk/s3-migration-scheduler.git
cd s3-migration-scheduler

# Install & build
npm install
cd client && npm install && npm run build && cd ..
cd server && npm install && cd ..
cd electron-app && npm install && npm run build:linux

# Find packages in electron-app/dist/
```

**For detailed build instructions:** [Build Guide](BUILD.md)

## 🆘 Support

**Having issues?**
1. Check logs: `~/.config/S3MigrationScheduler/logs/`
2. Report: [GitHub Issues](https://github.com/hndrwn-dk/s3-migration-scheduler/issues)
3. Include: Distribution, architecture, and error logs

---

**🎉 Ready to migrate S3 buckets on Linux!**

**[Download Now](https://github.com/hndrwn-dk/s3-migration-scheduler/releases/latest)** | **[Report Issues](https://github.com/hndrwn-dk/s3-migration-scheduler/issues)** | **[Docker Guide](../docker/)**