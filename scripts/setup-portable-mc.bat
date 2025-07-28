@echo off
cd /d "%~dp0\.."

echo.
echo [PORTABLE MC SETUP] S3 Migration Dashboard
echo.
echo This script helps you set up a portable MinIO client (mc.exe) deployment.
echo.

set "PROJECT_ROOT=%CD%"
set "MC_TARGET=%PROJECT_ROOT%\mc.exe"

echo Current project directory: %PROJECT_ROOT%
echo Target location: %MC_TARGET%
echo.

REM Check if mc.exe already exists in project root
if exist "%MC_TARGET%" (
    echo [SUCCESS] mc.exe already exists in project root!
    echo Location: %MC_TARGET%
    goto :test_mc
)

echo Looking for existing mc.exe installations...
echo.

REM Try to find mc.exe in common locations
set "MC_SOURCE="

if exist "C:\Program Files\Minio\mc.exe" (
    set "MC_SOURCE=C:\Program Files\Minio\mc.exe"
    echo Found: C:\Program Files\Minio\mc.exe
)

if exist "C:\Program Files\MinIO\mc.exe" (
    set "MC_SOURCE=C:\Program Files\MinIO\mc.exe"
    echo Found: C:\Program Files\MinIO\mc.exe
)

if exist "C:\Program Files (x86)\Minio\mc.exe" (
    set "MC_SOURCE=C:\Program Files (x86)\Minio\mc.exe"
    echo Found: C:\Program Files (x86)\Minio\mc.exe
)

if defined MC_SOURCE (
    echo.
    echo [COPY] Copying mc.exe to project root for portable deployment...
    copy "%MC_SOURCE%" "%MC_TARGET%"
    if errorlevel 1 (
        echo [ERROR] Failed to copy mc.exe
        echo Try running as administrator or copy manually:
        echo copy "%MC_SOURCE%" "%MC_TARGET%"
        goto :manual_instructions
    ) else (
        echo [SUCCESS] mc.exe copied successfully!
        echo Location: %MC_TARGET%
        goto :test_mc
    )
) else (
    echo [NOT FOUND] No existing mc.exe installation found in common locations.
    goto :manual_instructions
)

:manual_instructions
echo.
echo [MANUAL SETUP REQUIRED]
echo.
echo 1. Download MinIO Client from: https://min.io/download#/windows
echo 2. Copy mc.exe to: %MC_TARGET%
echo 3. Run this script again to verify
echo.
goto :end

:test_mc
echo.
echo [TEST] Testing MinIO client...
"%MC_TARGET%" --version
if errorlevel 1 (
    echo [ERROR] mc.exe test failed
) else (
    echo [SUCCESS] MinIO client is working!
    echo.
    echo [PORTABLE DEPLOYMENT READY]
    echo - mc.exe location: %MC_TARGET%
    echo - Project is now self-contained and portable
    echo - You can copy the entire project folder to any Windows machine
    echo.
)

:end
echo.
echo Setup complete. You can now start the application with:
echo scripts\02-start.bat
echo.
pause