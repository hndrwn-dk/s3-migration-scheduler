#!/bin/bash

# S3 Migration Dashboard - Linux Setup Script
# This script sets up the development environment on Linux

set -e

echo "S3 Migration Dashboard - Linux Setup"
echo "====================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "\n${BLUE}==>${NC} $1"
}

# Check if running on Linux
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    print_error "This script is designed for Linux. For Windows, use scripts/setup-windows.bat"
    exit 1
fi

# Step 1: Check prerequisites
print_step "Checking prerequisites..."

# Check Node.js
if ! command -v node >/dev/null 2>&1; then
    print_error "Node.js is not installed"
    echo "Please install Node.js 18.x or later from: https://nodejs.org/"
    echo "Or using package manager:"
    echo "  Ubuntu/Debian: sudo apt install nodejs npm"
    echo "  CentOS/RHEL: sudo yum install nodejs npm"
    echo "  Arch: sudo pacman -S nodejs npm"
    exit 1
else
    NODE_VERSION=$(node --version)
    print_status "Node.js found: $NODE_VERSION"
fi

# Check npm
if ! command -v npm >/dev/null 2>&1; then
    print_error "npm is not installed"
    echo "Please install npm along with Node.js"
    exit 1
else
    NPM_VERSION=$(npm --version)
    print_status "npm found: $NPM_VERSION"
fi

# Check MinIO client (optional)
if ! command -v mc >/dev/null 2>&1; then
    print_warning "MinIO client (mc) not found"
    echo "Migrations will not work without MinIO client. To install:"
    echo ""
    echo "  wget https://dl.min.io/client/mc/release/linux-amd64/mc"
    echo "  chmod +x mc"
    echo "  sudo mv mc /usr/local/bin/"
    echo ""
    echo "Or visit: https://docs.min.io/docs/minio-client-quickstart-guide.html"
    echo ""
else
    MC_VERSION=$(mc --version | head -n1)
    print_status "MinIO client found: $MC_VERSION"
fi

# Step 2: Install root dependencies
print_step "Installing root dependencies..."
if npm install; then
    print_status "Root dependencies installed successfully"
else
    print_error "Failed to install root dependencies"
    exit 1
fi

# Step 3: Install server dependencies
print_step "Installing server dependencies..."
cd server
if npm install; then
    print_status "Server dependencies installed successfully"
else
    print_error "Failed to install server dependencies"
    exit 1
fi
cd ..

# Step 4: Install client dependencies
print_step "Installing client dependencies..."
cd client
if npm install; then
    print_status "Client dependencies installed successfully"
else
    print_error "Failed to install client dependencies"
    exit 1
fi
cd ..

# Step 5: Setup environment configuration
print_step "Setting up environment configuration..."

# Create server .env file if it doesn't exist
if [ ! -f "server/.env" ]; then
    if [ -f "server/.env.example" ]; then
        cp server/.env.example server/.env
        print_status "Created server/.env from .env.example"
    else
        print_warning ".env.example not found, creating basic .env file"
        cat > server/.env << EOF
PORT=5000
NODE_ENV=development

# MinIO/S3 Configuration
MC_PATH=/usr/local/bin/mc
LOG_LEVEL=info
MAX_CONCURRENT_MIGRATIONS=3

# CORS Configuration
FRONTEND_URL=http://localhost:3000
EOF
    fi
else
    print_status "server/.env already exists"
fi

# Step 6: Create logs directory
print_step "Creating logs directory..."
mkdir -p server/logs
print_status "Created server/logs directory"

# Step 7: Build client for production (optional)
if [ "$1" = "--production" ] || [ "$1" = "-p" ]; then
    print_step "Building client for production..."
    cd client
    if npm run build; then
        print_status "Client built successfully for production"
    else
        print_warning "Failed to build client for production"
    fi
    cd ..
fi

# Step 8: Create start script
print_step "Creating start script..."
cat > scripts/02-start.sh << 'EOF'
#!/bin/bash

# S3 Migration Dashboard Startup Script

echo "Starting S3 Migration Dashboard..."

# Navigate to project root
cd "$(dirname "$0")/.."

# Check if MinIO client is available
if ! command -v mc >/dev/null 2>&1; then
    echo "Warning: MinIO client (mc) not found in PATH"
    echo "Migrations will not work without MinIO client installed"
    echo "Visit: https://docs.min.io/docs/minio-client-quickstart-guide.html"
    echo ""
fi

# Start the application
echo "Dashboard will be available at: http://localhost:3000"
echo "API server will be available at: http://localhost:5000"
echo ""
echo "Press Ctrl+C to stop the application"
echo ""

npm run dev
EOF

chmod +x scripts/02-start.sh
print_status "Created executable scripts/02-start.sh script"

# Step 9: Completion message
echo ""
echo "Setup completed successfully!"
echo ""
echo "Next steps:"
echo "   1. Configure your S3 endpoints in the dashboard"
echo "   2. Start the application: ./scripts/02-start.sh"
echo "   3. Open browser: http://localhost:3000"
echo ""

if ! command -v mc >/dev/null 2>&1; then
    echo "Don't forget to install MinIO client for migrations to work:"
    echo "   wget https://dl.min.io/client/mc/release/linux-amd64/mc"
    echo "   chmod +x mc && sudo mv mc /usr/local/bin/"
    echo ""
fi

echo "For more information, see README.md"
echo ""