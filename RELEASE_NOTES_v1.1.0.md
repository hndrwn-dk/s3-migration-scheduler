# S3 Migration Scheduler v1.1.0 Release Notes

## 🚀 What's New in v1.1.0

This release brings significant enhancements to the S3 Migration Scheduler with improved deployment options, enhanced bucket selection capabilities, and comprehensive Docker support.

### ✨ Major Features

#### 🗂️ Enhanced Bucket Selector for Large-Scale Deployments
- **Advanced bucket filtering and search capabilities**
- **Improved performance for environments with thousands of buckets**
- **Better user experience with responsive UI components**
- **Optimized API calls for faster bucket loading**

#### 🐳 Complete Docker Hub Integration
- **Pre-built Docker images** available on Docker Hub (`hndrwn/s3-migration-scheduler:1.1.0`)
- **One-command deployment** with `docker-compose up -d`
- **Automated build and push scripts** for both Windows and Linux
- **Production-ready Docker configuration** with health checks

#### 🛠️ Enhanced Development Experience
- **New npm scripts** for concurrent client/server development
- **Comprehensive build documentation** with platform-specific guides
- **Improved project structure** with better dependency management

### 🔧 Technical Improvements

#### Build & Deployment
- **Cross-platform build scripts** (`docker-build-and-push.sh` / `.bat`)
- **Automated Docker Hub publishing** with version tagging
- **Optimized Dockerfile** with multi-stage builds
- **Comprehensive .dockerignore** for efficient builds

#### Development Tools
- **New `dev:stable` script** for concurrent client/server execution
- **Individual component scripts** (`client:start`, `server:dev`, etc.)
- **Dependency management scripts** (`install:all`)
- **Better error handling** in build processes

#### Infrastructure
- **Docker Compose configuration** with MinIO for testing
- **Production deployment guides** for Docker Swarm and Kubernetes
- **Health check endpoints** for monitoring
- **Volume mounting** for persistent data

### 📦 Package Updates

All packages updated to version 1.1.0 for consistency:
- Root package: `1.0.0` → `1.1.0`
- Electron app: `1.0.0` → `1.1.0`
- Server: `1.0.0` → `1.1.0`
- Client: `0.1.0` → `1.1.0`

### 🐛 Bug Fixes

- **Fixed missing `dev:stable` script** that was breaking startup scripts
- **Resolved Docker build script issues** on Windows
- **Improved directory navigation** in build processes
- **Fixed npm command termination** in Windows batch scripts
- **Removed problematic emoji encoding** from scripts

### 📚 Documentation Enhancements

- **Comprehensive Docker deployment guide** (`docs/DOCKER.md`)
- **Build instructions** for all platforms (`BUILD.md`)
- **Troubleshooting guides** for common issues
- **Production deployment examples**

## 🛠️ Installation & Upgrade

### Quick Start with Docker (Recommended)

```bash
# Pull and run the latest version
docker run -d -p 5000:5000 -v ./data:/app/data hndrwn/s3-migration-scheduler:1.1.0

# Or use docker-compose
git clone https://github.com/hndrwn-dk/s3-migration-scheduler
cd s3-migration-scheduler
docker-compose up -d
```

### Traditional Installation

```bash
# Clone the repository
git clone https://github.com/hndrwn-dk/s3-migration-scheduler
cd s3-migration-scheduler

# Install all dependencies
npm run install:all

# Start development server
npm run dev:stable
```

### Building from Source

```bash
# Windows
.\scripts\docker-build-and-push.bat

# Linux/Mac
./scripts/docker-build-and-push.sh
```

## 📋 Release Assets

This release includes the following downloadable assets:

- **Windows Executable** (`s3-migration-scheduler-1.1.0-win.exe`)
- **Linux AppImage** (`s3-migration-scheduler-1.1.0.AppImage`)
- **Linux Debian Package** (`s3-migration-scheduler_1.1.0_amd64.deb`)
- **Source Code** (zip/tar.gz)

## 🔄 Migration from v1.0.0

Upgrading from v1.0.0 is straightforward:

1. **Docker Users**: Simply pull the new image tag
   ```bash
   docker pull hndrwn/s3-migration-scheduler:1.1.0
   ```

2. **Source Users**: Pull latest changes and rebuild
   ```bash
   git pull origin main
   npm run install:all
   npm run dev:stable
   ```

3. **Desktop Users**: Download and install the new executable

## 🐳 Docker Hub

Docker images are now available on Docker Hub:
- **Repository**: https://hub.docker.com/r/hndrwn/s3-migration-scheduler
- **Tags**: `1.1.0`, `latest`
- **Architecture**: `linux/amd64`

## 🙏 Acknowledgments

Special thanks to all contributors and users who provided feedback to make this release possible.

## 🔗 Links

- **Docker Hub**: https://hub.docker.com/r/hndrwn/s3-migration-scheduler
- **Documentation**: https://github.com/hndrwn-dk/s3-migration-scheduler/blob/main/docs/
- **Issues**: https://github.com/hndrwn-dk/s3-migration-scheduler/issues
- **Discussions**: https://github.com/hndrwn-dk/s3-migration-scheduler/discussions

---

## 📅 Release Information

- **Release Date**: January 14, 2025
- **Version**: 1.1.0
- **Previous Version**: 1.0.0
- **Compatibility**: Windows 10+, Linux (Ubuntu 18.04+), macOS 10.14+
- **Node.js**: 18.x or higher recommended

## 🆘 Support

If you encounter any issues with this release:

1. Check the [troubleshooting guide](docs/DOCKER.md#troubleshooting)
2. Search [existing issues](https://github.com/hndrwn-dk/s3-migration-scheduler/issues)
3. Create a [new issue](https://github.com/hndrwn-dk/s3-migration-scheduler/issues/new) with detailed information

---

**Full Changelog**: https://github.com/hndrwn-dk/s3-migration-scheduler/compare/v1.0.0...v1.1.0