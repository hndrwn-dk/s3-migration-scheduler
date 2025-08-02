# 🔄 S3 Management UI - Update Guide

## 📋 How to Update While Preserving Migration Data

When updating the S3 Management UI with `git pull`, follow these steps to preserve your migration data:

### 🔒 **IMPORTANT: Your Data is Safe**
The SQLite database (`server/data/migrations.db`) contains all your migration history and is **NOT** committed to git. However, it will be preserved during updates if you follow this guide.

---

## 🐧 **Linux/MacOS Update Process**

### Step 1: Backup Your Database
```bash
# Run this BEFORE git pull
./scripts/backup-db.sh
```

### Step 2: Update the Code
```bash
# Pull latest changes
git pull origin main

# Update dependencies if needed
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..
```

### Step 3: Restore Your Database (if needed)
```bash
# If database was lost or you want to restore from backup
./scripts/restore-db.sh
```

### Step 4: Start the Application
```bash
# Start normally
scripts/02-start.sh
# OR
npm run dev
```

---

## 🪟 **Windows Update Process**

### Step 1: Backup Your Database
```batch
REM Run this BEFORE git pull
scripts\backup-db.bat
```

### Step 2: Update the Code
```batch
REM Pull latest changes
git pull origin main

REM Update dependencies if needed
scripts\01-fix-dependencies.bat
```

### Step 3: Restore Your Database (if needed)
```batch
REM If database was lost or you want to restore from backup
scripts\restore-db.bat
```

### Step 4: Start the Application
```batch
REM Start normally
scripts\02-start.bat
```

---

## 🗄️ **Database Backup Details**

### Automatic Features:
- ✅ **Timestamped backups**: Each backup has a unique timestamp
- ✅ **Automatic cleanup**: Keeps only the last 10 backups
- ✅ **Size reporting**: Shows backup file size
- ✅ **Safe operation**: Never overwrites existing backups

### Backup Location:
```
database-backups/
├── migrations_backup_20240801_143022.db
├── migrations_backup_20240801_142055.db
└── migrations_backup_20240801_141234.db
```

### What's Backed Up:
- ✅ All migration records and status
- ✅ Migration logs and statistics  
- ✅ Reconciliation data and differences
- ✅ Historical migration data
- ✅ Custom configurations

---

## 🚨 **Quick Recovery (If You Forgot to Backup)**

If you already ran `git pull` and lost your data:

### Check for Existing Database:
```bash
# Linux/MacOS
ls -la server/data/migrations.db

# Windows
dir server\data\migrations.db
```

### If Database Exists:
Your data is still there! Just restart the application.

### If Database is Missing:
1. Check if you have any backups:
   ```bash
   # Linux/MacOS
   ls -la database-backups/
   
   # Windows
   dir database-backups\
   ```

2. If backups exist, restore the latest:
   ```bash
   # Linux/MacOS
   ./scripts/restore-db.sh
   
   # Windows
   scripts\restore-db.bat
   ```

---

## 🛠️ **Troubleshooting**

### Issue: "No backup directory found"
**Solution**: You haven't created any backups yet. This is normal for first-time setups.

### Issue: "Permission denied" (Linux/MacOS)
**Solution**: Make scripts executable:
```bash
chmod +x scripts/backup-db.sh
chmod +x scripts/restore-db.sh
```

### Issue: Database restored but no migrations showing
**Solution**: 
1. Check server logs for database loading messages
2. Restart the application
3. Check browser console for errors

### Issue: Reconciliation counting wrong objects
**Solution**: The new update fixes object counting. After update:
1. Existing migration data is preserved
2. New migrations will show correct object counts
3. Reconciliation will properly count files vs directories

---

## 📊 **What's Fixed in Latest Update**

### ✅ Object Counting Fix:
- **Before**: Directories counted as objects (showed 1 object for folder with 10 files)
- **After**: Only actual files counted (shows 10 objects for 10 files)

### ✅ Database Persistence:
- **Before**: Data lost on git pull
- **After**: Backup/restore scripts preserve all data

### ✅ Reconciliation Details:
- **Before**: Empty reconciliation modal 
- **After**: Detailed differences categorized properly

---

## 💡 **Best Practices**

1. **Always backup before updates**:
   ```bash
   ./scripts/backup-db.sh && git pull
   ```

2. **Regular backups**: Run backup script periodically to save important migration data

3. **Check logs**: After update, verify migration data loaded correctly in server logs

4. **Test functionality**: Run a small test migration to verify everything works

---

## 🎯 **Expected Behavior After Update**

✅ **Migration history preserved** - All previous migrations visible  
✅ **Correct object counts** - Files counted properly, not directories  
✅ **Detailed reconciliation** - Actual differences shown with categories  
✅ **Logs accessible** - Can view logs for all migration statuses  
✅ **Persistent data** - Browser refresh doesn't lose data  

Happy migrating! 🚀