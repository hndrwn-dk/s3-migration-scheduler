@echo off
echo ================================================================
echo  Fixing SQLite Issue and Building Windows App
echo ================================================================
echo.

echo [INFO] Step 1: Backing up original package.json...
copy package.json package-backup.json

echo [INFO] Step 2: Creating temporary package.json without SQLite...
(
echo {
echo   "name": "s3-migration-scheduler-desktop",
echo   "productName": "S3 Migration Scheduler",
echo   "version": "1.0.0",
echo   "description": "Desktop application for S3 bucket migrations",
echo   "main": "main.js",
echo   "homepage": "./",
echo   "author": {
echo     "name": "S3 Migration Scheduler Team",
echo     "email": "support@s3migration.com"
echo   },
echo   "license": "MIT",
echo   "scripts": {
echo     "start": "electron .",
echo     "dev": "electron . --dev",
echo     "build": "electron-builder",
echo     "build:win": "electron-builder --win",
echo     "build:linux": "electron-builder --linux",
echo     "build:mac": "electron-builder --mac",
echo     "build:all": "electron-builder --win --linux --mac",
echo     "dist": "npm run build",
echo     "pack": "electron-builder --dir"
echo   },
echo   "dependencies": {
echo     "electron-serve": "^1.3.0",
echo     "electron-window-state": "^5.0.3",
echo     "express": "^4.18.2",
echo     "cors": "^2.8.5",
echo     "helmet": "^7.1.0",
echo     "ws": "^8.14.2",
echo     "uuid": "^9.0.1",
echo     "node-cron": "^4.2.1",
echo     "fs-extra": "^11.1.1",
echo     "dotenv": "^16.3.1"
echo   },
echo   "devDependencies": {
echo     "electron": "^28.0.0",
echo     "electron-builder": "^24.9.1",
echo     "electron-devtools-installer": "^3.2.0"
echo   },
echo   "build": {
echo     "appId": "com.s3migration.scheduler",
echo     "productName": "S3 Migration Scheduler",
echo     "directories": {
echo       "output": "dist"
echo     },
echo     "files": [
echo       "main.js",
echo       "preload.js",
echo       "build/**/*",
echo       "assets/**/*"
echo     ],
echo     "win": {
echo       "target": [
echo         {
echo           "target": "nsis",
echo           "arch": ["x64"]
echo         },
echo         {
echo           "target": "portable",
echo           "arch": ["x64"]
echo         }
echo       ],
echo       "icon": "assets/icon.ico",
echo       "artifactName": "${productName} ${version}.${ext}"
echo     },
echo     "nsis": {
echo       "oneClick": false,
echo       "allowToChangeInstallationDirectory": true,
echo       "createDesktopShortcut": true,
echo       "createStartMenuShortcut": true,
echo       "installerIcon": "assets/icon.ico",
echo       "uninstallerIcon": "assets/icon.ico",
echo       "deleteAppDataOnUninstall": false,
echo       "runAfterFinish": true
echo     }
echo   }
echo }
) > package-temp.json

echo [INFO] Step 3: Replacing package.json...
copy package-temp.json package.json

echo [INFO] Step 4: Cleaning node_modules...
if exist node_modules rmdir /s /q node_modules

echo [INFO] Step 5: Installing dependencies without SQLite...
npm install

echo [INFO] Step 6: Verifying build folder exists...
if not exist "build" (
    echo [ERROR] Build folder missing. Copying from client...
    robocopy "..\client\build" "build" /E /NFL /NDL /NJH /NJS
)

echo [INFO] Step 7: Building Windows application...
echo This will take 5-10 minutes...
npx electron-builder --win

echo [INFO] Step 8: Checking results...
if exist "dist" (
    echo [SUCCESS] Build completed! Generated files:
    dir "dist" /b
    
    echo.
    echo [INFO] Copying to main dist directory...
    cd ..
    if not exist "dist" mkdir "dist"
    xcopy "electron-app\dist\*" "dist\" /Y /Q
    
    echo [SUCCESS] Windows packages ready:
    if exist "dist\*.exe" (
        for %%f in (dist\*.exe) do echo   📦 %%~nxf
    )
    cd electron-app
) else (
    echo [ERROR] Build failed - no dist directory created
)

echo.
echo [INFO] Step 9: Restoring original package.json...
copy package-backup.json package.json
del package-temp.json

echo.
echo ================================================================
echo  BUILD COMPLETED!
echo ================================================================
pause