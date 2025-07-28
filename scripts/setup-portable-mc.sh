#!/bin/bash

cd "$(dirname "$0")/.."

echo
echo "[PORTABLE MC SETUP] S3 Migration Dashboard"
echo
echo "This script helps you set up a portable MinIO client (mc) deployment."
echo

PROJECT_ROOT="$(pwd)"
MC_TARGET="$PROJECT_ROOT/mc"

echo "Current project directory: $PROJECT_ROOT"
echo "Target location: $MC_TARGET"
echo

# Check if mc already exists in project root
if [ -f "$MC_TARGET" ]; then
    echo "[SUCCESS] mc already exists in project root!"
    echo "Location: $MC_TARGET"
    chmod +x "$MC_TARGET"
    test_mc
fi

echo "Looking for existing mc installations..."
echo

# Try to find mc in common locations
MC_SOURCE=""

# Check common installation paths
if [ -f "/usr/local/bin/mc" ]; then
    MC_SOURCE="/usr/local/bin/mc"
    echo "Found: /usr/local/bin/mc"
elif [ -f "/usr/bin/mc" ]; then
    MC_SOURCE="/usr/bin/mc"
    echo "Found: /usr/bin/mc"
elif [ -f "/opt/minio/mc" ]; then
    MC_SOURCE="/opt/minio/mc"
    echo "Found: /opt/minio/mc"
elif command -v mc >/dev/null 2>&1; then
    MC_SOURCE="$(which mc)"
    echo "Found: $MC_SOURCE (from PATH)"
fi

if [ -n "$MC_SOURCE" ]; then
    echo
    echo "[COPY] Copying mc to project root for portable deployment..."
    cp "$MC_SOURCE" "$MC_TARGET"
    if [ $? -ne 0 ]; then
        echo "[ERROR] Failed to copy mc"
        echo "Try running with sudo or copy manually:"
        echo "cp \"$MC_SOURCE\" \"$MC_TARGET\""
        manual_instructions
    else
        echo "[SUCCESS] mc copied successfully!"
        echo "Location: $MC_TARGET"
        chmod +x "$MC_TARGET"
        test_mc
    fi
else
    echo "[NOT FOUND] No existing mc installation found."
    manual_instructions
fi

manual_instructions() {
    echo
    echo "[MANUAL SETUP REQUIRED]"
    echo
    echo "1. Download MinIO Client from: https://min.io/download#/linux"
    echo "2. Copy mc to: $MC_TARGET"
    echo "3. Make executable: chmod +x $MC_TARGET"
    echo "4. Run this script again to verify"
    echo
    exit 1
}

test_mc() {
    echo
    echo "[TEST] Testing MinIO client..."
    "$MC_TARGET" --version
    if [ $? -ne 0 ]; then
        echo "[ERROR] mc test failed"
        exit 1
    else
        echo "[SUCCESS] MinIO client is working!"
        echo
        echo "[PORTABLE DEPLOYMENT READY]"
        echo "- mc location: $MC_TARGET"
        echo "- Project is now self-contained and portable"
        echo "- You can copy the entire project folder to any Linux/macOS machine"
        echo
    fi
    
    echo
    echo "Setup complete. You can now start the application with:"
    echo "./scripts/02-start.sh"
    echo
}