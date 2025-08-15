#!/bin/bash

# S3 Migration Scheduler - Complete Build and Release Script
# This script automates the entire repackaging process for new releases

set -e

# Configuration
VERSION="1.1.0"
DOCKER_USERNAME="hndrwn"
IMAGE_NAME="s3-migration-scheduler"

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
echo -e "${BLUE}           S3 Migration Scheduler - Complete Build and Release          ${NC}"
echo -e "${BLUE}                              Version ${VERSION}                              ${NC}"
echo -e "${BLUE}=========================================================================${NC}\n"

echo -e "${YELLOW}Project root: ${PROJECT_ROOT}${NC}"
echo -e "${YELLOW}Scripts structure: build/, setup/, db/${NC}"
echo

# Step 1: Verify prerequisites
echo -e "${BLUE}Step 1: Checking Prerequisites...${NC}"
echo "======================================"

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

# Check Docker (optional)
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}⚠ Docker not found - Docker builds will be skipped${NC}"
    DOCKER_AVAILABLE=false
else
    echo -e "${GREEN}✓ Docker found: $(docker --version)${NC}"
    DOCKER_AVAILABLE=true
fi

echo

# Step 2: Clean previous builds
echo -e "${BLUE}Step 2: Cleaning Previous Builds...${NC}"
echo "===================================="

cd "${PROJECT_ROOT}"

# Clean dist directories
if [ -d "electron-app/dist" ]; then
    echo "Cleaning electron-app/dist..."
    rm -rf "electron-app/dist"
fi

# Clean node_modules (optional)
read -p "Clean all node_modules directories (recommended for fresh build)? [y/N]: " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Cleaning node_modules..."
    rm -rf node_modules client/node_modules server/node_modules electron-app/node_modules
fi

echo -e "${GREEN}✓ Cleanup completed${NC}\n"

# Step 3: Install dependencies
echo -e "${BLUE}Step 3: Installing Dependencies...${NC}"
echo "==================================="

echo "Installing root dependencies..."
npm install

echo "Installing client dependencies..."
cd client
npm install

echo "Installing server dependencies..."
cd ../server
npm install

echo "Installing electron app dependencies..."
cd ../electron-app
npm install

cd "${PROJECT_ROOT}"
echo -e "${GREEN}✓ All dependencies installed${NC}\n"

# Step 4: Build client
echo -e "${BLUE}Step 4: Building React Client...${NC}"
echo "================================="

cd client
npm run build

cd "${PROJECT_ROOT}"
echo -e "${GREEN}✓ React client built successfully${NC}\n"

# Step 5: Build desktop packages using specialized scripts
echo -e "${BLUE}Step 5: Building Desktop Packages...${NC}"
echo "====================================="

# Linux packages (always build on Linux)
echo "Calling Linux build script..."
if bash "${SCRIPT_DIR}/linux/build-linux.sh"; then
    echo -e "${GREEN}✓ Linux packages completed${NC}"
else
    echo -e "${RED}ERROR: Linux build failed${NC}"
    exit 1
fi

# Ask if user wants to build Windows packages
read -p "Build Windows packages? (requires Windows build tools) [y/N]: " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Calling Windows build script..."
    if bash "${SCRIPT_DIR}/windows/build-windows.bat"; then
        echo -e "${GREEN}✓ Windows packages completed${NC}"
    else
        echo -e "${YELLOW}⚠ Warning: Windows build failed (this is normal on Linux)${NC}"
    fi
fi

echo

# Step 6: Docker build and push using specialized script
if [ "$DOCKER_AVAILABLE" = true ]; then
    echo -e "${BLUE}Step 6: Docker Build and Push...${NC}"
    echo "================================"
    
    read -p "Build and push Docker images? [y/N]: " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Calling Docker build script..."
        if bash "${SCRIPT_DIR}/docker/docker-build-and-push.sh"; then
            echo -e "${GREEN}✓ Docker images built and pushed${NC}"
        else
            echo -e "${YELLOW}⚠ Warning: Docker build failed${NC}"
        fi
    fi
    echo
fi

# Step 7: List built assets
echo -e "${BLUE}Step 7: Build Summary...${NC}"
echo "========================"

echo
echo -e "${GREEN}BUILD COMPLETED SUCCESSFULLY!${NC}"
echo

