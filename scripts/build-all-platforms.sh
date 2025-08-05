#!/bin/bash

# S3 Migration Scheduler - Universal Build Script
# This script builds packages for all supported platforms

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
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

log_header() {
    echo -e "${CYAN}================================================================${NC}"
    echo -e "${CYAN} $1${NC}"
    echo -e "${CYAN}================================================================${NC}"
}

# Show help
show_help() {
    cat << EOF
S3 Migration Scheduler - Universal Build Script

Usage: $0 [OPTIONS] [PLATFORMS...]

OPTIONS:
    -h, --help          Show this help message
    -v, --version VER   Set version number (default: auto-detect from package.json)
    -c, --clean         Clean build directories before building
    -o, --output DIR    Set custom output directory (default: ./dist)
    --electron-only     Build only Electron packages (skip script-based packages)
    --scripts-only      Build only script-based packages (skip Electron packages)

PLATFORMS:
    windows             Build Windows packages (.exe, .zip, portable)
    linux               Build Linux packages (.AppImage, .deb, .rpm, .tar.gz)
    docker              Build and push Docker images
    all                 Build for all platforms (default)

EXAMPLES:
    $0                           # Build for all platforms
    $0 windows linux            # Build for Windows and Linux only
    $0 --clean --version 1.2.0  # Clean build with specific version
    $0 --electron-only windows  # Build only Electron packages for Windows
    $0 --scripts-only linux     # Build only script packages for Linux

ENVIRONMENT VARIABLES:
    BUILD_VERSION       Override version number
    BUILD_OUTPUT_DIR    Override output directory
    SKIP_DEPENDENCIES   Skip dependency installation (for CI)
    PARALLEL_BUILDS     Enable parallel builds (experimental)

EOF
}

