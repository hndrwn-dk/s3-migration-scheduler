@echo off

REM S3 Migration Dashboard Startup Script

echo 🚀 Starting S3 Migration Dashboard...

REM Check if MinIO client is available
mc --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ⚠️  Warning: MinIO client ^(mc^) not found in PATH
    echo    Migrations will not work without MinIO client installed
    echo    Visit: https://docs.min.io/docs/minio-client-quickstart-guide.html
    echo.
)

REM Start the application
echo 📊 Dashboard will be available at: http://localhost:3000
echo 🔌 API server will be available at: http://localhost:5000
echo.
echo Press Ctrl+C to stop the application
echo.

call npm run dev
pause