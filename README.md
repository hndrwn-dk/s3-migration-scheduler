# S3 Migration Scheduler

**🎉 Production-Ready Desktop & Web Application** - Successfully migrate S3 buckets with enterprise-grade scheduling, monitoring, and reconciliation capabilities.

## 🌟 **Major Accomplishments**

### ✅ **Desktop Application Ready**
- **Windows**: Full desktop app with installer, portable, and ZIP packages 
- **Cross-platform**: Electron-based for Windows, Linux, and macOS
- **Professional UI**: Modern React interface with real-time updates

### ✅ **Enterprise-grade Reconciliation**
- **Handles millions of objects** efficiently with streaming technology
- **3-tier detection system** for accurate object counting
- **Database-driven comparison** for lightning-fast difference analysis
- **Memory-efficient processing** for massive S3 buckets

### ✅ **Production Deployment Options**
- **Docker containers** for cloud and server deployment
- **Standalone executables** for individual workstations
- **Web interface** for browser-based access

## 🚀 Quick Start

### 📦 **Download & Install**
Choose your preferred platform:

- **[🪟 Windows](docs/windows/)** - Desktop app with installer, portable, and ZIP options
- **[🐧 Linux](docs/linux/)** - AppImage, DEB, RPM, and TAR.GZ packages  
- **[🐳 Docker](docs/docker/)** - Container deployment for servers and cloud

### 📥 **Current Releases**
- **✅ Windows v1.0.0** - [Available on GitHub Releases](https://github.com/hndrwn-dk/s3-migration-scheduler/releases)
  - `S3 Migration Scheduler-1.0.0-win-x64.zip` (Recommended)
  - `S3 Migration Scheduler-1.0.0-win-x64.exe` (Installer)
  - Ready for production use!

### 🌟 **Key Features**
- 📅 **Advanced Scheduling** - Cron-based automation with recurring migrations
- 📊 **Real-time Monitoring** - Live progress tracking with WebSocket updates
- 🗃️ **Large-scale Reconciliation** - Efficiently handles millions of objects
- 💾 **SQLite Database** - Persistent migration history and configuration
- 🔧 **Built-in MinIO Client** - No external dependencies required
- 🖥️ **Cross-platform** - Windows, Linux, macOS, and Docker support

## 📦 Installation Guides

### 🪟 Windows (✅ **READY**)
- **[Quick Installation Guide](docs/windows/README.md)** - ZIP, installer, and portable options
- **[Download from Releases](https://github.com/hndrwn-dk/s3-migration-scheduler/releases)** - Ready-to-use packages
- **[Packaging Guide](docs/windows/WINDOWS_PACKAGING_GUIDE.md)** - For developers
- **[Troubleshooting](docs/windows/WINDOWS_BUILD_TROUBLESHOOTING.md)** - Common issues and solutions

### 🐧 Linux  
- **[Installation Guide](docs/linux/README.md)** - AppImage, DEB, RPM, TAR.GZ
- **[System Service Setup](docs/linux/README.md#systemd-service-system-wide)** - Run as daemon
- **[Build from Source](docs/linux/README.md#build-from-source)** - Development setup

### 🐳 Docker
- **[Docker Deployment](docs/docker/README.md)** - Container setup and configuration
- **[Docker Compose](docs/docker/docker-compose.yml)** - Development environment
- **[Production Setup](docs/docker/docker-compose.prod.yml)** - Production-ready configuration

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Electron UI   │    │   Web Browser   │    │   Docker Web    │
│   (Desktop)     │    │   (Development) │    │   (Production)  │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼───────────────┐
                    │      Express Server        │
                    │   • REST API              │
                    │   • WebSocket Server      │
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

### Local Development Setup
```bash
# Clone repository
git clone https://github.com/hndrwn-dk/s3-migration-scheduler.git
cd s3-migration-scheduler

# Install dependencies
npm install

# Install client dependencies and build
cd client && npm install && npm run build && cd ..

# Install server dependencies
cd server && npm install && cd ..

# Install electron dependencies
cd electron-app && npm install && cd ..

# Start development servers
npm run dev  # Starts both backend and frontend
```

### Build from Source
```bash
# Build client
cd client && npm run build && cd ..

# Build Windows app (✅ TESTED & WORKING)
cd electron-app && npm run build:win && cd ..

# Build Linux app  
cd electron-app && npm run build:linux && cd ..

# Build Docker image
docker build -t s3-migration-scheduler .
```

## 📚 Documentation

### 🔧 Technical Documentation
- **[Large Scale Reconciliation](docs/development/LARGE_SCALE_RECONCILIATION.md)** - **✅ IMPLEMENTED** Advanced reconciliation system
- **[Concurrent Users & Detection](docs/development/CONCURRENT_USERS_AND_DETECTION.md)** - Multi-user management
- **[Migration Workflow](docs/development/MIGRATION_WORKFLOW_DIAGRAM.md)** - Process diagrams
- **[Local Testing Guide](docs/development/LOCAL_TESTING_GUIDE.md)** - Development and testing

### 🚀 CI/CD & Deployment
- **[CI/CD Workflows](docs/ci-cd/)** - GitHub Actions automation
- **[Docker Deployment](docs/docker/DOCKER_DEPLOYMENT.md)** - Container deployment guide

## 🌟 Features in Detail

### Migration Management
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
GET    /api/health              # Health check
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
- **Application version** or commit hash
- **Error messages** and logs
- **Steps to reproduce** the issue
- **Expected vs actual behavior**

## 🔗 Links

- **[GitHub Repository](https://github.com/hndrwn-dk/s3-migration-scheduler)**
- **[Releases](https://github.com/hndrwn-dk/s3-migration-scheduler/releases)**
- **[Issue Tracker](https://github.com/hndrwn-dk/s3-migration-scheduler/issues)**
- **[Documentation](docs/)**

---

**Built with ❤️ for the S3 migration community**
