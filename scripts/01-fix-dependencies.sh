#!/bin/bash

echo "Fixing S3 Migration Dashboard Dependencies..."
echo "==============================================="
echo ""

# Navigate to project root
cd "$(dirname "$0")/.."

# Install root dependencies
echo "Installing root dependencies (including concurrently)..."
if npm install; then
    echo "[SUCCESS] Root dependencies installed successfully"
else
    echo "[ERROR] Failed to install root dependencies"
    echo "Please check your Node.js and npm installation"
    exit 1
fi

echo ""
echo "Installing server dependencies..."
cd server
if npm install; then
    echo "[SUCCESS] Server dependencies installed successfully"
else
    echo "[ERROR] Failed to install server dependencies"
    exit 1
fi
cd ..

echo ""
echo "Installing client dependencies..."
cd client
if npm install; then
    echo "[SUCCESS] Client dependencies installed successfully"
else
    echo "[ERROR] Failed to install client dependencies"
    exit 1
fi
cd ..

echo ""
echo "[SUCCESS] All dependencies installed successfully!"
echo "You can now run: ./scripts/02-start.sh"
echo ""