#!/bin/bash

echo "🔧 Fixing S3 Migration Dashboard Dependencies..."
echo "==============================================="
echo ""

# Install root dependencies
echo "Installing root dependencies (including concurrently)..."
if npm install; then
    echo "✅ Root dependencies installed successfully"
else
    echo "❌ Failed to install root dependencies"
    echo "Please check your Node.js and npm installation"
    exit 1
fi

echo ""
echo "Installing server dependencies..."
cd server
if npm install; then
    echo "✅ Server dependencies installed successfully"
else
    echo "❌ Failed to install server dependencies"
    exit 1
fi
cd ..

echo ""
echo "Installing client dependencies..."
cd client
if npm install; then
    echo "✅ Client dependencies installed successfully"
else
    echo "❌ Failed to install client dependencies"
    exit 1
fi
cd ..

echo ""
echo "✅ All dependencies installed successfully!"
echo "You can now run: ./start.sh"
echo ""