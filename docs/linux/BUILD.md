# Linux Build Guide - S3 Migration Scheduler

This document explains how to build Linux packages for the S3 Migration Scheduler from source.

## 🎯 Overview

The project uses `electron-builder` to create multiple Linux package formats:
- **AppImage**: Universal Linux packages (recommended)
- **DEB**: Ubuntu/Debian packages  
- **RPM**: RedHat/CentOS/SUSE/Fedora packages
- **TAR.GZ**: Generic Linux archives

## 🧰 Prerequisites

### System Requirements
- **Linux environment** (WSL, native Linux, or Docker)
- **Node.js 18+** with npm
- **Git** for source code
- **Build tools** for native module compilation

### Alpine Linux (WSL)
```bash
# Update package index
apk update

# Install Node.js and build tools
apk add nodejs npm python3 make g++ git linux-headers

# Install electron-builder dependencies
apk add --no-cache \
    libstdc++ \
    gcompat \
    p7zip \
    rpm \
    fakeroot \
    dpkg \
    xz
```

### Ubuntu/Debian
```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install build dependencies
sudo apt-get install -y \
    git \
    python3 \
    make \
    g++ \
    rpm \
    fakeroot \
    p7zip-full
```

### RHEL/CentOS/Fedora
```bash
# Install Node.js
sudo dnf install -y nodejs npm

# Install build dependencies  
sudo dnf install -y \
    git \
    python3 \
    make \
    gcc-c++ \
    rpm-build \
    p7zip
```

## 🚀 Build Process

### Step 1: Clone Repository
```bash
git clone https://github.com/hndrwn-dk/s3-migration-scheduler.git
cd s3-migration-scheduler
```

### Step 2: Prepare Frontend
```bash
cd client
npm install
npm run build
cd ..
```

### Step 3: Prepare Backend
```bash
cd server
npm install  
cd ..
```

### Step 4: Build Linux Packages
```bash
cd electron-app
npm install
npm run build:linux
```

### Step 5: Verify Build Results
```bash
# Check created packages
ls -lh dist/

# Expected output:
# S3 Migration Scheduler-1.0.0.AppImage          (146MB)
# S3 Migration Scheduler-1.0.0-arm64.AppImage    (146MB)
# s3-migration-scheduler-desktop_1.0.0_amd64.deb (99MB)
# s3-migration-scheduler-desktop_1.0.0_arm64.deb (94MB)
# s3-migration-scheduler-desktop-1.0.0.x86_64.rpm (97MB)
# s3-migration-scheduler-desktop-1.0.0.aarch64.rpm (95MB)
# s3-migration-scheduler-desktop-1.0.0.tar.gz    (139MB)
# s3-migration-scheduler-desktop-1.0.0-arm64.tar.gz (138MB)
```

## 🔧 Configuration Details

### electron-builder Configuration
The build configuration is defined in `electron-app/package.json`:

```json
{
  "build": {
    "linux": {
      "target": [
        { "target": "AppImage", "arch": ["x64", "arm64"] },
        { "target": "deb", "arch": ["x64", "arm64"] },
        { "target": "rpm", "arch": ["x64", "arm64"] },
        { "target": "tar.gz", "arch": ["x64", "arm64"] }
      ],
      "icon": "assets/icon.png",
      "category": "Utility",
      "synopsis": "S3 bucket migration and scheduling tool"
    }
  }
}
```

### Key Build Features
- **Multi-architecture**: Builds for both x64 and ARM64
- **Native modules**: Compiles `better-sqlite3` for Linux
- **MinIO client**: Includes Linux `mc` binary
- **Resource bundling**: Packages server and client code
- **Icon support**: Uses PNG icons for Linux

## 🐳 Alternative: Docker Build

For cross-platform builds or isolated environments:

```bash
# Use official electron-builder Docker image
docker run --rm -ti \
  -v ${PWD}:/project \
  -v ~/.cache/electron:/root/.cache/electron \
  -v ~/.cache/electron-builder:/root/.cache/electron-builder \
  electronuserland/builder:wine \
  /bin/bash -c "cd electron-app && npm install && npm run build:linux"
```

