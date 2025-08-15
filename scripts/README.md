# Scripts Directory - Organized Build & Release Automation

This directory contains automated scripts organized by function for building, packaging, and releasing the S3 Migration Scheduler.

## 📁 Directory Structure

```
scripts/
├── build/                          # 🏗️ Build & Release Scripts
│   ├── build-and-release.bat       # Complete automation (Windows)
│   ├── build-and-release.sh        # Complete automation (Linux/Mac)
│   ├── windows/
│   │   └── build-windows.bat       # Windows desktop packages
│   ├── linux/
│   │   └── build-linux.sh          # Linux desktop packages
│   └── docker/
│       ├── docker-build-and-push.bat # Docker Hub publishing (Windows)
│       └── docker-build-and-push.sh  # Docker Hub publishing (Linux/Mac)
├── setup/                          # ⚙️ Setup & Configuration
│   ├── 00-setup-linux.sh           # Initial Linux setup
│   ├── 00-setup-windows.bat        # Initial Windows setup
│   ├── 01-fix-dependencies.sh      # Dependency repair (Linux)
│   ├── 01-fix-dependencies.bat     # Dependency repair (Windows)
│   ├── 02-start.sh                 # Development startup (Linux)
│   └── 02-start.bat                # Development startup (Windows)
└── db/                             # 🗄️ Database Management
    ├── 03-backup-db.sh             # Database backup (Linux)
    ├── 03-backup-db.bat            # Database backup (Windows)
    ├── 04-restore-db.sh            # Database restore (Linux)
    └── 04-restore-db.bat           # Database restore (Windows)
```

## 🚀 Quick Start

### Complete Build & Release (Recommended)
**One-command solution for the entire release process:**

```bash
# Windows
.\scripts\build\build-and-release.bat

# Linux/Mac  
./scripts/build/build-and-release.sh
```

## 🏗️ Build Scripts

### Platform-Specific Builds

#### Windows Desktop Packages
```bash
.\scripts\build\windows\build-windows.bat
```
**Creates:** `.exe` installer and `.zip` portable

#### Linux Desktop Packages
```bash
./scripts/build/linux/build-linux.sh
```
**Creates:** `.AppImage`, `.deb`, `.tar.gz`, `.rpm`

#### Docker Hub Publishing
```bash
# Windows
.\scripts\build\docker\docker-build-and-push.bat

# Linux/Mac
./scripts/build/docker/docker-build-and-push.sh
```
**Creates:** Docker images on `hndrwn/s3-migration-scheduler`

## ⚙️ Setup Scripts

### Initial Project Setup
```bash
# Windows
.\scripts\setup\00-setup-windows.bat

# Linux/Mac
./scripts/setup/00-setup-linux.sh
```
**What it does:** Complete environment setup, dependency installation, MinIO configuration

### Dependency Management
```bash
# Windows
.\scripts\setup\01-fix-dependencies.bat

# Linux/Mac
./scripts/setup/01-fix-dependencies.sh
```
**Use when:** Dependencies are corrupted or after pulling updates

### Development Startup
```bash
# Windows
.\scripts\setup\02-start.bat

# Linux/Mac  
./scripts/setup/02-start.sh
```
**What it does:** Starts development servers with `npm run dev:stable`

## 🗄️ Database Scripts

### Backup Database
```bash
# Windows
.\scripts\db\03-backup-db.bat

# Linux/Mac
./scripts/db/03-backup-db.sh
```
**Use before:** Git pulls, major updates, or as precautionary backup

### Restore Database
```bash
# Windows
.\scripts\db\04-restore-db.bat

# Linux/Mac
./scripts/db/04-restore-db.sh
```
**Use when:** Migration data was lost or database corruption occurs

## 🔧 Configuration Management

### Version Updates
For new releases, update version numbers in:
- `build/build-and-release.bat` → `set VERSION=1.2.0`
- `build/build-and-release.sh` → `VERSION="1.2.0"`
- `build/windows/build-windows.bat` → `set VERSION=1.2.0`
- `build/linux/build-linux.sh` → `VERSION="1.2.0"`
- `build/docker/docker-build-and-push.*` → Update VERSION

