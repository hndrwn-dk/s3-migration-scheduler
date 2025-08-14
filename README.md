# S3 Migration Scheduler

**🎉 Production-Ready Desktop & Web Application** - 
A comprehensive, enterprise-grade fullstack application for S3 bucket migrations with persistent SQLite database, scheduled migration support, real-time monitoring, and detailed reconciliation tracking. Features a modern React dashboard with TypeScript, node-cron scheduling, dual real-time connections (WebSocket + SSE), and comprehensive migration difference analysis.

![S3 Bucket Migration UI](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![Version](https://img.shields.io/badge/Version-1.1.0-blue)
![Database](https://img.shields.io/badge/Database-SQLite-blue)
![Scheduling](https://img.shields.io/badge/Scheduling-node--cron-purple)
![Docker](https://img.shields.io/badge/Docker-Hub%20Ready-blue)
![Node.js](https://img.shields.io/badge/Node.js-18.x-green)
![React](https://img.shields.io/badge/React-18.x-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![Real-time](https://img.shields.io/badge/Real--time-WebSocket%2BSSE-orange)

## ☕ Support Me

If you find this project helpful, you can support me here:

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-yellow?style=for-the-badge&logo=buymeacoffee&logoColor=white)](https://buymeacoffee.com/hendrawan)

## 🚀 **Quick Start - New in v1.1.0!**

### 🐳 **Docker Hub Deployment (Recommended)**
Get started in seconds with our pre-built Docker images:

```bash
# One-command deployment
docker run -d -p 5000:5000 -v ./data:/app/data hndrwn/s3-migration-scheduler:1.1.0

# Or use docker-compose for full stack
git clone https://github.com/hndrwn-dk/s3-migration-scheduler
cd s3-migration-scheduler
docker-compose up -d
```

**🌐 Access at**: http://localhost:5000

### 📦 **Traditional Installation**
```bash
# Clone and install
git clone https://github.com/hndrwn-dk/s3-migration-scheduler
cd s3-migration-scheduler

# One command to install all dependencies
npm run install:all

# Start development with new concurrent mode
npm run dev:stable
```

## 📑 Table of Contents
- [☕ Support Me](#-support-me)
- [🚀 Quick Start](#-quick-start)
- [🎯 What's New in v1.1.0](#-whats-new-in-v110)
- [📸 Screenshots](#-screenshots)
- [🌟 Major Accomplishments](#-major-accomplishments)
- [📦 Installation Guides](#-installation-guides)
- [🏗️ Architecture](#️-architecture)
- [🛠️ Development](#️-development)
- [📚 Documentation](#-documentation)
- [🌟 Features in Detail](#-features-in-detail)
- [🏷️ API Reference](#️-api-reference)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

## 🎯 **What's New in v1.1.0**

### ✨ **Major Features**
- **🐳 Complete Docker Hub Integration** - Pre-built images ready for production
- **🗂️ Enhanced Bucket Selector** - Improved performance for large-scale deployments
- **🛠️ New Development Tools** - Concurrent client/server development with `npm run dev:stable`
- **📦 Automated Build Scripts** - Cross-platform Docker build and publish automation

### 🔧 **Technical Improvements**
- **Docker Compose Support** - One-command deployment with MinIO testing environment
- **Health Check Endpoints** - Production-ready monitoring capabilities
- **Cross-platform Build Scripts** - Windows `.bat` and Linux `.sh` automation
- **Optimized Docker Images** - Multi-stage builds with efficient caching

### 🌐 **Docker Hub Repository**
- **Repository**: [hndrwn/s3-migration-scheduler](https://hub.docker.com/r/hndrwn/s3-migration-scheduler)
- **Tags**: `1.1.0`, `latest`
- **Architecture**: `linux/amd64`

## 📸 Screenshots

### Enhanced Dashboard with SQLite Persistence
*Real-time migration statistics with persistent data and accurate metrics*

![Dashboard Overview](https://github.com/hndrwn-dk/s3-migration-scheduler/blob/main/docs/images/dashboard-overview.png?raw=true)
> 📊 **Main Dashboard** - Shows persistent migration statistics with SQLite database, real-time updates via WebSocket+SSE, accurate completion rates, and recent migration activity. 

### S3 Endpoint Configuration
*Simple S3 alias setup with connection validation*

![Configuration](https://github.com/hndrwn-dk/s3-migration-scheduler/blob/main/docs/images/configuration.png?raw=true)
> ⚙️ **Configuration Tab** - Clean interface for adding AWS S3, GCP Cloud Storage, Azure Blob Storage, MinIO, wasabi, and other S3-compatible endpoints (Cloudian S3 Hyperstore, IBM Cloud Object Storage, Huawei S3, Pure Storage flashblade, etc.) with built-in connection testing and alias management.

### Advanced Migration Setup with Enhanced Bucket Selector
*Comprehensive migration wizard with improved bucket selection for large environments*

![Migration Setup](https://github.com/hndrwn-dk/s3-migration-scheduler/blob/main/docs/images/migration-advance-options-with_preview.png?raw=true)
> 🛠️ **Migration Tab** - Enhanced wizard with **new bucket selector optimized for large-scale deployments**, advanced options (overwrite, preserve, exclude patterns), scheduling capabilities, and dry-run capabilities.

### Scheduled Migration Management
*Schedule and manage future migrations*

![Scheduled Migrations](https://github.com/hndrwn-dk/s3-migration-scheduler/blob/main/docs/images/migration-advance-options-with_scheduled.png?raw=true)
> ⏰ **Scheduled Tab** - Complete scheduling system with `node-cron` backend, showing pending migrations with countdown timers, reschedule/cancel options, and automatic execution at specified times.

### Migration History with Reconciliation
*Complete migration tracking with detailed difference analysis*

![Migration History](https://github.com/hndrwn-dk/s3-migration-scheduler/blob/main/docs/images/migration-history.png?raw=true)

> 📚 **History Tab** - Persistent migration history with status filtering, detailed reconciliation reports showing missing/extra/size differences, and actionable reconciliation modals with file-level details.

### Detailed Reconciliation Reports
*In-depth difference analysis with actionable insights*

![Migration History](https://github.com/hndrwn-dk/s3-migration-scheduler/blob/main/docs/images/migration-reconcilation.png?raw=true)
![Migration History](https://github.com/hndrwn-dk/s3-migration-scheduler/blob/main/docs/images/migration-reconcilation_with_diff.png?raw=true)
> 🔍 **Reconciliation Modal** - Advanced difference analysis showing missing files, extra files, size differences, and other discrepancies with full file paths, sizes, and URLs for manual verification or remediation.

### Real-time Logs with Enhanced Details
*Live monitoring with comprehensive reconciliation and bucket analysis*

![Migration Logs](https://github.com/hndrwn-dk/s3-migration-scheduler/blob/main/docs/images/log-viewer.png?raw=true)
> 📊 **Logs Tab** - Real-time migration monitoring with enhanced logs including detailed reconciliation reports, bucket comparison analysis, file-by-file transfer tracking, and comprehensive error handling.

## 🌟 **Major Accomplishments**

### ✅ **Docker Production Ready** (🆕 v1.1.0)
- **Docker Hub Images**: Pre-built containers for instant deployment
- **Docker Compose**: Full stack with MinIO testing environment
- **Health Checks**: Production monitoring capabilities
- **Volume Mounting**: Persistent data and configuration

### ✅ **Desktop Application Ready**
- **Windows**: Full desktop app with installer, portable, and ZIP packages 
- **Cross-platform**: Electron-based for Windows, Linux, and macOS
- **Professional UI**: Modern React interface with real-time updates

### ✅ **Enterprise-grade Reconciliation**
- **Handles millions of objects** efficiently with streaming technology
- **3-tier detection system** for accurate object counting
- **Database-driven comparison** for lightning-fast difference analysis
- **Memory-efficient processing** for massive S3 buckets

### ✅ **Enhanced Development Experience** (🆕 v1.1.0)
- **Concurrent Development**: New `npm run dev:stable` for client+server
- **Automated Builds**: Cross-platform Docker build scripts
- **Better Dependencies**: Unified dependency management with `npm run install:all`

## 📦 Installation Guides

### 🐳 **Docker (✅ READY - v1.1.0)**
**Recommended for production deployments**

```bash
# Quick start with Docker Hub
docker run -d -p 5000:5000 hndrwn/s3-migration-scheduler:1.1.0

# Full stack with docker-compose
git clone https://github.com/hndrwn-dk/s3-migration-scheduler
cd s3-migration-scheduler
docker-compose up -d
```

- **[Docker Hub Repository](https://hub.docker.com/r/hndrwn/s3-migration-scheduler)** - Pre-built images
- **[Docker Deployment Guide](docs/DOCKER.md)** - Complete deployment documentation
- **[Build Scripts](scripts/)** - Automated build and push tools

### 🪟 **Windows (✅ READY)**
- **[Quick Installation Guide](docs/windows/README.md)** - ZIP, installer, and portable options
- **[Download v1.1.0 from Releases](https://github.com/hndrwn-dk/s3-migration-scheduler/releases)** - Ready-to-use packages
- **[Packaging Guide](docs/windows/WINDOWS_PACKAGING_GUIDE.md)** - For developers
- **[Troubleshooting](docs/windows/WINDOWS_BUILD_TROUBLESHOOTING.md)** - Common issues and solutions

### 🐧 **Linux**  
- **[Installation Guide](docs/linux/README.md)** - AppImage, DEB, RPM, TAR.GZ
- **[System Service Setup](docs/linux/README.md#systemd-service-system-wide)** - Run as daemon
- **[Build from Source](docs/linux/README.md#build-from-source)** - Development setup

### 📥 **Current Releases**
- **✅ Latest v1.1.0** - [Available on GitHub Releases](https://github.com/hndrwn-dk/s3-migration-scheduler/releases)
- **✅ Docker Images** - [Available on Docker Hub](https://hub.docker.com/r/hndrwn/s3-migration-scheduler)

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Electron UI   │    │   Web Browser   │    │   Docker Hub    │
│   (Desktop)     │    │   (Development) │    │   (Production)  │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼───────────────┐
                    │      Express Server        │
                    │   • REST API              │
                    │   • WebSocket Server      │
                    │   • Health Endpoints      │
                    │   • Cron Scheduler        │
                    │   • Migration Engine      │
                    │   • Reconciliation Engine │
                    └─────────────┬───────────────┘
                                 │
                    ┌─────────────▼───────────────┐
                    │     SQLite Database        │
                    │   • Migration History     │
                    │   • Configuration         │
                    │   • Reconciliation Data   │
                    │   • Large-scale Tracking  │
                    └─────────────┬───────────────┘
                                 │
                    ┌─────────────▼───────────────┐
                    │      MinIO Client          │
                    │   • S3 Operations         │
                    │   • Multi-cloud Support   │
                    │   • Stream Processing     │
                    │   • Massive Object Handling│
                    └─────────────────────────────┘
```

## 🛠️ Development

### Prerequisites
- **Node.js** 18+ 
- **npm** 8+
- **Git**
- **Docker** (optional, for containerization)

### Local Development Setup (🆕 Enhanced in v1.1.0)
```bash
# Clone repository
git clone https://github.com/hndrwn-dk/s3-migration-scheduler.git
cd s3-migration-scheduler

# Install all dependencies (new unified command)
npm run install:all

# Start concurrent development (new in v1.1.0)
npm run dev:stable  # Runs client and server simultaneously
```

### Build from Source
```bash
# Build client
npm run client:build

# Build Windows app (✅ TESTED & WORKING)
cd electron-app && npm run build:win

# Build Linux app  
cd electron-app && npm run build:linux

# Build and push Docker image (🆕 v1.1.0)
# Windows
.\scripts\docker-build-and-push.bat

# Linux/Mac
./scripts/docker-build-and-push.sh
```

### 🆕 **New Development Commands (v1.1.0)**
```bash
npm run dev:stable      # Concurrent client + server development
npm run install:all     # Install all project dependencies
npm run client:start    # Start React development server
npm run server:dev      # Start Express server in development
npm run client:build    # Build React production bundle
```

## 📚 Documentation

### 🔧 Technical Documentation
- **[Large Scale Reconciliation](docs/development/LARGE_SCALE_RECONCILIATION.md)** - **✅ IMPLEMENTED** Advanced reconciliation system
- **[Docker Deployment Guide](docs/DOCKER.md)** - **🆕 v1.1.0** Complete containerization guide
- **[Concurrent Users & Detection](docs/development/CONCURRENT_USERS_AND_DETECTION.md)** - Multi-user management
- **[Migration Workflow](docs/development/MIGRATION_WORKFLOW_DIAGRAM.md)** - Process diagrams
- **[Local Testing Guide](docs/development/LOCAL_TESTING_GUIDE.md)** - Development and testing

### 🚀 CI/CD & Deployment
- **[CI/CD Workflows](docs/ci-cd/)** - GitHub Actions automation
- **[Docker Hub Publishing](scripts/)** - **🆕 v1.1.0** Automated build scripts

## 🌟 Features in Detail

### Migration Management
- **Enhanced Bucket Selection** - **🆕 v1.1.0** Optimized for large-scale deployments
- **Source/Destination Configuration** - Support for any S3-compatible storage
- **Object Filtering** - Include/exclude patterns for selective migration
- **Bandwidth Throttling** - Control transfer speed to avoid overwhelming networks
- **Error Handling** - Automatic retry with exponential backoff
- **Progress Tracking** - Real-time updates with detailed statistics

### Scheduling & Automation
- **Cron Expressions** - Flexible scheduling with standard cron syntax
- **One-time Migrations** - Immediate execution option
- **Recurring Migrations** - Daily, weekly, monthly, or custom intervals
- **Timezone Support** - Schedule migrations in any timezone
- **Migration Queuing** - Smart queue management for multiple migrations

### **🏆 Advanced Reconciliation** (✅ **ENTERPRISE-GRADE SOLUTION**)
- **✅ Handles millions of objects** efficiently with streaming technology
- **✅ Smart Object Detection** - 3-tier approach for accurate object count estimation
- **✅ Streaming Inventory** - Memory-efficient processing of large buckets (1M+ objects)
- **✅ Database-driven Comparison** - Lightning-fast difference detection using SQL
- **✅ Detailed Reports** - Comprehensive reconciliation results with actionable insights
- **✅ Progressive Verification** - Checkpoint-based resumable reconciliation
- **✅ Scalable Architecture** - Designed for enterprise-scale S3 migrations

### Monitoring & Logging
- **Real-time Dashboard** - Live migration status and statistics
- **WebSocket Updates** - Instant progress notifications
- **Health Check Endpoints** - **🆕 v1.1.0** Production monitoring
- **Detailed Logging** - Migration-specific log files
- **Error Reporting** - Comprehensive error tracking and analysis
- **Historical Data** - Complete migration history with searchable records

## 🏷️ API Reference

### REST Endpoints
```
GET    /api/migrations          # List all migrations
POST   /api/migrations          # Create new migration
GET    /api/migrations/:id      # Get migration details
PUT    /api/migrations/:id      # Update migration
DELETE /api/migrations/:id      # Delete migration
POST   /api/migrations/:id/start # Start migration
POST   /api/migrations/:id/stop  # Stop migration
GET    /api/health              # Health check (🆕 v1.1.0)
```

### WebSocket Events
```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:5000');

// Listen for migration updates
ws.on('migration-update', (data) => {
  console.log('Migration progress:', data);
});

// Listen for reconciliation updates
ws.on('reconciliation-update', (data) => {
  console.log('Reconciliation progress:', data);
});
```

## 🤝 Contributing

### Ways to Contribute
- 🐛 **Report Bugs** - [Open an issue](https://github.com/hndrwn-dk/s3-migration-scheduler/issues)
- 💡 **Request Features** - [Suggest enhancements](https://github.com/hndrwn-dk/s3-migration-scheduler/issues)
- 📖 **Improve Documentation** - Help make docs clearer
- 🔧 **Submit Pull Requests** - Fix bugs or add features

### Development Workflow
1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Code Standards
- **ESLint** configuration for consistent code style
- **Prettier** for code formatting
- **Jest** for unit testing
- **Conventional Commits** for commit messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Getting Help
- **📖 Documentation** - Check platform-specific guides in `/docs/`
- **🐛 Issues** - [GitHub Issues](https://github.com/hndrwn-dk/s3-migration-scheduler/issues)
- **💬 Discussions** - [GitHub Discussions](https://github.com/hndrwn-dk/s3-migration-scheduler/discussions)

### Reporting Issues
When reporting issues, please include:
- **Operating System** and version
- **Application version** (now v1.1.0) or commit hash
- **Error messages** and logs
- **Steps to reproduce** the issue
- **Expected vs actual behavior**

## 🔗 Links

- **[GitHub Repository](https://github.com/hndrwn-dk/s3-migration-scheduler)**
- **[Releases](https://github.com/hndrwn-dk/s3-migration-scheduler/releases)**
- **[Docker Hub](https://hub.docker.com/r/hndrwn/s3-migration-scheduler)** - **🆕 v1.1.0**
- **[Issue Tracker](https://github.com/hndrwn-dk/s3-migration-scheduler/issues)**
- **[Documentation](docs/)**

---

**Built with ❤️ for the S3 migration community**

*Latest Release: v1.1.0 with Docker Hub integration and enhanced deployment options*