echo -e "${YELLOW}Built Assets:${NC}"
echo "-------------"

if [ -d "electron-app/dist" ]; then
    echo -e "${GREEN}Desktop Packages:${NC}"
    ls electron-app/dist/*.exe 2>/dev/null && echo "  ✓ Windows installer (.exe)"
    ls electron-app/dist/*.zip 2>/dev/null && echo "  ✓ Windows portable (.zip)"
    ls electron-app/dist/*.AppImage 2>/dev/null && echo "  ✓ Linux AppImage"
    ls electron-app/dist/*.deb 2>/dev/null && echo "  ✓ Debian package (.deb)"
    ls electron-app/dist/*.dmg 2>/dev/null && echo "  ✓ macOS disk image (.dmg)"
    echo
fi

if [ "$DOCKER_AVAILABLE" = true ]; then
    echo -e "${GREEN}Docker Images:${NC}"
    echo "  ✓ ${DOCKER_USERNAME}/${IMAGE_NAME}:${VERSION}"
    echo "  ✓ ${DOCKER_USERNAME}/${IMAGE_NAME}:latest"
    echo
fi

echo -e "${GREEN}React Client:${NC}"
echo "  ✓ client/build/ (production build)"
echo

# Step 8: Release instructions
echo -e "${BLUE}Step 8: Next Steps for GitHub Release...${NC}"
echo "========================================="

echo
echo -e "${YELLOW}Ready for GitHub Release!${NC}"
echo
echo -e "${GREEN}1. Create GitHub Release:${NC}"
echo "   • Go to: https://github.com/hndrwn-dk/s3-migration-scheduler/releases"
echo "   • Click \"Create a new release\""
echo "   • Tag version: v${VERSION}"
echo "   • Title: S3 Migration Scheduler v${VERSION} - Docker Hub Integration & Enhanced Features"
echo
echo -e "${GREEN}2. Upload Release Assets:${NC}"
if [ -d "electron-app/dist" ]; then
    echo "   Upload these files from electron-app/dist/:"
    for file in electron-app/dist/*.{exe,zip,AppImage,deb,dmg}; do
        [ -f "$file" ] && echo "     • $(basename "$file")"
    done
fi
echo
echo -e "${GREEN}3. Release Notes:${NC}"
echo "   • Copy from: RELEASE_NOTES_v${VERSION}.md"
echo "   • Include Docker Hub deployment instructions"
echo "   • Mention corporate environment fixes"
echo
echo -e "${GREEN}4. Docker Hub:${NC}"
echo "   • Images already available at: ${DOCKER_USERNAME}/${IMAGE_NAME}:${VERSION}"
echo "   • Test deployment: docker run -d -p 5000:5000 ${DOCKER_USERNAME}/${IMAGE_NAME}:${VERSION}"
echo

# Step 9: Open useful directories
echo -e "${BLUE}Step 9: Opening Build Directories...${NC}"
echo "====================================="

read -p "Open electron-app/dist directory in file manager? [y/N]: " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ -d "electron-app/dist" ]; then
        if command -v xdg-open &> /dev/null; then
            xdg-open "electron-app/dist"
        elif command -v open &> /dev/null; then
            open "electron-app/dist"
        else
            echo "File manager not found. Built files are in: electron-app/dist/"
        fi
    else
        echo -e "${RED}ERROR: electron-app/dist directory not found${NC}"
    fi
fi

read -p "Open GitHub releases page in browser? [y/N]: " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v xdg-open &> /dev/null; then
        xdg-open "https://github.com/hndrwn-dk/s3-migration-scheduler/releases"
    elif command -v open &> /dev/null; then
        open "https://github.com/hndrwn-dk/s3-migration-scheduler/releases"
    else
        echo "Browser not found. Visit: https://github.com/hndrwn-dk/s3-migration-scheduler/releases"
    fi
fi

echo
echo -e "${GREEN}=========================================================================${NC}"
echo -e "${GREEN}                    BUILD AND RELEASE SCRIPT COMPLETED                   ${NC}"
echo -e "${GREEN}                              Version ${VERSION}                              ${NC}"
echo -e "${GREEN}=========================================================================${NC}"
echo

echo "Press any key to continue..."
read -n 1 -s