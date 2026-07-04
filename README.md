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

## 📑 Table of Contents
- [☕ Support Me](#-support-me)
- [🚀 Quick Start](#-quick-start)
- [🎯 What's New in v1.1.0](#-whats-new-in-v110)
- [📸 Screenshots](#-screenshots)
- [📦 Installation Guides](#-installation-guides)
- [🏗️ Architecture](#-architecture)
- [🛠️ Development](#-development)
- [🏷️ API Reference](#-api-reference)
- [📄 License](#-license)
- [🆘 Support](#-support)

## ☕ Support Me

If you find this project helpful, you can support me here:

[![Ko-fi](https://img.shields.io/badge/Ko--fi-Support%20Me-ff5e5b?style=for-the-badge&logo=ko-fi&logoColor=white)](https://ko-fi.com/hendrawandaryonokarso)

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

## 🚀 **Quick Start**

### 🐳 **Docker Hub Deployment (Recommended)**
Get started in seconds with our pre-built Docker images:

```bash
# One-command deployment
docker run -d -p 8080:8080 -v ./data:/app/data hndrwn/s3-migration-scheduler:1.1.0

# Or use docker-compose for full stack
git clone https://github.com/hndrwn-dk/s3-migration-scheduler
cd s3-migration-scheduler
docker-compose up -d
```

**🌐 Access at**: http://localhost:8080

## 📦 Installation Guides

### 📦 **Traditional Installation**
**Recommended for production deployments**

```bash
# Clone and install
git clone https://github.com/hndrwn-dk/s3-migration-scheduler
cd s3-migration-scheduler

# One command to install all dependencies
npm run install:all

# Start development with new concurrent mode
npm run dev:stable
```
### 🐳 **Docker**
- **[Docker Hub Repository](https://hub.docker.com/r/hndrwn/s3-migration-scheduler)** - Pre-built images
- **[Docker Deployment Guide](docs/docker/README.md)** - Complete deployment documentation
- **[Build Scripts](scripts/build/docker/)** - Automated build and push tools

### 🪟 **Windows**
- **[Quick Installation Guide](docs/windows/README.md)** - ZIP, installer, and portable options
- **[Download v1.1.0 from Releases](https://github.com/hndrwn-dk/s3-migration-scheduler/releases)** - Ready-to-use packages
- **[Packaging Guide](docs/windows/BUILD.md)** - For developers
- **[Build Scripts](scripts/build/windows/)** - Automated build and push tools

### 🐧 **Linux**  
- **[Installation Guide](docs/linux/README.md)** - AppImage, DEB, RPM, TAR.GZ
- **[Build from Source](docs/linux/BUILD.md)** - Development setup

### 📥 **Current Releases**
- **✅ Latest v1.1.0** - [Available on GitHub Releases](https://github.com/hndrwn-dk/s3-migration-scheduler/releases)
- **✅ Docker Images** - [Available on Docker Hub](https://hub.docker.com/r/hndrwn/s3-migration-scheduler)

## 🏗 Architecture

![Architecture](https://raw.githubusercontent.com/hndrwn-dk/s3-migration-scheduler/refs/heads/main/docs/images/architecture.png)

## 🛠 Development

### Prerequisites
- **Node.js** 18+ 
- **npm** 8+
- **Git**
- **Docker** (optional, for containerization)

### Local Development Setup
```bash
# Clone repository
git clone https://github.com/hndrwn-dk/s3-migration-scheduler.git
cd s3-migration-scheduler

# Install all dependencies
npm run install:all

# Start concurrent development
npm run dev:stable  # Runs client and server simultaneously
```

### Build from Source
```bash
# Build client
npm run client:build

# Build Windows app
cd electron-app && npm run build:win

# Build Linux app  
cd electron-app && npm run build:linux

# Build and push Docker image)
# Windows
.\scripts\docker-build-and-push.bat

# Linux/Mac
./scripts/docker-build-and-push.sh
```

### 🆕 **New Development Commands**
```bash
npm run dev:stable      # Concurrent client + server development
npm run install:all     # Install all project dependencies
npm run client:start    # Start React development server
npm run server:dev      # Start Express server in development
npm run client:build    # Build React production bundle
```

## 🏷 API Reference

### REST Endpoints
```
GET    /api/migrations           # List all migrations
POST   /api/migrations           # Create new migration
GET    /api/migrations/:id       # Get migration details
PUT    /api/migrations/:id       # Update migration
DELETE /api/migrations/:id       # Delete migration
POST   /api/migrations/:id/start # Start migration
POST   /api/migrations/:id/stop  # Stop migration
GET    /api/health               # Health check (🆕 v1.1.0)
```

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

---

**Built with ❤️ for the S3 migration community**

*Latest Release: v1.1.0 with Docker Hub integration and enhanced deployment options*