# Parse command line arguments
parse_arguments() {
    BUILD_PLATFORMS=()
    BUILD_VERSION=""
    BUILD_OUTPUT_DIR=""
    CLEAN_BUILD=false
    ELECTRON_ONLY=false
    SCRIPTS_ONLY=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -v|--version)
                BUILD_VERSION="$2"
                shift 2
                ;;
            -c|--clean)
                CLEAN_BUILD=true
                shift
                ;;
            -o|--output)
                BUILD_OUTPUT_DIR="$2"
                shift 2
                ;;
            --electron-only)
                ELECTRON_ONLY=true
                shift
                ;;
            --scripts-only)
                SCRIPTS_ONLY=true
                shift
                ;;
            windows|linux|docker|all)
                BUILD_PLATFORMS+=("$1")
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Default to all platforms if none specified
    if [ ${#BUILD_PLATFORMS[@]} -eq 0 ]; then
        BUILD_PLATFORMS=("all")
    fi
    
    # Expand "all" to specific platforms
    if [[ " ${BUILD_PLATFORMS[@]} " =~ " all " ]]; then
        BUILD_PLATFORMS=("windows" "linux" "docker")
    fi
    
    # Use environment variables if set
    if [ -n "$BUILD_VERSION" ]; then
        BUILD_VERSION="$BUILD_VERSION"
    fi
    if [ -n "$BUILD_OUTPUT_DIR" ]; then
        BUILD_OUTPUT_DIR="$BUILD_OUTPUT_DIR"
    fi
}

# Detect version from package.json
detect_version() {
    if [ -z "$BUILD_VERSION" ]; then
        if [ -f "$PROJECT_ROOT/package.json" ]; then
            BUILD_VERSION=$(node -p "require('$PROJECT_ROOT/package.json').version" 2>/dev/null || echo "1.0.0")
        else
            BUILD_VERSION="1.0.0"
        fi
    fi
    log_info "Building version: $BUILD_VERSION"
}

# Setup build environment
setup_environment() {
    log_step "Setting up build environment..."
    
    # Set output directory
    if [ -z "$BUILD_OUTPUT_DIR" ]; then
        BUILD_OUTPUT_DIR="$PROJECT_ROOT/dist"
    fi
    
    # Create output directory
    mkdir -p "$BUILD_OUTPUT_DIR"
    
    # Clean if requested
    if [ "$CLEAN_BUILD" = true ]; then
        log_info "Cleaning build directories..."
        rm -rf "$BUILD_OUTPUT_DIR"/*
        rm -rf "$PROJECT_ROOT/electron-app/dist"
        rm -rf "$PROJECT_ROOT/client/build"
        find "$PROJECT_ROOT" -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true
    fi
    
    # Export environment variables
    export BUILD_VERSION
    export BUILD_OUTPUT_DIR
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
    
    # Check for platform-specific tools
    for platform in "${BUILD_PLATFORMS[@]}"; do
        case $platform in
            windows)
                if [ "$(uname)" != "MINGW64_NT"* ] && [ "$(uname)" != "CYGWIN_NT"* ]; then
                    log_warn "Building Windows packages on non-Windows platform"
                    log_info "Make sure you have wine installed for testing"
                fi
                ;;
            linux)
                if ! command -v g++ &> /dev/null; then
                    log_warn "g++ not found. Some native modules might fail to build."
                fi
                ;;
            docker)
                if ! command -v docker &> /dev/null; then
                    log_error "Docker is required for building Docker images"
                    exit 1
                fi
                ;;
        esac
    done
    
    log_info "Prerequisites check completed"
}

# Install dependencies
install_dependencies() {
    if [ "$SKIP_DEPENDENCIES" = "true" ]; then
        log_info "Skipping dependency installation (SKIP_DEPENDENCIES=true)"
        return
    fi
    
    log_step "Installing dependencies..."
    
    # Install root dependencies
    cd "$PROJECT_ROOT"
    if [ ! -d "node_modules" ]; then
        log_info "Installing root dependencies..."
        npm install
    fi
    
    # Install client dependencies
    cd "$PROJECT_ROOT/client"
    if [ ! -d "node_modules" ]; then
        log_info "Installing client dependencies..."
        npm install
    fi
    
    # Install server dependencies
    cd "$PROJECT_ROOT/server"
    if [ ! -d "node_modules" ]; then
        log_info "Installing server dependencies..."
        npm install
    fi
    
    # Install electron dependencies
    cd "$PROJECT_ROOT/electron-app"
    if [ ! -d "node_modules" ]; then
        log_info "Installing Electron dependencies..."
        npm install
    fi
    
    cd "$PROJECT_ROOT"
}

# Build frontend
build_frontend() {
    log_step "Building React frontend..."
    
    cd "$PROJECT_ROOT/client"
    
    log_info "Building production frontend..."
    npm run build
    
    log_info "Frontend build completed"
}

# Build Windows packages
build_windows() {
    log_header "Building Windows Packages"
    
    if [ "$SCRIPTS_ONLY" = "true" ]; then
        log_info "Skipping Electron build (scripts-only mode)"
    else
        if command -v cmd &> /dev/null; then
            # We're on Windows
            cmd //c "$SCRIPT_DIR\\build-windows.bat"
        else
            # Cross-platform build using Electron Builder
            log_info "Cross-platform Windows build..."
            cd "$PROJECT_ROOT/electron-app"
            npx electron-builder --win
        fi
    fi
    
    if [ "$ELECTRON_ONLY" = "false" ]; then
        # Create script-based portable version
        log_info "Creating Windows script-based package..."
        # Implementation would go here
    fi
}

# Build Linux packages
build_linux() {
    log_header "Building Linux Packages"
    
    if [ -x "$SCRIPT_DIR/build-linux.sh" ]; then
        "$SCRIPT_DIR/build-linux.sh"
    else
        log_error "Linux build script not found or not executable"
        exit 1
    fi
}

# Build Docker images
build_docker() {
    log_header "Building Docker Images"
    
    if [ -x "$SCRIPT_DIR/docker-build.sh" ]; then
        log_info "Building Docker images..."
        "$SCRIPT_DIR/docker-build.sh"
    else
        log_error "Docker build script not found or not executable"
        exit 1
    fi
}

# Create release archives
create_release_archives() {
    log_step "Creating release archives..."
    
    cd "$BUILD_OUTPUT_DIR"
    
    # Create version-specific directory
    VERSION_DIR="S3-Migration-Scheduler-v$BUILD_VERSION"
    mkdir -p "$VERSION_DIR"
    
    # Move all build artifacts to version directory
    for file in *; do
        if [ "$file" != "$VERSION_DIR" ]; then
            mv "$file" "$VERSION_DIR/"
        fi
    done
    
    # Create release archive
    log_info "Creating release archive..."
    tar -czf "S3-Migration-Scheduler-v$BUILD_VERSION.tar.gz" "$VERSION_DIR"
    
    # Create checksums
    log_info "Generating checksums..."
    find "$VERSION_DIR" -type f -exec sha256sum {} \; > "$VERSION_DIR/SHA256SUMS"
    
    log_info "Release archive created: S3-Migration-Scheduler-v$BUILD_VERSION.tar.gz"
}

# Generate build report
generate_build_report() {
    log_step "Generating build report..."
    
    REPORT_FILE="$BUILD_OUTPUT_DIR/build-report.txt"
    
    cat > "$REPORT_FILE" << EOF
S3 Migration Scheduler - Build Report
====================================

Build Information:
- Version: $BUILD_VERSION
- Build Date: $(date)
- Build Platform: $(uname -s) $(uname -m)
- Node.js Version: $(node --version)
- npm Version: $(npm --version)

Built Platforms:
EOF
    
    for platform in "${BUILD_PLATFORMS[@]}"; do
        echo "- $platform" >> "$REPORT_FILE"
    done
    
    cat >> "$REPORT_FILE" << EOF

Build Artifacts:
EOF
    
    if [ -d "$BUILD_OUTPUT_DIR" ]; then
        find "$BUILD_OUTPUT_DIR" -type f -name "*.exe" -o -name "*.AppImage" -o -name "*.deb" -o -name "*.rpm" -o -name "*.tar.gz" -o -name "*.zip" | while read file; do
            echo "- $(basename "$file") ($(du -h "$file" | cut -f1))" >> "$REPORT_FILE"
        done
    fi
    
    log_info "Build report saved to: $REPORT_FILE"
}

# Show build results
show_results() {
    log_header "Build Results"
    
    echo "Build completed successfully!"
    echo
    echo "Version: $BUILD_VERSION"
    echo "Output Directory: $BUILD_OUTPUT_DIR"
    echo "Built Platforms: ${BUILD_PLATFORMS[*]}"
    echo
    
    if [ -d "$BUILD_OUTPUT_DIR" ]; then
        echo "Available packages:"
        find "$BUILD_OUTPUT_DIR" -type f \( -name "*.exe" -o -name "*.AppImage" -o -name "*.deb" -o -name "*.rpm" -o -name "*.tar.gz" -o -name "*.zip" \) | while read file; do
            echo "  - $(basename "$file") ($(du -h "$file" | cut -f1))"
        done
        echo
        
        # Show portable versions
        if [ -d "$BUILD_OUTPUT_DIR" ]; then
            portable_dirs=$(find "$BUILD_OUTPUT_DIR" -type d -name "*Portable*" 2>/dev/null)
            if [ -n "$portable_dirs" ]; then
                echo "Portable versions:"
                echo "$portable_dirs" | while read dir; do
                    echo "  - $(basename "$dir")"
                done
                echo
            fi
        fi
    fi
    
    echo "Next steps:"
    echo "1. Test the packages on target platforms"
    echo "2. Create GitHub release with the artifacts"
    echo "3. Update documentation with download links"
    echo "4. Announce the release to users"
}

# Main execution
main() {
    log_header "S3 Migration Scheduler - Universal Build Script"
    
    parse_arguments "$@"
    detect_version
    setup_environment
    check_prerequisites
    install_dependencies
    build_frontend
    
    # Build for each platform
    for platform in "${BUILD_PLATFORMS[@]}"; do
        case $platform in
            windows)
                build_windows
                ;;
            linux)
                build_linux
                ;;
            docker)
                build_docker
                ;;
            *)
                log_error "Unknown platform: $platform"
                exit 1
                ;;
        esac
    done
    
    create_release_archives
    generate_build_report
    show_results
    
    log_info "Universal build completed successfully!"
}

# Run main function with all arguments
main "$@"