### Docker Hub Settings
- `DOCKER_USERNAME=hndrwn`
- `IMAGE_NAME=s3-migration-scheduler`

## 📋 Typical Workflows

### Development Workflow
```bash
# 1. Initial setup (once)
./scripts/setup/00-setup-linux.sh

# 2. Daily development
./scripts/setup/02-start.sh

# 3. If dependencies break
./scripts/setup/01-fix-dependencies.sh
```

### Release Workflow
```bash
# 1. Backup database
./scripts/db/03-backup-db.sh

# 2. Update version numbers in build scripts

# 3. Complete build and release
./scripts/build/build-and-release.sh

# 4. Follow GitHub release instructions
```

### Update Workflow
```bash
# 1. Backup before update
./scripts/db/03-backup-db.sh

# 2. Update code
git pull origin main

# 3. Restore if needed
./scripts/db/04-restore-db.sh

# 4. Fix dependencies if needed
./scripts/setup/01-fix-dependencies.sh
```

## 🛠️ Manual Build Options

### Individual Platform Builds
```bash
# Just Windows packages
.\scripts\build\windows\build-windows.bat

# Just Linux packages
./scripts/build/linux/build-linux.sh

# Just Docker
./scripts/build/docker/docker-build-and-push.sh
```

### Custom Build Process
```bash
# 1. Build client
cd client && npm install && npm run build

# 2. Choose your platform
cd ../scripts/build/windows && build-windows.bat  # Windows
cd ../scripts/build/linux && ./build-linux.sh    # Linux
cd ../scripts/build/docker && ./docker-build-and-push.sh  # Docker
```

## 🔍 Troubleshooting

### Script Permissions (Linux/Mac)
```bash
# Make all scripts executable
chmod +x scripts/setup/*.sh
chmod +x scripts/build/**/*.sh
chmod +x scripts/db/*.sh
```

### Common Issues

**"Command not found"**
- Ensure Node.js, npm, and Docker are installed
- Check system PATH variables
- Run setup scripts first

**"Build failed"**
- Clean node_modules: Use setup scripts with clean option
- Check prerequisites: Run complete build script for verification
- Review error messages: Each script provides detailed error context

**"Docker login failed"**
- Run `docker login` before Docker build scripts
- Check Docker Hub credentials
- Ensure Docker service is running

## 📁 Output Locations

### Built Assets
- **Desktop packages**: `electron-app/dist/`
- **React build**: `client/build/`
- **Docker images**: Docker Hub (`hndrwn/s3-migration-scheduler`)

### Data & Logs
- **Database backups**: `database-backups/`
- **Application data**: `%APPDATA%/s3-migration-scheduler/data/`
- **Application logs**: `%APPDATA%/s3-migration-scheduler/logs/`

## 🔗 Related Documentation

- **Main README**: `../README.md` - Project overview
- **Release Notes**: `../RELEASE_NOTES_v[VERSION].md` - Version changes
- **Changelog**: `../CHANGELOG.md` - Complete history
- **Troubleshooting**: `../docs/TROUBLESHOOTING.md` - Corporate environment issues
- **Docker Guide**: `../docs/DOCKER.md` - Docker deployment

## 🎯 Quick Reference

| Task | Script | Platform |
|------|--------|----------|
| **Complete Release** | `build/build-and-release.*` | Windows/Linux |
| **Windows Only** | `build/windows/build-windows.bat` | Windows |
| **Linux Only** | `build/linux/build-linux.sh` | Linux |
| **Docker Only** | `build/docker/docker-build-and-push.*` | Any |
| **Development** | `setup/02-start.*` | Any |
| **Setup** | `setup/00-setup-*.*` | Platform-specific |
| **Fix Dependencies** | `setup/01-fix-dependencies.*` | Platform-specific |
| **Backup DB** | `db/03-backup-db.*` | Platform-specific |
| **Restore DB** | `db/04-restore-db.*` | Platform-specific |

---

**💡 Best Practice**: Use the complete build script (`build/build-and-release.*`) for releases and individual platform scripts for targeted builds or testing.