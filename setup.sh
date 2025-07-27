#!/bin/bash

# S3 Migration Dashboard Setup Script
# This script sets up the complete development environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Node.js
    if command_exists node; then
        NODE_VERSION=$(node --version)
        print_success "Node.js found: $NODE_VERSION"
    else
        print_error "Node.js is not installed. Please install Node.js 18.x or higher."
        exit 1
    fi
    
    # Check npm
    if command_exists npm; then
        NPM_VERSION=$(npm --version)
        print_success "npm found: $NPM_VERSION"
    else
        print_error "npm is not installed. Please install npm."
        exit 1
    fi
    
    # Check MinIO client
    if command_exists mc; then
        MC_VERSION=$(mc --version 2>/dev/null | head -n1 || echo "Unknown version")
        print_success "MinIO client found: $MC_VERSION"
    else
        print_warning "MinIO client (mc) not found in PATH."
        print_warning "The application will still work, but you'll need to install 'mc' for migrations to function."
        print_warning "Visit: https://docs.min.io/docs/minio-client-quickstart-guide.html"
    fi
}

# Install dependencies
install_dependencies() {
    print_status "Installing project dependencies..."
    
    # Install root dependencies
    print_status "Installing root dependencies..."
    npm install
    
    # Install server dependencies
    print_status "Installing server dependencies..."
    cd server && npm install && cd ..
    
    # Install client dependencies
    print_status "Installing client dependencies..."
    cd client && npm install && cd ..
    
    print_success "All dependencies installed successfully!"
}

# Setup environment files
setup_environment() {
    print_status "Setting up environment files..."
    
    if [ ! -f "server/.env" ]; then
        if [ -f "server/.env.example" ]; then
            cp server/.env.example server/.env
            print_success "Created server/.env from example file"
            print_warning "Please edit server/.env with your configuration"
        else
            print_warning "server/.env.example not found, creating basic .env file"
            cat > server/.env << EOF
PORT=5000
NODE_ENV=development
MC_PATH=mc
LOG_LEVEL=info
MAX_CONCURRENT_MIGRATIONS=3
FRONTEND_URL=http://localhost:3000
EOF
            print_success "Created basic server/.env file"
        fi
    else
        print_success "server/.env already exists"
    fi
}

# Create startup script
create_startup_script() {
    print_status "Creating startup script..."
    
    cat > start.sh << 'EOF'
#!/bin/bash

# S3 Migration Dashboard Startup Script

echo "🚀 Starting S3 Migration Dashboard..."

# Check if MinIO client is available
if ! command -v mc >/dev/null 2>&1; then
    echo "⚠️  Warning: MinIO client (mc) not found in PATH"
    echo "   Migrations will not work without MinIO client installed"
    echo "   Visit: https://docs.min.io/docs/minio-client-quickstart-guide.html"
    echo ""
fi

# Start the application
echo "📊 Dashboard will be available at: http://localhost:3000"
echo "🔌 API server will be available at: http://localhost:5000"
echo ""
echo "Press Ctrl+C to stop the application"
echo ""

npm run dev
EOF
    
    chmod +x start.sh
    print_success "Created start.sh script"
}

# Create logs directory
create_directories() {
    print_status "Creating necessary directories..."
    
    mkdir -p server/logs
    print_success "Created server/logs directory"
}

# Build client for production (optional)
build_production() {
    if [ "$1" = "--production" ]; then
        print_status "Building client for production..."
        cd client && npm run build && cd ..
        print_success "Client built for production"
    fi
}

# Display final instructions
display_instructions() {
    echo ""
    echo "🎉 Setup completed successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Configure your S3 connections in server/.env (if needed)"
    echo "2. Install MinIO client if not already installed:"
    echo "   • Linux/macOS: curl https://dl.min.io/client/mc/release/linux-amd64/mc -o mc && chmod +x mc"
    echo "   • Windows: Download from https://dl.min.io/client/mc/release/windows-amd64/mc.exe"
    echo "3. Start the application:"
    echo "   • Development: ./start.sh or npm run dev"
    echo "   • Production: npm run build && npm start"
    echo ""
    echo "🌐 Access points:"
    echo "   • Dashboard: http://localhost:3000"
    echo "   • API: http://localhost:5000"
    echo ""
    echo "📚 Documentation: See README.md for detailed usage instructions"
    echo ""
}

# Main setup function
main() {
    echo "🔧 S3 Migration Dashboard Setup"
    echo "================================="
    echo ""
    
    check_prerequisites
    echo ""
    
    install_dependencies
    echo ""
    
    setup_environment
    echo ""
    
    create_directories
    echo ""
    
    create_startup_script
    echo ""
    
    build_production "$1"
    
    display_instructions
}

# Run main function with all arguments
main "$@"