#!/bin/bash

# S3 Management UI - Database Restore Script
# Run this after git pull to restore migration data

echo "🔄 S3 Management UI Database Restore"
echo "=================================="

DB_FILE="server/data/migrations.db"
BACKUP_DIR="database-backups"

# Check if backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
    echo "❌ No backup directory found at $BACKUP_DIR"
    echo "   Run ./scripts/backup-db.sh before git pull to create backups."
    exit 1
fi

# Find the most recent backup
LATEST_BACKUP=$(ls -t ${BACKUP_DIR}/migrations_backup_*.db 2>/dev/null | head -n 1)

if [ -z "$LATEST_BACKUP" ]; then
    echo "❌ No backup files found in $BACKUP_DIR"
    echo "   Run ./scripts/backup-db.sh before git pull to create backups."
    exit 1
fi

# Create data directory if it doesn't exist
if [ ! -d "server/data" ]; then
    mkdir -p "server/data"
    echo "📁 Created data directory: server/data"
fi

# Check if current database exists
if [ -f "$DB_FILE" ]; then
    echo "⚠️  Current database exists at $DB_FILE"
    echo "   Backup timestamp: $(date -r $LATEST_BACKUP)"
    echo "   Current timestamp: $(date -r $DB_FILE)"
    echo ""
    read -p "Do you want to replace it with backup? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Restore cancelled."
        exit 0
    fi
fi

# Restore the backup
cp "$LATEST_BACKUP" "$DB_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Database restored from: $LATEST_BACKUP"
    echo ""
    echo "📊 Restore Information:"
    echo "   Restored to: $DB_FILE"
    echo "   From backup: $LATEST_BACKUP"
    echo "   Size:        $(du -h $DB_FILE | cut -f1)"
    echo ""
    echo "🚀 You can now start the application with your previous migration data!"
else
    echo "❌ Failed to restore database"
    exit 1
fi