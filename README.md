# S3 Migration Dashboard

A comprehensive, enterprise-grade fullstack application for managing S3 bucket migrations with persistent SQLite database, real-time monitoring, and detailed reconciliation tracking. Features a modern React dashboard with TypeScript, dual real-time connections (WebSocket + SSE), and comprehensive migration difference analysis.

![S3 Migration Dashboard](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![Database](https://img.shields.io/badge/Database-SQLite-blue)
![Node.js](https://img.shields.io/badge/Node.js-18.x-green)
![React](https://img.shields.io/badge/React-18.x-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![Real-time](https://img.shields.io/badge/Real--time-WebSocket%2BSSE-orange)

## 🎯 **Current Status & Recent Improvements**

### ✅ **Latest Features (v2.0.0)**
- **🗄️ SQLite Database**: Persistent migration storage with ACID transactions
- **📊 Accurate Statistics**: Real-time dashboard with database-driven metrics
- **🔍 Reconciliation Tracking**: Detailed analysis of migration differences
- **🔄 Dual Connectivity**: WebSocket + SSE fallback for reliable real-time updates
- **📈 Enhanced Monitoring**: Comprehensive migration lifecycle tracking
- **🎨 Improved UX**: Modern interface with detailed status indicators

### 🔧 **Issues Recently Resolved**
- ✅ Dashboard statistics now show accurate completion rates (no more 0% success)
- ✅ Migration history persists across server restarts and page refreshes
- ✅ "completed_with_differences" status includes detailed reconciliation reports
- ✅ Consistent migration counts across all components
- ✅ Real-time updates with automatic fallback mechanisms

## 📑 Table of Contents

- [🎯 Current Status & Recent Improvements](#-current-status--recent-improvements)
- [📸 Screenshots](#-screenshots)
- [🚀 Quick Start](#-quick-start)
- [🚀 Features](#-features)
- [🔧 Recent Major Improvements](#-recent-major-improvements)
- [📋 Prerequisites](#-prerequisites)
- [🛠️ Installation](#️-installation)
- [⚙️ Configuration](#️-configuration)
- [📖 Usage Guide](#-usage-guide)
- [🏗️ Architecture](#️-architecture)
- [📚 API Reference](#-api-reference)
- [🔧 Development](#-development)
- [📊 Performance](#-performance)
- [🔒 Security](#-security)
- [📄 License](#-license)

## 📸 Screenshots

### Dashboard Overview
*Real-time migration statistics and progress monitoring*

![Dashboard Overview](https://github.com/hndrwn-dk/s3-management-ui/blob/main/docs/images/dashboard-overview.svg?raw=true)
> 📊 **Main Dashboard** - Shows migration statistics, recent activity, and visual charts for tracking migration trends and status distribution.

### Migration Configuration
*Easy setup for S3 endpoints and connections*

![Configuration](https://github.com/hndrwn-dk/s3-management-ui/blob/main/docs/images/configuration.svg?raw=true)
> ⚙️ **Configuration Tab** - Simple interface to add and manage S3 endpoints with connection testing capabilities.

### Migration Wizard
*Step-by-step migration setup with bucket analysis*

![Migration Wizard](https://github.com/hndrwn-dk/s3-management-ui/blob/main/docs/images/migration-wizard.svg?raw=true)
> 🚀 **Migration Tab** - Guided migration setup with bucket analysis, size estimates, and advanced options.

### Real-time Progress
*Live migration monitoring with detailed progress*

![Progress Monitoring](https://github.com/hndrwn-dk/s3-management-ui/blob/main/docs/images/progress-monitoring.svg?raw=true)
> 📈 **Progress Tracking** - Real-time migration progress with transfer statistics and WebSocket updates.

### Migration History
*Complete history with detailed views and filtering*

![Migration History](https://github.com/hndrwn-dk/s3-management-ui/blob/main/docs/images/migration-history.svg?raw=true)
> 📋 **History Tab** - Comprehensive migration history with filtering, sorting, and detailed modal views.

### Live Log Viewer
*Real-time log streaming with filtering and export*

![Log Viewer](https://github.com/hndrwn-dk/s3-management-ui/blob/main/docs/images/log-viewer.svg?raw=true)
> 📝 **Logs Tab** - Live log streaming with filtering, highlighting, and export capabilities.

> **📷 Note**: The screenshots above are placeholders. To add actual UI screenshots, run the application and use:
> ```bash
> # Generate screenshot guidelines
> ./scripts/generate-screenshots.sh
> 
> # Enable screenshots in README (after taking them)
> ./scripts/enable-screenshots.sh
> ```

## 🚀 Quick Start

### Linux/macOS
```bash
# 1. Clone the repository
git clone https://github.com/hndrwn-dk/s3-management-ui.git
cd s3-management-ui

# 2. Run automated setup (creates start.sh)
chmod +x scripts/setup-linux.sh
./scripts/setup-linux.sh

# 3. Start the application
./start.sh
```

### Windows
```batch
# 1. Clone the repository
git clone https://github.com/hndrwn-dk/s3-management-ui.git
cd s3-management-ui

# 2. Run automated setup (creates start.bat)
scripts\setup-windows.bat

# 3. Start the application
start.bat
```

**Dashboard available at:** http://localhost:3000  
**API server available at:** http://localhost:5000

> 💡 **Note**: The setup scripts will:
> - Check for all prerequisites (Node.js, npm, MinIO client)
> - Install all dependencies automatically
> - Create platform-specific start scripts (`start.sh` or `start.bat`)
> - Set up environment configuration

---

## 🚀 Features

### Dashboard & Monitoring
- **Real-time Dashboard** - Live migration statistics and progress tracking
- **Interactive Charts** - Migration trends and status distribution
- **WebSocket Updates** - Real-time progress updates without page refresh
- **Comprehensive Logging** - Detailed migration logs with filtering and export

### Migration Management
- **Easy Configuration** - Simple setup for S3 endpoints (AWS S3, MinIO, etc.)
- **Bucket Analysis** - Pre-migration analysis with size estimates and recommendations
- **Advanced MinIO Options** - Enterprise-grade migration features:
  - **Checksum Verification** - CRC64NVME, CRC32, CRC32C, SHA1, SHA256 algorithms for data integrity
  - **Preserve Attributes** - Maintain file/object attributes and bucket policies/locking configurations
  - **Retry Mechanism** - Automatic retry on per-object basis for error handling
  - **Dry Run Mode** - Test migrations without actual file transfer
- **Migration Options** - Support for overwrite, remove, and exclude patterns
- **Data Reconciliation** - Automatic verification after migration completion
- **Progress Tracking** - Real-time progress bars and transfer statistics

### User Experience
- **Modern UI** - Clean, responsive interface built with React and Tailwind CSS
- **Error Handling** - Comprehensive error logging and user feedback
- **Mobile Responsive** - Works seamlessly on desktop and mobile devices
- **Accessibility** - WCAG compliant with keyboard navigation support

## 🔧 Recent Major Improvements

### 🗄️ **SQLite Database Implementation**

**Replaced JSON file storage with robust SQLite database for enterprise-grade data persistence:**

```
Previous Architecture    =>    New Architecture
┌─────────────────────┐       ┌──────────────────────┐
│ JSON File Storage   │       │ SQLite Database      │
│ - In-memory Map     │       │ - Persistent tables  │
│ - Manual file writes│       │ - Auto transactions  │
│ - Data loss restart │       │ - ACID compliance    │
│ - No relationships  │       │ - Indexed queries    │
└─────────────────────┘       └──────────────────────┘
```

**Benefits:**
- ✅ **Data Persistence**: Survives server restarts and crashes
- ✅ **ACID Transactions**: Guaranteed data integrity
- ✅ **Performance**: Indexed queries for fast data retrieval
- ✅ **Scalability**: Handles thousands of migrations efficiently

### 📊 **Enhanced Dashboard Statistics**

**Fixed critical dashboard issues and added real-time database-driven statistics:**

- ✅ **Accurate Completion Rates**: No more "0 Completed, 0.0% success rate" despite active migrations
- ✅ **Real-time Updates**: Auto-refresh every 30 seconds with live data
- ✅ **Persistent Statistics**: Data remains consistent across page refreshes
- ✅ **Enhanced Metrics**: Recent activity tracking, data transfer volumes, average speeds

### 🔍 **Migration Reconciliation & Difference Tracking**

**New comprehensive reconciliation system for "completed_with_differences" migrations:**

**ReconciliationModal Features:**
- 🔴 **Missing Files**: Files in source but not in destination
- 🔵 **Extra Files**: Files in destination but not in source  
- 🟠 **Size Differences**: Files with different sizes between source/destination
- 🟡 **General Differences**: Other reconciliation issues and conflicts

**Visual Indicators:**
- Orange warning badges for migrations with differences
- Detailed modal dialogs with categorized file listings
- File count summaries and size difference analysis
- Export capabilities for reconciliation reports

### 🔄 **Dual Real-time Connectivity**

**Enhanced real-time updates with automatic fallback mechanisms:**

**Implementation:**
```
WebSocket (Primary) + Server-Sent Events (Fallback)
     ↓                           ↓
Real-time Dashboard ←→ Auto-switching Connection
```

**Features:**
- ✅ **Primary WebSocket**: Low-latency bidirectional communication
- ✅ **SSE Fallback**: Automatic fallback when WebSocket fails
- ✅ **Connection Status**: Visual indicators showing active connection type
- ✅ **Automatic Recovery**: Seamless reconnection with exponential backoff

### 📈 **Improved Migration Lifecycle Management**

**Enhanced tracking and monitoring throughout the complete migration process:**

- ✅ **Persistent Status Tracking**: Migration states survive server restarts
- ✅ **Comprehensive Logging**: Database-backed logs with file fallback
- ✅ **Auto-cleanup**: Automatic detection and cleanup of stale migrations
- ✅ **Consistent UI**: Synchronized data across Dashboard, History, and Logs

### 🎨 **User Experience Enhancements**

**Modern interface improvements with better information display:**

- ✅ **Recent Migrations Section**: Quick access to recent activity on Dashboard
- ✅ **Enhanced History Tab**: Proper filtering and reconciliation integration
- ✅ **Improved Logs Tab**: Better error handling and auto-refresh for active migrations
- ✅ **Color-coded Status**: Intuitive visual indicators for all migration states
- ✅ **Action Buttons**: Quick access to logs and reconciliation details

### 🔧 **Technical Improvements**

**Backend architecture enhancements for reliability and performance:**

**Database Schema:**
```sql
-- Comprehensive migration tracking
CREATE TABLE migrations (
  id TEXT PRIMARY KEY,
  config_source TEXT NOT NULL,
  config_destination TEXT NOT NULL,
  status TEXT NOT NULL,
  progress INTEGER DEFAULT 0,
  start_time TEXT NOT NULL,
  reconciliation_differences TEXT DEFAULT '[]',
  -- ... additional fields for complete tracking
);

-- Structured logging
CREATE TABLE migration_logs (
  migration_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  FOREIGN KEY (migration_id) REFERENCES migrations (id)
);
```

**API Enhancements:**
- ✅ **New Endpoints**: `/api/migration/status` for system statistics
- ✅ **SSE Streaming**: `/api/migration/stream` for real-time updates
- ✅ **Enhanced Responses**: Comprehensive data sanitization and validation
- ✅ **Backward Compatibility**: Automatic import of existing JSON data

## 📋 System Requirements & Prerequisites

### Linux Requirements
**Required Software:**
- **Operating System**: Ubuntu 18.04+, CentOS 7+, Debian 9+, RHEL 7+, or similar
- **Node.js**: Version 18.x or higher (LTS recommended)
- **npm**: Version 8.x or higher (included with Node.js)
- **Git**: For repository cloning
- **curl/wget**: For downloading packages and MinIO client

**System Dependencies:**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nodejs npm git curl build-essential

# CentOS/RHEL/Rocky/AlmaLinux
sudo yum install nodejs npm git curl gcc-c++ make
# Or for newer versions: sudo dnf install nodejs npm git curl gcc-c++ make

# Arch Linux
sudo pacman -S nodejs npm git curl base-devel

# Verify installation
node --version    # Should show 18.x or higher
npm --version     # Should show 8.x or higher
git --version
```

**MinIO Client Installation (Linux):**
```bash
# Method 1: Direct download (recommended)
sudo curl https://dl.min.io/client/mc/release/linux-amd64/mc \
  -o /usr/local/bin/mc
sudo chmod +x /usr/local/bin/mc

# Method 2: User directory
curl https://dl.min.io/client/mc/release/linux-amd64/mc \
  --create-dirs -o $HOME/.local/bin/mc
chmod +x $HOME/.local/bin/mc
echo 'export PATH=$PATH:$HOME/.local/bin' >> ~/.bashrc
source ~/.bashrc

# Verify installation
mc --version
```

### Windows Requirements
**Required Software:**
- **Operating System**: Windows 10 (version 1903+) or Windows 11
- **Node.js**: Version 18.x or higher (LTS from nodejs.org)
- **npm**: Version 8.x or higher (included with Node.js)
- **Git for Windows**: Latest version from git-scm.com
- **PowerShell**: 5.1+ (built-in) or PowerShell 7+ (recommended)

**Installation Steps:**
1. **Install Node.js:**
   - Download from: https://nodejs.org/en/download/
   - Choose "Windows Installer" (.msi) for your architecture
   - During installation: Check "Add to PATH" and "Install additional tools"
   - Restart terminal after installation

2. **Install Git for Windows:**
   - Download from: https://git-scm.com/download/win
   - Use default settings during installation
   - Choose "Git from the command line and also from 3rd-party software"

3. **Verify Installation:**
   ```batch
   node --version
   npm --version
   git --version
   ```

**MinIO Client Installation (Windows):**
```batch
# Method 1: Using winget (Windows 10 1809+/Windows 11)
winget install MinIO.MinIOClient

# Method 2: Direct download
curl -L https://dl.min.io/client/mc/release/windows-amd64/mc.exe -o mc.exe
# Move mc.exe to a directory in your PATH (e.g., C:\Windows\System32)

# Method 3: PowerShell download
powershell -Command "Invoke-WebRequest -Uri 'https://dl.min.io/client/mc/release/windows-amd64/mc.exe' -OutFile 'mc.exe'"

# Verify installation
mc --version
```

### macOS Requirements
**Required Software:**
- **Operating System**: macOS 10.15 (Catalina) or higher
- **Node.js**: Version 18.x or higher
- **npm**: Version 8.x or higher
- **Git**: Pre-installed or via Xcode Command Line Tools
- **Homebrew**: Package manager (recommended)

**Installation:**
```bash
# Install Homebrew (if not already installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js and Git
brew install node git

# Or install Node.js directly from nodejs.org
# Verify installation
node --version
npm --version
git --version
```

**MinIO Client Installation (macOS):**
```bash
# Method 1: Using Homebrew (recommended)
brew install minio/stable/mc

# Method 2: Direct download
curl https://dl.min.io/client/mc/release/darwin-amd64/mc \
  -o /usr/local/bin/mc
chmod +x /usr/local/bin/mc

# Verify installation
mc --version
```

### Storage Requirements
- **S3 Compatible Storage**: AWS S3, MinIO, DigitalOcean Spaces, or similar
- **Network Access**: Internet connection for S3 operations
- **Disk Space**: At least 1GB free space for dependencies and logs

### 📦 Portable Deployment Setup (Recommended)

For **portable, self-contained deployment**:

1. **Download MinIO Client (`mc`)** from: https://min.io/download#/linux or https://min.io/download#/windows
2. **Copy to your project root**: 
   - **Windows**: `s3-management-ui/mc.exe`
   - **Linux/macOS**: `s3-management-ui/mc`
3. **The application automatically detects and uses the local MinIO client**

> 🎯 **Detection Priority (Portable-First):**
> 1. ✅ **Project root**: `./mc.exe` or `./mc` (YOUR SETUP)
> 2. ✅ **Server folder**: `./server/mc.exe` or `./server/mc`  
> 3. ✅ **Bin folder**: `./bin/mc.exe` or `./bin/mc`
> 4. 🔄 System locations (fallback only)
> 5. 🔄 PATH (final fallback)

> 💡 **Benefits of Portable Setup:**
> - ✅ **Self-contained**: No system-wide installation needed
> - ✅ **Consistent**: Same mc version across all deployments
> - ✅ **Portable**: Copy entire folder to any machine
> - ✅ **No Admin Rights**: No system modifications required
> - ✅ **Easy Distribution**: Zip and deploy anywhere

## 🛠️ Installation

### Platform-Specific Setup

Choose the setup script for your operating system:

#### Linux/macOS
```bash
# Make script executable and run
chmod +x scripts/00-setup-linux.sh
./scripts/00-setup-linux.sh

# Start the application
./scripts/02-start.sh
```

#### Windows
```batch
# Run the Windows setup script
scripts\00-setup-windows.bat

# Start the application
scripts\02-start.bat
```

#### 📋 Script Overview
All scripts are numbered for easy execution order:
- `00-setup-*`: Initial environment setup (run once)
- `01-fix-*`: Dependency troubleshooting (if needed)  
- `02-start.*`: Application startup (daily use)

For detailed script information, see [`scripts/README.md`](scripts/README.md).

### Manual Installation

If you prefer to set up manually:

1. **Clone the repository**
```bash
git clone https://github.com/hndrwn-dk/s3-management-ui.git
cd s3-management-ui
```

2. **Install dependencies**
```bash
# Install root dependencies
npm install

# Install all dependencies (server + client)
npm run install:all
```

3. **Configure environment**
```bash
# Copy server environment file
cp server/.env.example server/.env

# Edit server/.env with your configuration
```

4. **Start the application**
```bash
# Development mode (runs both server and client)
npm run dev

# Or start individually
npm run server:dev  # Backend only
npm run client:dev  # Frontend only
```

## 🔧 Troubleshooting

### Common Issues

#### "concurrently is not recognized" Error
If you see this error when running `start.bat` or `npm run dev`:
```
'concurrently' is not recognized as an internal or external command
```

**Solution:**
```bash
# Run the dependency fix script
# For Windows:
scripts\01-fix-dependencies.bat

# For Linux/macOS:
chmod +x scripts/01-fix-dependencies.sh
./scripts/01-fix-dependencies.sh
```

Or manually install dependencies:
```bash
npm install                    # Install root dependencies
cd server && npm install      # Install server dependencies  
cd ../client && npm install   # Install client dependencies
```

#### Port Already in Use
If ports 3000 or 5000 are already in use:
- **Option 1**: Stop the conflicting service
- **Option 2**: Change ports in `server/.env`:
  ```
  PORT=5001  # Change server port
  ```
  And update `FRONTEND_URL` accordingly.

#### MinIO Client Issues
- **Linux/macOS**: Ensure `mc` is in your PATH
- **Windows**: Try running `mc --version` to verify installation
- **Alternative**: The dashboard will work without `mc`, but migrations won't function

#### Node.js Version Issues
Ensure you're using Node.js 18.x or higher:
```bash
node --version  # Should show v18.x or higher
```

If you have an older version, update Node.js from https://nodejs.org/

### 📦 Project Structure & Dependencies

This project uses a **monorepo structure** with multiple `package.json` files:

```
s3-migration-dashboard/
├── package.json           # Root package (monorepo management)
├── package-lock.json      # Root lockfile
├── server/
│   ├── package.json      # Backend dependencies (Express, WebSocket, etc.)
│   ├── package-lock.json # Server lockfile
│   └── ...
├── client/
│   ├── package.json      # Frontend dependencies (React, TypeScript, etc.)
│   ├── package-lock.json # Client lockfile
│   └── ...
└── scripts/              # Numbered automation scripts
    ├── 00-setup-*
    ├── 01-fix-*
    └── 02-start.*
```

#### Why Multiple package.json Files?

1. **Root `package.json`**: 
   - Manages workspace-level scripts (`dev`, `build`, `start`)
   - Contains `concurrently` for running server + client together
   - Handles monorepo dependencies and configuration

2. **Server `package.json`**:
   - Backend-specific dependencies (Express, cors, ws, SQLite, etc.)
   - Database management (better-sqlite3, migration tools)
   - Server-only scripts and build configuration
   - Production deployment settings

3. **Client `package.json`**:
   - Frontend-specific dependencies (React, TypeScript, Tailwind, etc.)
   - Client build tools and development server
   - Browser-specific configurations

This structure provides:
- ✅ **Independent dependency management** for frontend/backend
- ✅ **Separate build processes** for optimal deployment
- ✅ **Clear separation of concerns** 
- ✅ **Development convenience** (single command starts both)
- ✅ **Easy scalability** for microservices architecture

5. **Access the dashboard**
     - Frontend: http://localhost:3000
     - Backend API: http://localhost:5000

### Production Deployment

1. **Build the application**
```bash
npm run build
```

2. **Start in production mode**
```bash
npm start
```

## ⚙️ Configuration

### Environment Variables

Create `server/.env` file with the following variables:

```env
# Server Configuration
PORT=5000
NODE_ENV=production

# MinIO/S3 Configuration
MC_PATH=/usr/local/bin/mc
LOG_LEVEL=info
MAX_CONCURRENT_MIGRATIONS=3

# CORS Configuration
FRONTEND_URL=http://localhost:3000
```

### S3 Endpoint Configuration

The application supports any S3-compatible storage:

#### AWS S3
- **Endpoint**: `https://s3.amazonaws.com`
- **Access Key**: Your AWS Access Key ID
- **Secret Key**: Your AWS Secret Access Key

#### MinIO
- **Endpoint**: `https://your-minio-server.com`
- **Access Key**: MinIO Access Key
- **Secret Key**: MinIO Secret Key

#### Other S3-Compatible Services
- **DigitalOcean Spaces**: `https://region.digitaloceanspaces.com`
- **Wasabi**: `https://s3.region.wasabisys.com`
- **Backblaze B2**: `https://s3.region.backblazeb2.com`

## 📖 Usage Guide

### 1. Configure S3 Connections

1. Navigate to the **Configure** tab
2. Click **Add S3 Connection**
3. Fill in your S3 endpoint details:
   - **Alias Name**: A unique identifier (e.g., "source-aws", "dest-minio")
   - **Endpoint URL**: Your S3 endpoint
   - **Access Key**: S3 access credentials
   - **Secret Key**: S3 secret credentials
4. Click **Test Connection** to verify
5. Save the configuration

### 2. Start a Migration

1. Go to the **Migrate** tab
2. Select your **source** connection and bucket
3. Select your **destination** connection and bucket
4. Review the bucket analysis (size, objects, estimated time)
5. Configure migration options:
   - **Overwrite**: Replace existing files
   - **Remove**: Delete files not in source
   - **Exclude patterns**: Skip certain files
6. Click **Validate** to check configuration
7. Click **Start Migration**

### 3. Monitor Progress

1. **Dashboard**: Real-time overview of all migrations
2. **History**: Detailed view of past and current migrations
3. **Logs**: Live logs with filtering and export options

### 4. Data Reconciliation

After migration completion, the system automatically:
- Compares source and destination
- Reports any differences
- Provides verification status

## 🏗️ Architecture

### Backend (Node.js/Express)
```
server/
├── index.js              # Main server file
├── routes/
│   ├── migration.js      # Migration API endpoints + SSE streaming
│   └── buckets.js        # S3 bucket management
├── services/
│   ├── database.js       # SQLite database service (NEW)
│   ├── minioClient.js    # MinIO client wrapper + DB integration
│   └── websocket.js      # Real-time communication (WebSocket + SSE)
├── data/
│   └── migrations.db     # SQLite database (auto-created)
└── logs/                 # Migration log files
```

**Key Components:**
- 🗄️ **SQLite Database**: Persistent storage for migrations and logs
- 🔄 **Dual Real-time**: WebSocket + Server-Sent Events fallback
- 📊 **Enhanced APIs**: Database-driven statistics and streaming
- 🔍 **Reconciliation**: Detailed difference tracking and analysis

### Frontend (React/TypeScript)
```
client/src/
├── components/           # React components
│   ├── Dashboard.tsx     # Main dashboard with real-time stats
│   ├── ConfigureTab.tsx  # S3 configuration
│   ├── MigrateTab.tsx    # Migration interface
│   ├── HistoryTab.tsx    # Migration history + reconciliation
│   ├── LogsTab.tsx       # Log viewer with auto-refresh
│   └── ReconciliationModal.tsx  # Difference analysis (NEW)
├── services/
│   ├── api.ts           # API client with enhanced endpoints
│   ├── websocket.ts     # WebSocket client
│   └── sse.ts           # Server-Sent Events client (NEW)
├── types/
│   └── index.ts         # TypeScript definitions + reconciliation types
└── App.tsx              # Main application with dual connectivity
```

**Enhanced Features:**
- 🎨 **Modern UI**: Responsive design with real-time updates
- 🔄 **Dual Connectivity**: Automatic WebSocket/SSE fallback
- 📊 **Live Statistics**: Database-driven dashboard metrics
- 🔍 **Difference Analysis**: Detailed reconciliation modal

## 🔧 API Reference

### Migration Endpoints

#### Start Migration
```http
POST /api/migration/start
Content-Type: application/json

{
  "source": "source-alias/bucket-name",
  "destination": "dest-alias/bucket-name",
  "options": {
    "overwrite": false,
    "remove": false,
    "exclude": ["*.tmp", "logs/*"]
  }
}
```

#### Get Migration Status
```http
GET /api/migration/{migrationId}
```

#### Cancel Migration
```http
POST /api/migration/{migrationId}/cancel
```

### Bucket Endpoints

#### Configure S3 Alias
```http
POST /api/buckets/alias
Content-Type: application/json

{
  "aliasName": "my-s3",
  "endpoint": "https://s3.amazonaws.com",
  "accessKey": "your-access-key",
  "secretKey": "your-secret-key"
}
```

#### List Buckets
```http
GET /api/buckets/list/{aliasName}
```

## 🚨 Error Handling

### Common Issues

#### MinIO Client Not Found
```
Error: MinIO client not detected
```
**Solution**: Install MinIO client and ensure it's in your PATH

#### Connection Failed
```
Error: Failed to configure alias
```
**Solutions**:
- Verify endpoint URL is correct
- Check access credentials
- Ensure network connectivity
- Validate SSL certificates

#### Permission Denied
```
Error: Access denied
```
**Solutions**:
- Verify IAM permissions for source/destination buckets
- Check bucket policies
- Ensure cross-region access is configured

### Logs and Debugging

- **Migration Logs**: Available in `server/logs/` directory
- **Application Logs**: Check console output for detailed errors
- **Debug Mode**: Set `LOG_LEVEL=debug` in environment variables

## 🧪 Development

### Running Tests
```bash
# Backend tests
cd server && npm test

# Frontend tests
cd client && npm test
```

### Code Quality
```bash
# Linting
npm run lint

# Type checking
npm run type-check

# Formatting
npm run format
```

### Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -m 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a pull request

## 📊 Performance

### Optimization Tips

1. **Concurrent Transfers**: Adjust `MAX_CONCURRENT_MIGRATIONS` in environment
2. **Network Bandwidth**: Monitor network usage during large migrations
3. **Memory Usage**: Large file lists may require additional memory
4. **Disk Space**: Ensure sufficient space for log files

### Monitoring

- **WebSocket Connections**: Monitor active connections in production
- **Memory Usage**: Track Node.js memory consumption
- **Log Rotation**: Implement log rotation for large deployments

## 🔒 Security

### Best Practices

1. **Credentials**: Store S3 credentials securely (not in source code)
2. **Network**: Use HTTPS for all endpoints
3. **Access Control**: Implement proper authentication/authorization
4. **Logs**: Avoid logging sensitive information
5. **Updates**: Keep dependencies updated

### Production Checklist

- [ ] Change default ports if needed
- [ ] Set up SSL/TLS certificates
- [ ] Configure firewall rules
- [ ] Set up monitoring and alerting
- [ ] Implement log rotation
- [ ] Configure backup procedures

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Built with ❤️ using React, Node.js, and MinIO