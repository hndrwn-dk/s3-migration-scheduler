# S3 Migration Scheduler - Linux Installation Guide

## 📦 Installation Options

### Option 1: AppImage (Recommended)
```bash
# Download AppImage
wget https://github.com/hndrwn-dk/s3-migration-scheduler/releases/download/v1.0.0/S3-Migration-Scheduler-1.0.0.AppImage

# Make executable
chmod +x S3-Migration-Scheduler-1.0.0.AppImage

# Run directly
./S3-Migration-Scheduler-1.0.0.AppImage
```

### Option 2: DEB Package (Ubuntu/Debian)
```bash
# Download DEB package
wget https://github.com/hndrwn-dk/s3-migration-scheduler/releases/download/v1.0.0/s3-migration-scheduler_1.0.0_amd64.deb

# Install
sudo dpkg -i s3-migration-scheduler_1.0.0_amd64.deb
sudo apt-get install -f  # Fix dependencies if needed

# Run
s3-migration-scheduler
```

### Option 3: RPM Package (RHEL/CentOS/Fedora)
```bash
# Download RPM package
wget https://github.com/hndrwn-dk/s3-migration-scheduler/releases/download/v1.0.0/s3-migration-scheduler-1.0.0.x86_64.rpm

# Install
sudo rpm -i s3-migration-scheduler-1.0.0.x86_64.rpm
# OR
sudo dnf install s3-migration-scheduler-1.0.0.x86_64.rpm

# Run
s3-migration-scheduler
```

### Option 4: TAR.GZ Archive
```bash
# Download archive
wget https://github.com/hndrwn-dk/s3-migration-scheduler/releases/download/v1.0.0/s3-migration-scheduler-1.0.0-linux-x64.tar.gz

# Extract
tar -xzf s3-migration-scheduler-1.0.0-linux-x64.tar.gz

# Run
cd s3-migration-scheduler-1.0.0-linux-x64
./s3-migration-scheduler
```

## 🎯 System Requirements

### Minimum Requirements
- **OS**: Linux (64-bit)
- **Kernel**: 3.10+ (most modern distributions)
- **RAM**: 4GB minimum, 8GB recommended
- **Disk Space**: 1GB free space
- **Network**: Internet connection for S3 access

### Supported Distributions
- **Ubuntu**: 18.04+ (LTS recommended)
- **Debian**: 9+
- **CentOS/RHEL**: 7+
- **Fedora**: 30+
- **openSUSE**: 15+
- **Arch Linux**: Current
- **Most other** modern Linux distributions

### Dependencies
Most packages include all dependencies. For TAR.GZ:
```bash
# Ubuntu/Debian
sudo apt-get install libgtk-3-0 libxss1 libasound2

# RHEL/CentOS/Fedora
sudo yum install gtk3 libXScrnSaver alsa-lib
# OR
sudo dnf install gtk3 libXScrnSaver alsa-lib
```

## 🚀 Quick Start

### 1. Launch Application
```bash
# AppImage
./S3-Migration-Scheduler-1.0.0.AppImage

# Installed package
s3-migration-scheduler

# TAR.GZ
./s3-migration-scheduler
```

### 2. Desktop Integration (Optional)
```bash
# For AppImage - create desktop entry
cat > ~/.local/share/applications/s3-migration-scheduler.desktop << EOF
[Desktop Entry]
Type=Application
Name=S3 Migration Scheduler
Exec=/path/to/S3-Migration-Scheduler-1.0.0.AppImage
Icon=s3-migration-scheduler
Categories=Utility;Network;
Comment=S3 bucket migration and scheduling tool
EOF

# Update desktop database
update-desktop-database ~/.local/share/applications/
```

## 📁 File Locations

### User Data Directory
```
~/.config/S3MigrationScheduler/
├── data/
│   └── migrations.db           # Migration database
├── logs/
│   ├── app.log                # Application logs
│   └── migration-{id}.log     # Migration-specific logs
└── config/
    └── settings.json          # User preferences
```

### System Installation (DEB/RPM)
```
/opt/S3MigrationScheduler/      # Application files
/usr/bin/s3-migration-scheduler # Launcher script
/usr/share/applications/        # Desktop entry
/usr/share/icons/               # Application icons
```

