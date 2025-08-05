#!/bin/bash

# S3 Migration Scheduler - Linux Build Script
# This script builds Linux desktop packages (AppImage, deb, rpm, tar.gz)

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="$PROJECT_ROOT/build"
ELECTRON_DIR="$PROJECT_ROOT/electron-app"
CLIENT_DIR="$PROJECT_ROOT/client"
SERVER_DIR="$PROJECT_ROOT/server"
DIST_DIR="$PROJECT_ROOT/dist"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_step "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed or not in PATH"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed or not in PATH"
        exit 1
    fi
    
    # Check for build tools
    if ! command -v g++ &> /dev/null; then
        log_warn "g++ not found. Some native modules might fail to build."
        log_info "Install build-essential on Ubuntu/Debian: sudo apt-get install build-essential"
        log_info "Install gcc-c++ on CentOS/RHEL: sudo yum install gcc-c++"
    fi
    
    log_info "Prerequisites check passed"
}

# Setup build directories
setup_directories() {
    log_step "Setting up build directories..."
    
    # Create directories
    mkdir -p "$BUILD_DIR"
    mkdir -p "$DIST_DIR"
    
    # Clean previous builds
    if [ -d "$ELECTRON_DIR/dist" ]; then
        log_info "Cleaning previous Electron builds..."
        rm -rf "$ELECTRON_DIR/dist"
    fi
}

# Build React frontend
build_frontend() {
    log_step "Building React frontend..."
    
    cd "$CLIENT_DIR"
    
    if [ ! -d "node_modules" ]; then
        log_info "Installing frontend dependencies..."
        npm install
    fi
    
    log_info "Building production frontend..."
    npm run build
    
    log_info "Frontend build completed"
}

# Prepare Electron application
prepare_electron() {
    log_step "Preparing Electron application..."
    
    cd "$ELECTRON_DIR"
    
    # Install Electron dependencies
    if [ ! -d "node_modules" ]; then
        log_info "Installing Electron dependencies..."
        npm install
    fi
    
    # Create resources directory
    mkdir -p resources
    
    # Copy built frontend to Electron resources
    log_info "Copying frontend build to Electron resources..."
    rm -rf resources/client
    mkdir -p resources/client
    cp -r "$CLIENT_DIR/build/"* resources/client/
    
    # Copy server files
    log_info "Copying server files to Electron resources..."
    rm -rf resources/server
    mkdir -p resources/server
    cp -r "$SERVER_DIR/"* resources/server/
    
    # Install server dependencies in the copied location
    cd resources/server
    log_info "Installing server dependencies for packaging..."
    npm install --production
    
    cd "$ELECTRON_DIR"
}

# Build Electron packages for Linux
build_electron_packages() {
    log_step "Building Electron packages for Linux..."
    
    cd "$ELECTRON_DIR"
    
    # Build AppImage
    log_info "Building AppImage package..."
    npx electron-builder --linux AppImage
    
    # Build deb package
    log_info "Building DEB package..."
    npx electron-builder --linux deb
    
    # Build rpm package
    log_info "Building RPM package..."
    npx electron-builder --linux rpm
    
    # Build tar.gz package
    log_info "Building TAR.GZ package..."
    npx electron-builder --linux tar.gz
    
    log_info "All Electron packages built successfully"
}

# Create portable script package
create_portable_script() {
    log_step "Creating portable script package..."
    
    # Create a standalone script-based package
    PORTABLE_DIR="$DIST_DIR/S3-Migration-Scheduler-Portable-Linux"
    rm -rf "$PORTABLE_DIR"
    mkdir -p "$PORTABLE_DIR"
    
    # Copy necessary files
    cp -r "$CLIENT_DIR/build/"* "$PORTABLE_DIR/client/"
    cp -r "$SERVER_DIR/"* "$PORTABLE_DIR/server/"
    cp "$PROJECT_ROOT/mc" "$PORTABLE_DIR/"
    
    # Make mc executable
    chmod +x "$PORTABLE_DIR/mc"
    
    # Create startup script
    cat > "$PORTABLE_DIR/start-s3-migration-scheduler.sh" << 'EOF'
#!/bin/bash

# S3 Migration Scheduler - Portable Linux Version

echo "Starting S3 Migration Scheduler..."
echo

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Set environment variables
export NODE_ENV=production
export PORT=5000
export DB_PATH="$SCRIPT_DIR/data/migrations.db"
export MC_PATH="$SCRIPT_DIR/mc"

# Create data directories
mkdir -p "$SCRIPT_DIR/data"
mkdir -p "$SCRIPT_DIR/logs"

# Install server dependencies if needed
cd "$SCRIPT_DIR/server"
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install --production
fi

# Start the server in background
echo "Starting server on http://localhost:5000"
node index.js &
SERVER_PID=$!

# Wait for server to start
echo "Waiting for server to start..."
sleep 3

# Check if server is running
if kill -0 $SERVER_PID 2>/dev/null; then
    echo "Server started successfully!"
    
    # Try to open browser
    if command -v xdg-open > /dev/null; then
        echo "Opening application in browser..."
        xdg-open http://localhost:5000
    elif command -v gnome-open > /dev/null; then
        echo "Opening application in browser..."
        gnome-open http://localhost:5000
    else
        echo "Please open http://localhost:5000 in your browser"
    fi
    
    echo
    echo "S3 Migration Scheduler is now running!"
    echo "Press Ctrl+C to stop the application."
    echo
    
    # Wait for interrupt
    trap "echo; echo 'Stopping server...'; kill $SERVER_PID 2>/dev/null; exit 0" INT
    wait $SERVER_PID
else
    echo "Failed to start server"
    exit 1
fi
EOF
    
    chmod +x "$PORTABLE_DIR/start-s3-migration-scheduler.sh"
    
    # Create desktop file
    cat > "$PORTABLE_DIR/s3-migration-scheduler.desktop" << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=S3 Migration Scheduler
Comment=S3 bucket migration and scheduling tool
Exec=$PORTABLE_DIR/start-s3-migration-scheduler.sh
Icon=$PORTABLE_DIR/icon.png
Terminal=false
Categories=Utility;Network;
EOF
    
    # Create README for portable version
    cat > "$PORTABLE_DIR/README.txt" << 'EOF'
S3 Migration Scheduler - Portable Linux Version
===============================================

To start the application:
1. Run: ./start-s3-migration-scheduler.sh
2. Wait for the server to start
3. The application will open in your default browser

Requirements:
- Node.js installed on your system
- Internet connection for initial dependency installation

Data Location:
- Database: data/migrations.db
- Logs: logs/

Desktop Integration (optional):
1. Copy s3-migration-scheduler.desktop to ~/.local/share/applications/
2. Update the Exec and Icon paths in the .desktop file to absolute paths

For support, visit: https://github.com/hndrwn-dk/s3-migration-scheduler
EOF
    
    log_info "Portable script package created in $PORTABLE_DIR"
}

