@echo off
REM S3 Management UI - Database Restore Script (Windows)
REM Run this after git pull to restore migration data

echo 🔄 S3 Management UI Database Restore
echo ==================================

set DB_FILE=server\data\migrations.db
set BACKUP_DIR=database-backups

REM Check if backup directory exists
if not exist "%BACKUP_DIR%" (
    echo ❌ No backup directory found at %BACKUP_DIR%
    echo    Run scripts\backup-db.bat before git pull to create backups.
    pause
    exit /b 1
)

REM Find the most recent backup (simple approach for Windows)
for /f "delims=" %%A in ('dir /b /o-d "%BACKUP_DIR%\migrations_backup_*.db" 2^>nul') do (
    set LATEST_BACKUP=%BACKUP_DIR%\%%A
    goto :found
)

echo ❌ No backup files found in %BACKUP_DIR%
echo    Run scripts\backup-db.bat before git pull to create backups.
pause
exit /b 1

:found
REM Create data directory if it doesn't exist
if not exist "server\data" (
    mkdir "server\data"
    echo 📁 Created data directory: server\data
)

REM Check if current database exists
if exist "%DB_FILE%" (
    echo ⚠️  Current database exists at %DB_FILE%
    echo    Latest backup: %LATEST_BACKUP%
    echo.
    set /p "REPLY=Do you want to replace it with backup? (y/N): "
    if /i not "%REPLY%"=="y" (
        echo ❌ Restore cancelled.
        pause
        exit /b 0
    )
)

REM Restore the backup
copy "%LATEST_BACKUP%" "%DB_FILE%" >nul

if %errorlevel%==0 (
    echo ✅ Database restored from: %LATEST_BACKUP%
    echo.
    echo 📊 Restore Information:
    echo    Restored to: %DB_FILE%
    echo    From backup: %LATEST_BACKUP%
    for %%A in ("%DB_FILE%") do echo    Size:        %%~zA bytes
    echo.
    echo 🚀 You can now start the application with your previous migration data!
) else (
    echo ❌ Failed to restore database
    pause
    exit /b 1
)

pause