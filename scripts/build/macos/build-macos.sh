#!/bin/bash

# S3 Migration Scheduler - macOS Desktop Build Script
# This script builds macOS desktop packages (.dmg and .zip)

set -e

# Configuration
VERSION="1.2.0"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$(dirname "${SCRIPT_DIR}")")")"

echo -e "\n${BLUE}=========================================================================${NC}"
echo -e "${BLUE}                  S3 Migration Scheduler - macOS Build                   ${NC}"
echo -e "${BLUE}                              Version ${VERSION}                              ${NC}"
echo -e "${BLUE}=========================================================================${NC}\n"

echo -e "${YELLOW}Project root: ${PROJECT_ROOT}${NC}\n"

if [[ "$(uname -s)" != "Darwin" ]]; then
    echo -e "${RED}ERROR: macOS packages must be built on macOS${NC}"
    echo -e "${YELLOW}Run this script on a Mac: ./scripts/build/macos/build-macos.sh${NC}"
    exit 1
fi

echo -e "${BLUE}Step 1: Checking Prerequisites...${NC}"
echo "======================================"

if ! command -v node &> /dev/null; then
    echo -e "${RED}ERROR: Node.js is not installed or not in PATH${NC}"
    exit 1
fi
echo -e "${GREEN}Node.js found: $(node --version)${NC}"

if ! command -v npm &> /dev/null; then
    echo -e "${RED}ERROR: npm is not installed or not in PATH${NC}"
    exit 1
fi
echo -e "${GREEN}npm found: $(npm --version)${NC}"

echo

echo -e "${BLUE}Step 2: Ensuring React Client is Built...${NC}"
echo "==========================================="

cd "${PROJECT_ROOT}/client"

if [ ! -d "node_modules" ]; then
    echo "Installing client dependencies..."
    npm install
fi
npm run build
echo -e "${GREEN}React client built successfully${NC}"

echo

echo -e "${BLUE}Step 3: Building macOS Desktop Packages...${NC}"
echo "==========================================="

cd "${PROJECT_ROOT}/electron-app"

if [ ! -d "node_modules" ]; then
    echo "Installing electron app dependencies..."
    npm install
fi

echo "Installing server dependencies..."
cd "${PROJECT_ROOT}/server"
npm install --production
echo -e "${GREEN}Server dependencies installed${NC}"

cd "${PROJECT_ROOT}/electron-app"

echo "Building macOS packages (dmg and zip for x64 and arm64)..."
npm run build:mac

echo -e "${GREEN}macOS packages built successfully${NC}"
echo

echo -e "${BLUE}Step 4: Build Results...${NC}"
echo "========================"

echo
echo -e "${GREEN}BUILD COMPLETED SUCCESSFULLY${NC}"
echo

if [ -d "dist" ]; then
    echo -e "${GREEN}macOS Desktop Packages:${NC}"
    echo "------------------------"

    if ls dist/*.dmg 1> /dev/null 2>&1; then
        for file in dist/*.dmg; do
            echo "  $(basename "$file") (disk image)"
        done
    fi
    if ls dist/*-mac-*.zip 1> /dev/null 2>&1; then
        for file in dist/*-mac-*.zip; do
            echo "  $(basename "$file") (zip)"
        done
    fi

    echo
    echo -e "${YELLOW}Built files location: ${PROJECT_ROOT}/electron-app/dist/${NC}"
    echo

    if [ -t 0 ]; then
        read -p "Open dist directory in Finder? [y/N]: " -n 1 -r
        echo
        if [[ ${REPLY:-} =~ ^[Yy]$ ]]; then
            open "dist"
        fi
    fi
else
    echo -e "${RED}ERROR: No dist directory found${NC}"
fi

echo
echo -e "${GREEN}=========================================================================${NC}"
echo -e "${GREEN}                     MACOS BUILD SCRIPT COMPLETED                      ${NC}"
echo -e "${GREEN}                              Version ${VERSION}                              ${NC}"
echo -e "${GREEN}=========================================================================${NC}"
echo

if [ -t 0 ]; then
    echo "Press any key to continue..."
    read -n 1 -s
fi