# Create SystemD service files
create_systemd_service() {
    log_step "Creating SystemD service template..."
    
    SYSTEMD_DIR="$DIST_DIR/systemd"
    mkdir -p "$SYSTEMD_DIR"
    
    # Create service file template
    cat > "$SYSTEMD_DIR/s3-migration-scheduler.service" << 'EOF'
[Unit]
Description=S3 Migration Scheduler
After=network.target

[Service]
Type=simple
User=s3migration
WorkingDirectory=/opt/s3-migration-scheduler/server
Environment=NODE_ENV=production
Environment=PORT=5000
Environment=DB_PATH=/var/lib/s3-migration-scheduler/migrations.db
Environment=MC_PATH=/opt/s3-migration-scheduler/mc
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=10

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/s3-migration-scheduler /var/log/s3-migration-scheduler

[Install]
WantedBy=multi-user.target
EOF
    
    # Create installation script
    cat > "$SYSTEMD_DIR/install-service.sh" << 'EOF'
#!/bin/bash

# S3 Migration Scheduler - SystemD Service Installation

echo "Installing S3 Migration Scheduler as a system service..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root (use sudo)"
    exit 1
fi

# Create user for the service
if ! id "s3migration" &>/dev/null; then
    useradd --system --no-create-home --shell /bin/false s3migration
    echo "Created user: s3migration"
fi

# Create directories
mkdir -p /opt/s3-migration-scheduler
mkdir -p /var/lib/s3-migration-scheduler
mkdir -p /var/log/s3-migration-scheduler

# Set ownership
chown -R s3migration:s3migration /var/lib/s3-migration-scheduler
chown -R s3migration:s3migration /var/log/s3-migration-scheduler

echo "Please manually copy your application files to /opt/s3-migration-scheduler"
echo "Then copy the service file: cp s3-migration-scheduler.service /etc/systemd/system/"
echo "And run: systemctl daemon-reload && systemctl enable s3-migration-scheduler"
EOF
    
    chmod +x "$SYSTEMD_DIR/install-service.sh"
    
    log_info "SystemD service files created in $SYSTEMD_DIR"
}

# Copy build artifacts
copy_artifacts() {
    log_step "Copying build artifacts..."
    
    # Copy Electron builds
    if [ -d "$ELECTRON_DIR/dist" ]; then
        cp -r "$ELECTRON_DIR/dist/"* "$DIST_DIR/"
    fi
}

# Show build results
show_results() {
    log_info "Build completed successfully!"
    echo
    echo "================================================================"
    echo " Build Results"
    echo "================================================================"
    echo
    echo "Build artifacts are available in: $DIST_DIR"
    echo
    
    # List the created files
    if [ -d "$DIST_DIR" ]; then
        echo "Available packages:"
        find "$DIST_DIR" -name "*.AppImage" -exec basename {} \; | sed 's/^/  - /'
        find "$DIST_DIR" -name "*.deb" -exec basename {} \; | sed 's/^/  - /'
        find "$DIST_DIR" -name "*.rpm" -exec basename {} \; | sed 's/^/  - /'
        find "$DIST_DIR" -name "*.tar.gz" -exec basename {} \; | sed 's/^/  - /'
        if [ -d "$DIST_DIR/S3-Migration-Scheduler-Portable-Linux" ]; then
            echo "  - S3-Migration-Scheduler-Portable-Linux (script-based)"
        fi
        if [ -d "$DIST_DIR/systemd" ]; then
            echo "  - SystemD service files (in systemd/)"
        fi
    fi
    
    echo
    echo "Installation options:"
    echo "  1. Use .AppImage for universal Linux compatibility"
    echo "  2. Install .deb package on Debian/Ubuntu systems"
    echo "  3. Install .rpm package on RedHat/CentOS/Fedora systems"
    echo "  4. Extract .tar.gz for manual installation"
    echo "  5. Use script-based portable version if you have Node.js"
    echo "  6. Use SystemD service for server deployments"
    echo
}

# Main execution
main() {
    echo
    echo "================================================================"
    echo " S3 Migration Scheduler - Linux Build Script"
    echo "================================================================"
    echo
    
    check_prerequisites
    setup_directories
    build_frontend
    prepare_electron
    build_electron_packages
    create_portable_script
    create_systemd_service
    copy_artifacts
    show_results
    
    echo "Build process completed successfully!"
}

# Run main function
main "$@"