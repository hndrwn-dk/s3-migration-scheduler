#!/bin/bash

# S3 Migration Scheduler - Cross-Platform Windows Build Script
# This script builds Windows desktop packages from Linux/Mac environments

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
echo -e "${BLUE}          S3 Migration Scheduler - Cross-Platform Windows Build          ${NC}"
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

# Check if we can cross-compile (Wine not required, but note the limitation)
echo -e "${YELLOW}⚠ Note: Cross-compiling Windows packages from $(uname -s)${NC}"
echo -e "${YELLOW}⚠ Some native modules may not compile correctly${NC}"

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

# Step 3: Build Windows desktop packages
echo -e "${BLUE}Step 3: Building Windows Desktop Packages...${NC}"
echo "============================================="

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

# Clean previous Windows builds
echo "Cleaning previous Windows builds..."
rm -rf dist/win-*

echo "Building Windows packages..."
echo -e "${YELLOW}⚠ Building for Windows x64 only (cross-compilation)${NC}"

# Try to build Windows packages with error handling
if npm run build:win; then
    echo -e "${GREEN}✓ Windows packages built successfully${NC}"
else
    echo -e "${RED}✗ Windows build failed${NC}"
    echo -e "${YELLOW}This is expected when cross-compiling from Linux due to native dependencies${NC}"
    echo -e "${YELLOW}For Windows builds, run this script on a Windows machine with:${NC}"
    echo -e "${YELLOW}  scripts\\build\\windows\\build-windows.bat${NC}"
    exit 1
fi

echo

# Step 4: List built assets
echo -e "${BLUE}Step 4: Build Results...${NC}"
echo "========================"

echo
echo -e "${GREEN}BUILD COMPLETED SUCCESSFULLY!${NC}"
echo

if [ -d "dist" ]; then
    echo -e "${GREEN}Windows Desktop Packages:${NC}"
    echo "-------------------------"
    
    if ls dist/*.exe 1> /dev/null 2>&1; then
        for file in dist/*.exe; do
            echo "  ✓ $(basename "$file") (Windows installer)"
        done
    fi
    if ls dist/*-win-*.zip 1> /dev/null 2>&1; then
        for file in dist/*-win-*.zip; do
            echo "  ✓ $(basename "$file") (Windows portable)"
        done
    fi
    
    echo
    echo -e "${YELLOW}Built files location: ${PROJECT_ROOT}/electron-app/dist/${NC}"
    echo
else
    echo -e "${RED}ERROR: No dist directory found${NC}"
fi

echo
echo -e "${GREEN}=========================================================================${NC}"
echo -e "${GREEN}                   WINDOWS BUILD SCRIPT COMPLETED                       ${NC}"
echo -e "${GREEN}                              Version ${VERSION}                              ${NC}"
echo -e "${GREEN}=========================================================================${NC}"
echo