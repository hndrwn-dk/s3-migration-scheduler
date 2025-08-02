@echo off
REM S3 Management UI - Database Backup Script (Windows)
REM Run this before git pull to preserve migration data

echo S3 Management UI Database Backup
echo ==================================

set DB_FILE=server\data\migrations.db
set BACKUP_DIR=database-backups
set TIMESTAMP=%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set BACKUP_FILE=%BACKUP_DIR%\migrations_backup_%TIMESTAMP%.db

REM Create backup directory if it doesn't exist
if not exist "%BACKUP_DIR%" (
    mkdir "%BACKUP_DIR%"
    echo 📁 Created backup directory: %BACKUP_DIR%
)

REM Check if database exists
if exist "%DB_FILE%" (
    REM Create backup
    copy "%DB_FILE%" "%BACKUP_FILE%" >nul
    echo ✅ Database backed up to: %BACKUP_FILE%
    
    REM Show backup info
    echo.
    echo 📊 Backup Information:
    echo    Original: %DB_FILE%
    echo    Backup:   %BACKUP_FILE%
    for %%A in ("%BACKUP_FILE%") do echo    Size:     %%~zA bytes
    echo.
    echo 💡 To restore after git pull, run: scripts\restore-db.bat
) else (
    echo ⚠️  No database found at %DB_FILE%
    echo    This is normal for fresh installations.
)

echo.
echo ✅ Backup complete. You can now safely run 'git pull'.
pause