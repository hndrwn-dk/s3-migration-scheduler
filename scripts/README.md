# Scripts Directory

This directory contains all setup, maintenance, and execution scripts for the S3 Migration Dashboard. Scripts are numbered for easy sequential execution.

## 📋 Script Execution Order

### Initial Setup (Run Once)
```bash
# 1. Setup the development environment
# Linux/macOS:
./scripts/00-setup-linux.sh

# Windows:
scripts\00-setup-windows.bat
```

### Dependency Management (If Needed)
```bash
# 2. Fix missing dependencies (if npm run dev fails)
# Linux/macOS:
./scripts/01-fix-dependencies.sh

# Windows:
scripts\01-fix-dependencies.bat
```

### Application Startup (Daily Use)
```bash
# 3. Start the application
# Linux/macOS:
./scripts/02-start.sh

# Windows:
scripts\02-start.bat
```

## 📝 Script Descriptions

### `00-setup-linux.sh` / `00-setup-windows.bat`
**Purpose**: Complete environment setup
**What it does**:
- Checks system prerequisites (Node.js, npm, git)
- Installs all project dependencies (root, server, client)
- Creates environment files
- Sets up logging directories
- Generates the start script (02-start.sh/bat)
- Provides MinIO client installation guidance

**Run when**: First time setting up the project

### `01-fix-dependencies.sh` / `01-fix-dependencies.bat`
**Purpose**: Resolve dependency installation issues
**What it does**:
- Reinstalls root dependencies (including `concurrently`)
- Reinstalls server dependencies
- Reinstalls client dependencies
- Fixes the "concurrently is not recognized" error

**Run when**: 
- `npm run dev` fails with dependency errors
- After pulling latest changes
- When dependencies seem corrupted

### `02-start.sh` / `02-start.bat`
**Purpose**: Start the application in development mode
**What it does**:
- Navigates to project root
- Checks for MinIO client availability
- Starts both server and client concurrently
- Displays access URLs

**Run when**: Every time you want to start the application

## 🔧 Utility Scripts

### `enable-screenshots.sh`
**Purpose**: Enable screenshot display in README
- Uncomments image links in README.md
- Creates placeholder images if ImageMagick is available

### `generate-screenshots.sh`
**Purpose**: Guide for taking actual UI screenshots
- Provides step-by-step instructions
- Lists required screenshot files

## 🏗️ Project Structure Context

The scripts work with this project structure:
```
s3-migration-dashboard/
├── package.json           # Root package (monorepo management)
├── server/
│   ├── package.json      # Backend dependencies
│   └── ...
├── client/
│   ├── package.json      # Frontend dependencies
│   └── ...
└── scripts/              # All automation scripts
    ├── 00-setup-*.sh|bat
    ├── 01-fix-*.sh|bat
    └── 02-start.sh|bat
```

## ❓ Why Multiple package.json Files?

This is a **monorepo structure**:

1. **Root `package.json`**: 
   - Manages the overall project
   - Contains `concurrently` for running server + client
   - Defines workspace-level scripts
   - Handles monorepo dependencies

2. **Server `package.json`**:
   - Backend-specific dependencies (Express, WebSocket, etc.)
   - Server build and run scripts
   - Production deployment configuration

3. **Client `package.json`**:
   - Frontend-specific dependencies (React, TypeScript, etc.)
   - Client build and development scripts
   - Browser-specific configurations

This structure allows:
- ✅ Independent dependency management
- ✅ Separate build processes
- ✅ Clear separation of concerns
- ✅ Easy deployment of individual components
- ✅ Development convenience (single `npm run dev` starts both)

## 🚀 Quick Start Summary

1. **First time**: Run setup script (`00-setup-*`)
2. **Daily use**: Run start script (`02-start.*`)
3. **If issues**: Run fix script (`01-fix-*`), then start script

All scripts include proper error handling and user guidance!