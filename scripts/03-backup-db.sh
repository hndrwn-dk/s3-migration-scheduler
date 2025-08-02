#!/bin/bash

# S3 Management UI - Database Backup Script
# Run this before git pull to preserve migration data

echo "S3 Management UI Database Backup"
echo "=================================="

DB_FILE="server/data/migrations.db"
BACKUP_DIR="database-backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/migrations_backup_${TIMESTAMP}.db"

# Create backup directory if it doesn't exist
if [ ! -d "$BACKUP_DIR" ]; then
    mkdir -p "$BACKUP_DIR"
    echo "📁 Created backup directory: $BACKUP_DIR"
fi

# Check if database exists
if [ -f "$DB_FILE" ]; then
    # Create backup
    cp "$DB_FILE" "$BACKUP_FILE"
    echo "✅ Database backed up to: $BACKUP_FILE"
    
    # Keep only last 10 backups
    ls -t ${BACKUP_DIR}/migrations_backup_*.db | tail -n +11 | xargs -r rm
    echo "🧹 Cleaned up old backups (keeping last 10)"
    
    # Show backup info
    echo ""
    echo "📊 Backup Information:"
    echo "   Original: $DB_FILE"
    echo "   Backup:   $BACKUP_FILE"
    echo "   Size:     $(du -h $BACKUP_FILE | cut -f1)"
    echo ""
    echo "💡 To restore after git pull, run: ./scripts/restore-db.sh"
else
    echo "⚠️  No database found at $DB_FILE"
    echo "   This is normal for fresh installations."
fi

echo ""
echo "✅ Backup complete. You can now safely run 'git pull'."