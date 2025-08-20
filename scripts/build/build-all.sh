#!/bin/bash

# S3 Migration Scheduler - Universal Build Script
# This script can build for all platforms based on the current environment

set -e

# Configuration
VERSION="1.1.0"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "${SCRIPT_DIR}")")"

echo -e "\n${BLUE}=========================================================================${NC}"
echo -e "${BLUE}              S3 Migration Scheduler - Universal Build Script            ${NC}"
echo -e "${BLUE}                              Version ${VERSION}                              ${NC}"
echo -e "${BLUE}=========================================================================${NC}\n"

echo -e "${YELLOW}Project root: ${PROJECT_ROOT}${NC}\n"

# Function to show usage
show_usage() {
    echo "Usage: $0 [platform]"
    echo ""
    echo "Platforms:"
    echo "  linux    - Build Linux packages (AppImage, deb, tar.gz)"
    echo "  windows  - Build Windows packages (exe, portable zip) - requires Windows or Wine"
    echo "  docker   - Build and push Docker image"
    echo "  all      - Build for current platform only"
    echo ""
    echo "Examples:"
    echo "  $0 linux     # Build Linux packages"
    echo "  $0 docker    # Build Docker image"
    echo "  $0 all       # Build for current platform"
    echo ""
}

# Function to check prerequisites
check_prerequisites() {
    echo -e "${BLUE}Checking Prerequisites...${NC}"
    echo "========================="

    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}ERROR: Node.js is not installed or not in PATH${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Node.js found: $(node --version)${NC}"

    # Check npm
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}ERROR: npm is not installed or not in PATH${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ npm found: $(npm --version)${NC}"

    echo
}

# Function to build React client
build_client() {
    echo -e "${BLUE}Building React Client...${NC}"
    echo "========================"

    cd "${PROJECT_ROOT}/client"

    if [ ! -f "build/index.html" ]; then
        echo "React client not found, building..."
        npm install
        npm run build
        echo -e "${GREEN}✓ React client built successfully${NC}"
    else
        echo -e "${GREEN}✓ React client already built${NC}"
    fi

    echo
}

# Function to prepare electron app
prepare_electron() {
    echo -e "${BLUE}Preparing Electron App...${NC}"
    echo "========================="

    cd "${PROJECT_ROOT}/electron-app"

    # Install electron dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "Installing electron app dependencies..."
        npm install
    fi

    # Ensure server dependencies are installed
    echo "Installing server dependencies..."
    cd "${PROJECT_ROOT}/server"
    npm install --production
    echo -e "${GREEN}✓ Server dependencies installed${NC}"

    cd "${PROJECT_ROOT}/electron-app"
    echo
}

# Function to build Linux packages
build_linux() {
    echo -e "${BLUE}Building Linux Desktop Packages...${NC}"
    echo "=================================="

    cd "${PROJECT_ROOT}/electron-app"
    
    echo "Building Linux packages..."
    npm run build:linux
    echo -e "${GREEN}✓ Linux packages built successfully${NC}"
    
    list_linux_packages
}

# Function to build Windows packages
build_windows() {
    echo -e "${BLUE}Building Windows Desktop Packages...${NC}"
    echo "===================================="

    cd "${PROJECT_ROOT}/electron-app"
    
    # Check if we're on Windows or have Wine
    if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
        echo "Building Windows packages (native Windows)..."
        npm run build:win
        echo -e "${GREEN}✓ Windows packages built successfully${NC}"
    elif command -v wine &> /dev/null; then
        echo "Building Windows packages (using Wine)..."
        npm run build:win
        echo -e "${GREEN}✓ Windows packages built successfully${NC}"
    else
        echo -e "${YELLOW}⚠ Cross-compiling Windows packages from $(uname -s)${NC}"
        echo -e "${YELLOW}⚠ This may fail due to native dependencies${NC}"
        
        if npm run build:win; then
            echo -e "${GREEN}✓ Windows packages built successfully${NC}"
        else
            echo -e "${RED}✗ Windows build failed due to cross-compilation issues${NC}"
            echo -e "${YELLOW}To build Windows packages:${NC}"
            echo -e "${YELLOW}1. Run this on a Windows machine: scripts\\build\\windows\\build-windows.bat${NC}"
            echo -e "${YELLOW}2. Or install Wine and try again${NC}"
            return 1
        fi
    fi
    
    list_windows_packages
}