## 🔧 Troubleshooting

### Permission Issues
```bash
# Make AppImage executable
chmod +x S3-Migration-Scheduler-1.0.0.AppImage

# Fix user data permissions
chmod -R 755 ~/.config/S3MigrationScheduler/
```

### Missing Dependencies
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install libgtk-3-0 libxss1 libasound2 libgconf-2-4

# Check for missing libraries
ldd S3-Migration-Scheduler-1.0.0.AppImage | grep "not found"
```

### Display Issues
```bash
# For X11 forwarding (SSH)
ssh -X user@hostname

# For Wayland compatibility
export GDK_BACKEND=x11

# Scale adjustment for HiDPI
export GDK_SCALE=2
```

### Port Conflicts
```bash
# Check if port 5000 is in use
sudo netstat -tlnp | grep :5000
sudo ss -tlnp | grep :5000

# Kill conflicting process
sudo fuser -k 5000/tcp
```

## 🐳 Docker Alternative

### Run with Docker
```bash
# Pull image
docker pull hndrwn/s3-migration-scheduler:latest

# Run with volume mapping
docker run -d \
  --name s3-migration-scheduler \
  -p 5000:5000 \
  -v $(pwd)/data:/app/data \
  hndrwn/s3-migration-scheduler:latest

# Access web UI
firefox http://localhost:5000
```

## 🔄 Updates

### AppImage Updates
```bash
# Download new version
wget https://github.com/hndrwn-dk/s3-migration-scheduler/releases/latest/download/S3-Migration-Scheduler.AppImage

# Replace old version
chmod +x S3-Migration-Scheduler.AppImage
```

### Package Updates
```bash
# DEB (Ubuntu/Debian)
sudo apt-get update && sudo apt-get upgrade s3-migration-scheduler

# RPM (RHEL/CentOS/Fedora)
sudo dnf upgrade s3-migration-scheduler
# OR
sudo yum update s3-migration-scheduler
```

## 🛠️ Advanced Configuration

### Environment Variables
```bash
# Custom data directory
export S3_MIGRATION_DATA_DIR=~/custom-data

# Debug mode
export DEBUG=true

# Custom port
export PORT=8080

# Run with custom settings
S3_MIGRATION_DATA_DIR=~/backup-data ./S3-Migration-Scheduler-1.0.0.AppImage
```

### Systemd Service (System-wide)
```bash
# Create service file
sudo tee /etc/systemd/system/s3-migration-scheduler.service << EOF
[Unit]
Description=S3 Migration Scheduler
After=network.target

[Service]
Type=simple
User=s3migration
ExecStart=/opt/S3MigrationScheduler/s3-migration-scheduler
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start
sudo systemctl enable s3-migration-scheduler
sudo systemctl start s3-migration-scheduler
```

### Build from Source
```bash
# Clone repository
git clone https://github.com/hndrwn-dk/s3-migration-scheduler.git
cd s3-migration-scheduler

# Install dependencies
npm install

# Build frontend
cd client && npm install && npm run build && cd ..

# Build backend
cd server && npm install && cd ..

# Build Electron app
cd electron-app && npm install
npm run build:linux

# Find built packages
ls -la dist/
```

## 🆘 Support

### Log Files
```bash
# Application logs
tail -f ~/.config/S3MigrationScheduler/logs/app.log

# Migration logs
tail -f ~/.config/S3MigrationScheduler/logs/migration-*.log

# System service logs (if using systemd)
sudo journalctl -u s3-migration-scheduler -f
```

### Common Issues
1. **AppImage won't run**: Check executable permissions and FUSE support
2. **Package conflicts**: Use `--force-depends` or resolve manually
3. **Display issues**: Try different desktop environments or X11 forwarding
4. **Performance**: Increase RAM or use SSD for database storage

### Getting Help
- **GitHub Issues**: [Report problems](https://github.com/hndrwn-dk/s3-migration-scheduler/issues)
- **Logs**: Include relevant log files with issue reports
- **System Info**: Provide distribution, kernel version, and architecture

---

**Need more help?** Check our [development documentation](../development/) or open an issue on GitHub!