## 🎯 Build Targets

### Individual Target Builds
```bash
# Build only AppImage
npm run build:linux -- --linux AppImage

# Build only DEB packages
npm run build:linux -- --linux deb

# Build only RPM packages  
npm run build:linux -- --linux rpm

# Build only TAR.GZ archives
npm run build:linux -- --linux tar.gz

# Build only x64 architecture
npm run build:linux -- --x64

# Build only ARM64 architecture
npm run build:linux -- --arm64
```

### Custom Configuration
```bash
# Build with custom configuration
npm run build:linux -- --config.linux.executableName=s3-scheduler

# Skip code signing
npm run build:linux -- --config.linux.sign=null

# Custom output directory
npm run build:linux -- --config.directories.output=custom-dist
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. Missing Dependencies for better-sqlite3
```bash
# Error: "gyp ERR! find VS"
# Solution: Install build tools
sudo apt-get install python3-dev build-essential

# For Alpine
apk add python3-dev make g++ linux-headers
```

#### 2. AppImage Build Fails
```bash
# Error: "cannot execute 7za"
# Solution: Install p7zip
sudo apt-get install p7zip-full  # Ubuntu/Debian
apk add p7zip                    # Alpine
```

#### 3. RPM Build Fails
```bash
# Error: "rpm command not found"
# Solution: Install rpm tools
sudo apt-get install rpm        # Ubuntu/Debian
apk add rpm                      # Alpine
```

#### 4. Permission Issues
```bash
# Error: "EACCES: permission denied"
# Solution: Fix permissions
chmod -R 755 node_modules/.bin/
npm config set user 0
npm config set unsafe-perm true
```

### Debug Mode
```bash
# Enable debug output
DEBUG=electron-builder npm run build:linux

# Enable verbose logging
npm run build:linux -- --publish=never --debug
```

## 📦 Package Details

### AppImage
- **Type**: Universal Linux executable
- **Requirements**: FUSE support (built into most modern distros)
- **Installation**: Just download and run
- **Size**: ~146MB (includes all dependencies)

### DEB Package
- **Type**: Debian/Ubuntu package
- **Installation**: `sudo dpkg -i package.deb`
- **Dependencies**: Managed by package manager
- **Size**: ~94-99MB

### RPM Package  
- **Type**: RedHat/CentOS/SUSE package
- **Installation**: `sudo rpm -i package.rpm`
- **Dependencies**: Managed by package manager
- **Size**: ~95-97MB

### TAR.GZ Archive
- **Type**: Generic Linux archive
- **Installation**: Extract and run
- **Dependencies**: Must be installed separately
- **Size**: ~138-139MB

## 🚀 Automated Builds

### GitHub Actions (Future Enhancement)
```yaml
# .github/workflows/build-linux.yml
name: Build Linux Packages

on:
  push:
    tags: ['v*']

jobs:
  build-linux:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Build packages
        run: |
          npm install
          cd client && npm install && npm run build && cd ..
          cd server && npm install && cd ..
          cd electron-app && npm install && npm run build:linux
      - name: Upload to releases
        uses: actions/upload-release-asset@v1
        # ... upload logic
```

## 📋 Checklist

Before building:
- [ ] Node.js 18+ installed
- [ ] All build dependencies installed
- [ ] Git repository cloned
- [ ] Frontend built (`client/build/` exists)
- [ ] Server dependencies installed
- [ ] MinIO client (`mc`) present in root

After building:
- [ ] All 8 packages created (4 formats × 2 architectures)
- [ ] File sizes reasonable (95-146MB range)
- [ ] AppImage files are executable
- [ ] DEB/RPM packages install correctly
- [ ] TAR.GZ archives extract properly

## 🎉 Success!

If all steps complete successfully, you'll have production-ready Linux packages for distribution via GitHub Releases or package repositories.

---

**Need help?** Check the [main Linux README](README.md) or open an issue on GitHub!