# Function to build Docker image
build_docker() {
    echo -e "${BLUE}Building Docker Image...${NC}"
    echo "======================="

    # Check if Docker is available
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}ERROR: Docker is not installed or not in PATH${NC}"
        echo -e "${YELLOW}Please install Docker to build Docker images${NC}"
        return 1
    fi

    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        echo -e "${RED}ERROR: Docker is not running${NC}"
        echo -e "${YELLOW}Please start Docker and try again${NC}"
        return 1
    fi

    cd "${PROJECT_ROOT}"
    
    echo "Building Docker image..."
    docker build -t "hndrwn/s3-migration-scheduler:${VERSION}" -t "hndrwn/s3-migration-scheduler:latest" .
    echo -e "${GREEN}✓ Docker image built successfully${NC}"
    
    echo -e "${YELLOW}Docker image ready: hndrwn/s3-migration-scheduler:${VERSION}${NC}"
    echo -e "${YELLOW}To push to Docker Hub, run: ./scripts/build/docker/docker-build-and-push.sh${NC}"
}

# Function to list Linux packages
list_linux_packages() {
    if [ -d "${PROJECT_ROOT}/electron-app/dist" ]; then
        echo -e "${GREEN}Linux Desktop Packages:${NC}"
        echo "------------------------"
        
        cd "${PROJECT_ROOT}/electron-app/dist"
        for file in *.AppImage *.deb *.rpm *.tar.gz; do
            if [ -f "$file" ]; then
                case "$file" in
                    *.AppImage) echo "  ✓ $file (Linux AppImage)" ;;
                    *.deb) echo "  ✓ $file (Debian package)" ;;
                    *.rpm) echo "  ✓ $file (RPM package)" ;;
                    *.tar.gz) echo "  ✓ $file (Tarball)" ;;
                esac
            fi
        done
        echo
    fi
}

# Function to list Windows packages
list_windows_packages() {
    if [ -d "${PROJECT_ROOT}/electron-app/dist" ]; then
        echo -e "${GREEN}Windows Desktop Packages:${NC}"
        echo "-------------------------"
        
        cd "${PROJECT_ROOT}/electron-app/dist"
        for file in *.exe *-win-*.zip; do
            if [ -f "$file" ]; then
                case "$file" in
                    *.exe) echo "  ✓ $file (Windows installer)" ;;
                    *-win-*.zip) echo "  ✓ $file (Windows portable)" ;;
                esac
            fi
        done
        echo
    fi
}

# Main execution
main() {
    local platform="${1:-all}"
    
    case "$platform" in
        "linux")
            check_prerequisites
            build_client
            prepare_electron
            build_linux
            ;;
        "windows")
            check_prerequisites
            build_client
            prepare_electron
            build_windows
            ;;
        "docker")
            build_client
            build_docker
            ;;
        "all")
            # Detect current platform and build accordingly
            case "$(uname -s)" in
                Linux*)
                    echo -e "${YELLOW}Detected Linux - building Linux packages${NC}"
                    check_prerequisites
                    build_client
                    prepare_electron
                    build_linux
                    ;;
                Darwin*)
                    echo -e "${YELLOW}Detected macOS - building macOS packages${NC}"
                    check_prerequisites
                    build_client
                    prepare_electron
                    cd "${PROJECT_ROOT}/electron-app"
                    npm run build:mac
                    ;;
                CYGWIN*|MINGW*|MSYS*)
                    echo -e "${YELLOW}Detected Windows - building Windows packages${NC}"
                    check_prerequisites
                    build_client
                    prepare_electron
                    build_windows
                    ;;
                *)
                    echo -e "${RED}ERROR: Unsupported platform: $(uname -s)${NC}"
                    exit 1
                    ;;
            esac
            ;;
        "help"|"-h"|"--help")
            show_usage
            exit 0
            ;;
        *)
            echo -e "${RED}ERROR: Unknown platform: $platform${NC}"
            echo
            show_usage
            exit 1
            ;;
    esac

    echo
    echo -e "${GREEN}=========================================================================${NC}"
    echo -e "${GREEN}                        BUILD SCRIPT COMPLETED                         ${NC}"
    echo -e "${GREEN}                              Version ${VERSION}                              ${NC}"
    echo -e "${GREEN}=========================================================================${NC}"
}

# Run the script
main "$@"