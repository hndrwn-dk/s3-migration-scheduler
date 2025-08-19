#!/bin/bash

# S3 Migration Scheduler - Linux Desktop Build Script
# This script builds Linux desktop packages (.AppImage and .deb)

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
PROJECT_ROOT="$(dirname "$(dirname "$(dirname "${SCRIPT_DIR}")")")"

echo -e "\n${BLUE}=========================================================================${NC}"
echo -e "${BLUE}                  S3 Migration Scheduler - Linux Build                   ${NC}"
echo -e "${BLUE}                              Version ${VERSION}                              ${NC}"
echo -e "${BLUE}=========================================================================${NC}\n"

echo -e "${YELLOW}Project root: ${PROJECT_ROOT}${NC}\n"

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

echo

# Step 2: Build React client (if not already built)
echo -e "${BLUE}Step 2: Ensuring React Client is Built...${NC}"
echo "==========================================="

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

# Step 3: Build Linux desktop packages
echo -e "${BLUE}Step 3: Building Linux Desktop Packages...${NC}"
echo "==========================================="

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

echo "Building Linux packages..."
npm run build:linux

echo -e "${GREEN}✓ Linux packages built successfully${NC}"
echo

# Step 4: List built assets
echo -e "${BLUE}Step 4: Build Results...${NC}"
echo "========================"

echo
echo -e "${GREEN}BUILD COMPLETED SUCCESSFULLY!${NC}"
echo

if [ -d "dist" ]; then
    echo -e "${GREEN}Linux Desktop Packages:${NC}"
    echo "------------------------"
    
    if ls dist/*.AppImage 1> /dev/null 2>&1; then
        echo "  ✓ $(basename dist/*.AppImage) (AppImage)"
    fi
    if ls dist/*.deb 1> /dev/null 2>&1; then
        echo "  ✓ $(basename dist/*.deb) (Debian package)"
    fi
    if ls dist/*.tar.gz 1> /dev/null 2>&1; then
        echo "  ✓ $(basename dist/*.tar.gz) (tarball)"
    fi
    if ls dist/*.rpm 1> /dev/null 2>&1; then
        echo "  ✓ $(basename dist/*.rpm) (RPM package)"
    fi
    
    echo
    echo -e "${YELLOW}Built files location: ${PROJECT_ROOT}/electron-app/dist/${NC}"
    echo
    
    read -p "Open dist directory in file manager? [y/N]: " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if command -v xdg-open &> /dev/null; then
            xdg-open "dist"
        elif command -v open &> /dev/null; then
            open "dist"
        else
            echo "File manager not found. Built files are in: dist/"
        fi
    fi
else
    echo -e "${RED}ERROR: No dist directory found${NC}"
fi

echo
echo -e "${GREEN}=========================================================================${NC}"
echo -e "${GREEN}                     LINUX BUILD SCRIPT COMPLETED                      ${NC}"
echo -e "${GREEN}                              Version ${VERSION}                              ${NC}"
echo -e "${GREEN}=========================================================================${NC}"
echo

echo "Press any key to continue..."
read -n 1 -s