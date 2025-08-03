# Scripts Directory

This directory contains all setup, maintenance, and execution scripts for the S3 Management UI. Scripts are numbered for easy sequential execution.

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

### Database Management (Before/After Updates)
```bash
# 4. Backup database before git pull
# Linux/macOS:
./scripts/03-backup-db.sh

# Windows:
scripts\03-backup-db.bat

# 5. Restore database after git pull (if needed)
# Linux/macOS:
./scripts/04-restore-db.sh

# Windows:
scripts\04-restore-db.bat
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

### `03-backup-db.sh` / `03-backup-db.bat`
**Purpose**: Backup SQLite database before updates
**What it does**:
- Creates timestamped backup of `server/data/migrations.db`
- Stores backups in `database-backups/` directory
- Automatically cleans up old backups (keeps last 10)
- Reports backup size and location

**Run when**: 
- Before running `git pull`
- Before major updates
- As a precautionary backup

### `04-restore-db.sh` / `04-restore-db.bat`
**Purpose**: Restore SQLite database from backup
**What it does**:
- Finds the most recent database backup
- Safely restores database with user confirmation
- Creates data directory if needed
- Reports restore information

**Run when**: 
- After `git pull` if migration data was lost
- To recover from database corruption
- To revert to a previous database state

## 🔄 Database Backup/Restore Workflow

The database contains your migration history and is **not committed to git**. When updating the application:

```bash
# 1. Backup before update
./scripts/03-backup-db.sh

# 2. Update code
git pull origin main

# 3. Restore if needed (only if data was lost)
./scripts/04-restore-db.sh

# 4. Start application (data preserved!)
./scripts/02-start.sh
```

## 🏗️ Project Structure Context

The scripts work with this project structure:
```
s3-migration-scheduler/
├── package.json           # Root package (monorepo management)
├── server/
│   ├── package.json      # Backend dependencies
│   ├── data/             # SQLite database (gitignored)
│   │   └── migrations.db # Your migration data
│   └── ...
├── client/
│   ├── package.json      # Frontend dependencies
│   └── ...
├── database-backups/     # Database backups (gitignored)
│   └── migrations_backup_*.db
└── scripts/              # All automation scripts
    ├── 00-setup-*.sh|bat
    ├── 01-fix-*.sh|bat
    ├── 02-start.sh|bat
    ├── 03-backup-db.sh|bat
    └── 04-restore-db.sh|bat
```

## ❓ Why Multiple package.json Files?

This is a **monorepo structure**:

1. **Root `package.json`**: 
   - Manages the overall project
   - Contains `concurrently` for running server + client
   - Defines workspace-level scripts
   - Handles monorepo dependencies

2. **Server `package.json`**:
   - Backend-specific dependencies (Express, WebSocket, SQLite, etc.)
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
4. **Before updates**: Run backup script (`03-backup-db.*`)
5. **After updates**: Run restore script (`04-restore-db.*`) if needed

## 🛡️ Data Persistence

**Important**: Your migration data is stored in `server/data/migrations.db` and is **not committed to git**. Always use the backup/restore scripts when updating to preserve your migration history.

All scripts include proper error handling and user guidance!