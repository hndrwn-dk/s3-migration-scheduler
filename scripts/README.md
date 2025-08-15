# Scripts Directory - Build & Release Automation

This directory contains automated scripts for building, packaging, and releasing the S3 Migration Scheduler.

## 🚀 Quick Start Scripts

### Complete Build & Release Automation
**One-command solution for the entire release process:**

```bash
# Windows
.\scripts\build-and-release.bat

# Linux/Mac  
./scripts/build-and-release.sh
```

**What it does:**
- ✅ Checks prerequisites (Node.js, npm, Docker)
- ✅ Cleans previous builds and node_modules
- ✅ Installs all dependencies (root, client, server, electron)
- ✅ Builds React client for production
- ✅ Creates desktop packages (Windows .exe/.zip, Linux .AppImage/.deb)
- ✅ Optionally builds and pushes Docker images
- ✅ Lists all built assets
- ✅ Provides GitHub release instructions
- ✅ Opens relevant directories and web pages

## 🐳 Docker Scripts

### Docker Build & Push
**Automated Docker Hub publishing:**

```bash
# Windows
.\scripts\docker-build-and-push.bat

# Linux/Mac
./scripts/docker-build-and-push.sh
```

**Features:**
- ✅ Builds React client automatically
- ✅ Creates Docker images with version and latest tags
- ✅ Pushes to Docker Hub (hndrwn/s3-migration-scheduler)
- ✅ Enhanced error handling and retry logic
- ✅ Corporate environment compatibility

## 📦 Legacy Scripts

### Development Startup
```bash
# Windows
.\scripts\02-start.bat

# Linux/Mac  
./scripts/02-start.sh
```
Starts development servers with `npm run dev:stable`

### Initial Setup
```bash
# Windows
.\scripts\00-setup-windows.bat

# Linux/Mac
./scripts/00-setup-linux.sh
```
Initial project setup and MinIO configuration

## 🔧 Script Configuration

### Version Management
Update version numbers in these files for new releases:
- `build-and-release.bat` → `set VERSION=1.1.0`
- `build-and-release.sh` → `VERSION="1.1.0"`
- `docker-build-and-push.bat` → `set VERSION=1.1.0`
- `docker-build-and-push.sh` → `VERSION="1.1.0"`

### Docker Hub Configuration
Update Docker Hub settings:
- `DOCKER_USERNAME=hndrwn`
- `IMAGE_NAME=s3-migration-scheduler`

## 📋 Release Checklist

### Using the Complete Build Script:

1. **Update version numbers** in all package.json files
2. **Run the complete build script**:
   ```bash
   .\scripts\build-and-release.bat  # Windows
   ./scripts/build-and-release.sh   # Linux/Mac
   ```
3. **Follow the guided prompts** for:
   - Cleaning node_modules
   - Building desktop packages  
   - Docker build and push
   - Opening release directories

4. **Create GitHub Release**:
   - The script will open GitHub releases page
   - Upload assets from `electron-app/dist/`
   - Copy release notes from `RELEASE_NOTES_v[VERSION].md`

## 🛠️ Manual Build Process

If you prefer manual control:

```bash
# 1. Build client
cd client
npm install && npm run build

# 2. Build desktop packages
cd ../electron-app  
npm install
npm run build:win    # Windows
npm run build:linux  # Linux

# 3. Build and push Docker
cd ../scripts
./docker-build-and-push.sh
```

## 🔍 Troubleshooting

### Common Issues:

**"Node.js not found"**
- Install Node.js 18+ from nodejs.org
- Ensure it's in your system PATH

**"Docker not found"**
- Install Docker Desktop
- Start Docker service
- Verify with `docker --version`

**"Build failed"**
- Clean node_modules: Delete all node_modules directories
- Clear npm cache: `npm cache clean --force`
- Try the build script with clean option

**"Permission denied" (Linux)**
- Make scripts executable: `chmod +x scripts/*.sh`
- Run with sudo if needed: `sudo ./script-name.sh`

### Build Environments:

**Windows:**
- Builds Windows packages natively
- Can build Linux packages with additional tools
- Docker builds work if Docker Desktop is installed

**Linux:**
- Builds Linux packages natively  
- Can build Windows packages with Wine (complex setup)
- Docker builds work natively

**macOS:**
- Builds macOS packages natively
- Can build Linux packages
- Limited Windows support

## 📁 Output Locations

### Built Assets:
- **Desktop packages**: `electron-app/dist/`
- **React build**: `client/build/`
- **Docker images**: Docker Hub (`hndrwn/s3-migration-scheduler`)

### Logs and Data:
- **Application logs**: `%APPDATA%/s3-migration-scheduler/logs/`
- **Database**: `%APPDATA%/s3-migration-scheduler/data/`
- **Build logs**: Console output during script execution

## 🔗 Related Documentation

- **Main README**: `../README.md` - Project overview and features
- **Release Notes**: `../RELEASE_NOTES_v[VERSION].md` - Version-specific changes
- **Changelog**: `../CHANGELOG.md` - Complete version history
- **Troubleshooting**: `../docs/TROUBLESHOOTING.md` - Corporate environment issues
- **Docker Guide**: `../docs/DOCKER.md` - Docker deployment details

---

**💡 Tip**: Use the complete build script (`build-and-release.bat/.sh`) for the easiest and most reliable release process. It handles all the complexity and provides clear guidance for GitHub release creation.