# Changelog

All notable changes to the S3 Migration Scheduler project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-01-14

### Added
- **🐳 Complete Docker Hub Integration**
  - Pre-built Docker images available at `hndrwn/s3-migration-scheduler:1.1.0`
  - Docker Compose configuration for one-command deployment
  - Automated build and push scripts for Windows (`docker-build-and-push.bat`) and Linux (`docker-build-and-push.sh`)
  - Production-ready Docker configuration with health checks and volume mounting
  - Comprehensive `.dockerignore` for optimized builds

- **🗂️ Enhanced Bucket Selector for Large-Scale Deployments**
  - Improved performance for environments with thousands of buckets
  - Advanced bucket filtering and search capabilities
  - Better user experience with responsive UI components
  - Optimized API calls for faster bucket loading

- **🛠️ Enhanced Development Experience**
  - New `dev:stable` npm script for concurrent client/server development
  - Individual component scripts: `client:start`, `server:dev`, `server:start`
  - Unified dependency management with `install:all` script
  - Better error handling in build processes

- **📚 Documentation Enhancements**
  - Comprehensive Docker deployment guide (`docs/DOCKER.md`)
  - Build instructions for all platforms with troubleshooting
  - Production deployment examples for Docker Swarm and Kubernetes
  - API health check endpoint documentation

- **🔧 Infrastructure Improvements**
  - Health check endpoints (`/api/health`) for production monitoring
  - Docker Compose configuration with MinIO for testing
  - Cross-platform build scripts with proper directory navigation
  - Volume mounting for persistent data and configuration

### Changed
- **📦 Version Consistency**: Updated all packages to version 1.1.0
  - Root package: `1.0.0` → `1.1.0`
  - Electron app: `1.0.0` → `1.1.0`
  - Server: `1.0.0` → `1.1.0`
  - Client: `0.1.0` → `1.1.0`

- **👤 Author Information**: Updated author metadata across all packages
  - Consistent author information for project maintainability
  - Updated contact information in package.json files

### Fixed
- **🔧 Missing `dev:stable` Script**: Added the missing npm script that was breaking startup scripts
- **🐳 Docker Build Script Issues**: Resolved Windows compatibility problems
  - Fixed Docker login detection on Windows
  - Removed problematic emoji encoding that caused display issues
  - Improved directory navigation with proper error handling
  - Added `call` prefix to npm commands to prevent script termination
  - Used `pushd/popd` for better directory stack management

- **📁 Directory Navigation**: Enhanced build processes
  - Fixed npm install directory context issues
  - Improved error handling with clear directory path outputs
  - Added validation for package.json files in both root and client directories

### Technical Details
- **Docker Images**: Multi-stage builds with efficient layer caching
- **Build Scripts**: Cross-platform compatibility with Windows batch and Linux shell scripts
- **Development Tools**: Concurrent execution of client and server for improved developer experience
- **Health Monitoring**: Production-ready endpoints for container orchestration

### Deployment Options
- **Docker Hub**: `docker run -d -p 5000:5000 hndrwn/s3-migration-scheduler:1.1.0`
- **Docker Compose**: `docker-compose up -d` for full stack deployment
- **Traditional**: Enhanced with `npm run install:all` and `npm run dev:stable`

## [1.0.0] - 2025-01-07

### Added
- **🎉 Initial Production Release**
- **🖥️ Desktop Application Support**
  - Full Electron-based desktop application for Windows, Linux, and macOS
  - Windows installer, portable, and ZIP distribution options
  - Professional UI with modern React interface

- **🏆 Enterprise-Grade Reconciliation System**
  - Handles millions of objects efficiently with streaming technology
  - 3-tier object detection system for accurate counting
  - Database-driven comparison for lightning-fast difference analysis
  - Memory-efficient processing for massive S3 buckets
  - Progressive verification with checkpoint-based resumable reconciliation

- **📅 Advanced Scheduling & Automation**
  - Cron-based scheduling with node-cron backend
  - One-time and recurring migration support
  - Timezone support for global deployments
  - Migration queuing with smart queue management
  - Countdown timers and reschedule/cancel options

- **💾 Persistent SQLite Database**
  - Complete migration history tracking
  - Configuration persistence
  - Large-scale reconciliation data storage
  - Detailed migration statistics and metrics

- **🔄 Real-time Monitoring**
  - WebSocket + Server-Sent Events (SSE) dual real-time connections
  - Live progress tracking with detailed statistics
  - Real-time dashboard with persistent data
  - Comprehensive error tracking and analysis

- **🌐 Multi-Cloud S3 Support**
  - AWS S3, Google Cloud Storage, Azure Blob Storage
  - MinIO, Wasabi, and other S3-compatible services
  - Built-in MinIO client with no external dependencies
  - Connection testing and alias management

- **🔍 Detailed Reconciliation Reports**
  - Missing files, extra files, and size difference detection
  - File-level details with full paths and URLs
  - Actionable reconciliation modals
  - Comprehensive difference analysis

### Features
- **Migration Management**: Source/destination configuration, object filtering, bandwidth throttling
- **Progress Tracking**: Real-time updates with detailed statistics and error handling
- **Configuration**: S3 endpoint setup with connection validation
- **History**: Persistent migration tracking with status filtering
- **Logs**: Real-time monitoring with comprehensive reconciliation reports

### Technical Architecture
- **Frontend**: React 18.x with TypeScript 5.x
- **Backend**: Node.js 18.x with Express server
- **Database**: SQLite for persistence
- **Real-time**: WebSocket + SSE connections
- **Desktop**: Electron for cross-platform desktop apps
- **Scheduling**: node-cron for automation

---

## Release Asset Information

### v1.1.0 Release Assets
When creating the GitHub release, include these assets:

#### Desktop Applications
- `s3-migration-scheduler-1.1.0-win.exe` - Windows installer
- `s3-migration-scheduler-1.1.0-win-x64.zip` - Windows portable
- `s3-migration-scheduler-1.1.0.AppImage` - Linux AppImage
- `s3-migration-scheduler_1.1.0_amd64.deb` - Debian package
- `s3-migration-scheduler-1.1.0.dmg` - macOS disk image (if available)

#### Source Code
- `Source code (zip)` - Automatically generated by GitHub
- `Source code (tar.gz)` - Automatically generated by GitHub

#### Docker
- Docker images available on Docker Hub: `hndrwn/s3-migration-scheduler:1.1.0`

### Links
- **Full Changelog**: https://github.com/hndrwn-dk/s3-migration-scheduler/compare/v1.0.0...v1.1.0
- **Docker Hub**: https://hub.docker.com/r/hndrwn/s3-migration-scheduler
- **Documentation**: https://github.com/hndrwn-dk/s3-migration-scheduler/blob/main/docs/