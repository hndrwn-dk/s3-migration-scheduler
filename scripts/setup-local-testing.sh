#!/bin/bash

# 🧪 S3 Migration Scheduler - Local Testing Setup
# This script sets up everything needed for local testing

set -e

echo "🚀 Setting up S3 Migration Scheduler for local testing..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js found: $NODE_VERSION"
    else
        print_error "Node.js not found. Please install Node.js 18+ from https://nodejs.org/"
        exit 1
    fi
    
    # Check npm
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        print_success "npm found: $NPM_VERSION"
    else
        print_error "npm not found. Please install npm"
        exit 1
    fi
    
    # Check MinIO Client
    if command -v mc &> /dev/null; then
        MC_VERSION=$(mc --version | head -n 1)
        print_success "MinIO Client found: $MC_VERSION"
    else
        print_warning "MinIO Client (mc) not found. Installing..."
        install_minio_client
    fi
    
    # Check jq for JSON processing
    if ! command -v jq &> /dev/null; then
        print_warning "jq not found. Installing..."
        install_jq
    else
        print_success "jq found"
    fi
}

install_minio_client() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        curl -o mc https://dl.min.io/client/mc/release/linux-amd64/mc
        chmod +x mc
        sudo mv mc /usr/local/bin/
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        if command -v brew &> /dev/null; then
            brew install minio/stable/mc
        else
            curl -o mc https://dl.min.io/client/mc/release/darwin-amd64/mc
            chmod +x mc
            sudo mv mc /usr/local/bin/
        fi
    else
        print_error "Unsupported OS for automatic MinIO client installation. Please install manually from https://min.io/docs/minio/linux/reference/minio-mc.html"
        exit 1
    fi
    print_success "MinIO Client installed"
}

install_jq() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get update && sudo apt-get install -y jq
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        if command -v brew &> /dev/null; then
            brew install jq
        else
            print_error "Please install jq manually or install Homebrew first"
            exit 1
        fi
    else
        print_error "Please install jq manually for JSON processing"
        exit 1
    fi
}

# Setup MinIO local server
setup_minio() {
    print_status "Setting up local MinIO server..."
    
    # Check if MinIO server is already configured
    if mc alias list | grep -q "local"; then
        print_success "MinIO local alias already configured"
        return
    fi
    
    # Start MinIO server if not running
    if ! pgrep -f "minio server" > /dev/null; then
        print_status "Starting local MinIO server..."
        
        # Create MinIO data directory
        mkdir -p ./minio-data
        
        # Start MinIO server in background
        if command -v minio &> /dev/null; then
            MINIO_ROOT_USER=minioadmin MINIO_ROOT_PASSWORD=minioadmin minio server ./minio-data --console-address ":9001" &
            MINIO_PID=$!
            echo $MINIO_PID > minio.pid
            
            # Wait for MinIO to start
            sleep 3
            print_success "MinIO server started (PID: $MINIO_PID)"
        else
            print_warning "MinIO server not found. You'll need to set up your own S3-compatible storage for testing."
        fi
    else
        print_success "MinIO server already running"
    fi
    
    # Configure MinIO client
    mc alias set local http://localhost:9000 minioadmin minioadmin
    print_success "MinIO client configured for local testing"
}

# Install project dependencies
install_dependencies() {
    print_status "Installing project dependencies..."
    
    # Root dependencies
    if [ -f "package.json" ]; then
        npm install
        print_success "Root dependencies installed"
    fi
    
    # Server dependencies
    if [ -f "server/package.json" ]; then
        cd server
        npm install
        cd ..
        print_success "Server dependencies installed"
    fi
    
    # Client dependencies
    if [ -f "client/package.json" ]; then
        cd client
        npm install
        cd ..
        print_success "Client dependencies installed"
    fi
    
    # Electron app dependencies
    if [ -f "electron-app/package.json" ]; then
        cd electron-app
        npm install
        cd ..
        print_success "Electron app dependencies installed"
    fi
}

# Create test data directories
setup_test_data() {
    print_status "Setting up test data structure..."
    
    # Create data directories
    mkdir -p server/data
    mkdir -p server/logs
    
    # Set proper permissions
    chmod 755 server/data
    chmod 755 server/logs
    
    print_success "Test data directories created"
}

# Generate test datasets
generate_test_datasets() {
    print_status "Generating test datasets..."
    
    # Small dataset (Traditional mode)
    print_status "Creating small dataset (500 objects)..."
    mc mb local/test-source-small --ignore-existing 2>/dev/null || true
    mc mb local/test-dest-small --ignore-existing 2>/dev/null || true
    mc rm local/test-source-small --recursive --force 2>/dev/null || true
    mc rm local/test-dest-small --recursive --force 2>/dev/null || true
    
    for i in {1..500}; do
        if [ $((i % 100)) -eq 0 ]; then
            echo "  Generated $i/500 small files..."
        fi
        echo "Test content for file $i - $(date)" | mc pipe local/test-source-small/file-$i.txt 2>/dev/null || true
    done
    
    # Copy most files to destination (simulate partial migration)
    mc mirror local/test-source-small/ local/test-dest-small/ --exclude "file-4*.txt" 2>/dev/null || true
    print_success "Small dataset created (500 objects, traditional mode)"
    
    # Medium dataset (Large-scale mode trigger)
    print_status "Creating medium dataset (5,000 objects)..."
    mc mb local/test-source-medium --ignore-existing 2>/dev/null || true
    mc mb local/test-dest-medium --ignore-existing 2>/dev/null || true
    mc rm local/test-source-medium --recursive --force 2>/dev/null || true
    mc rm local/test-dest-medium --recursive --force 2>/dev/null || true
    
    for i in {1..5000}; do
        if [ $((i % 500)) -eq 0 ]; then
            echo "  Generated $i/5,000 medium files..."
        fi
        # Create files with random content and sizes
        SIZE=$((RANDOM % 500 + 50))
        head -c $SIZE /dev/urandom | base64 | mc pipe local/test-source-medium/data-$i.dat 2>/dev/null || true
    done
    
    # Copy 90% to destination
    mc mirror local/test-source-medium/ local/test-dest-medium/ --exclude "*[05].dat" 2>/dev/null || true
    print_success "Medium dataset created (5,000 objects)"
    
    # Large dataset (Enterprise streaming mode)
    if [ "$1" = "--large" ]; then
        print_status "Creating large dataset (50,000 objects) - this may take a few minutes..."
        mc mb local/test-source-large --ignore-existing 2>/dev/null || true
        mc mb local/test-dest-large --ignore-existing 2>/dev/null || true
        mc rm local/test-source-large --recursive --force 2>/dev/null || true
        mc rm local/test-dest-large --recursive --force 2>/dev/null || true
        
        for i in {1..50000}; do
            if [ $((i % 2500)) -eq 0 ]; then
                echo "  Generated $i/50,000 large files..."
            fi
            SIZE=$((RANDOM % 1000 + 100))
            head -c $SIZE /dev/urandom | base64 | mc pipe local/test-source-large/large-file-$i.dat 2>/dev/null || true
        done
        
        # Copy 80% to destination to create differences
        mc mirror local/test-source-large/ local/test-dest-large/ --exclude "*[05].dat" 2>/dev/null || true
        print_success "Large dataset created (50,000 objects, streaming mode)"
    else
        print_warning "Skipping large dataset generation. Use --large flag to create 50K objects dataset"
    fi
}

# Create helper scripts
create_helper_scripts() {
    print_status "Creating helper scripts..."
    
    # Test runner script
    cat > test-reconciliation.sh << 'EOF'
#!/bin/bash
echo "🧪 Testing S3 Migration Scheduler Reconciliation"
echo "Available test datasets:"
echo "  1. small (500 objects) - Traditional mode"
echo "  2. medium (5,000 objects) - Large-scale mode"
echo "  3. large (50,000 objects) - Enterprise mode (if generated)"
echo ""

test_migration() {
    local dataset=$1
    echo "🚀 Testing $dataset dataset..."
    
    # Start migration
    response=$(curl -s -X POST http://localhost:5000/api/migration/start \
        -H "Content-Type: application/json" \
        -d "{\"source\": \"local/test-source-$dataset\", \"destination\": \"local/test-dest-$dataset\", \"scheduleType\": \"immediate\"}")
    
    migration_id=$(echo $response | jq -r '.migrationId // .id // empty')
    
    if [ -z "$migration_id" ] || [ "$migration_id" = "null" ]; then
        echo "❌ Failed to start migration for $dataset"
        echo "Response: $response"
        return 1
    fi
    
    echo "📊 Migration ID: $migration_id"
    echo "🔗 Monitor at: http://localhost:3000"
    echo "📡 API Status: curl http://localhost:5000/api/migration/status/$migration_id"
    echo "📊 Reconciliation Progress: curl http://localhost:5000/api/migration/reconciliation/$migration_id/progress"
    
    return 0
}

if [ "$1" ]; then
    test_migration $1
else
    echo "Usage: $0 <small|medium|large>"
    echo "Example: $0 medium"
fi
EOF
    chmod +x test-reconciliation.sh
    
    # Monitor script
    cat > monitor-memory.sh << 'EOF'
#!/bin/bash
echo "🔍 Monitoring S3 Migration Scheduler Memory Usage"
echo "Press Ctrl+C to stop"

while true; do
    echo "$(date): Node.js Memory Usage"
    ps -p $(pgrep -f "node.*server" | head -1) -o pid,vsz,rss,pcpu,comm 2>/dev/null || echo "Server not running"
    echo "System Memory:"
    free -h 2>/dev/null || vm_stat | head -5
    echo "---"
    sleep 5
done
EOF
    chmod +x monitor-memory.sh
    
    # Quick start script
    cat > start-dev.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting S3 Migration Scheduler in Development Mode"

# Function to handle cleanup
cleanup() {
    echo "🛑 Shutting down services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start backend
echo "📡 Starting backend server..."
cd server
npm start &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 3

# Start frontend
echo "🎨 Starting frontend development server..."
cd client
npm start &
FRONTEND_PID=$!
cd ..

echo "✅ Services started!"
echo "📡 Backend: http://localhost:5000"
echo "🎨 Frontend: http://localhost:3000"
echo "📊 API Health: curl http://localhost:5000/api/health"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for processes
wait
EOF
    chmod +x start-dev.sh
    
    print_success "Helper scripts created"
}

# Display final instructions
show_final_instructions() {
    print_success "🎉 Local testing setup complete!"
    echo ""
    echo -e "${YELLOW}📋 Next Steps:${NC}"
    echo ""
    echo "1. 🚀 Start the application:"
    echo "   ./start-dev.sh"
    echo ""
    echo "2. 🧪 Test reconciliation modes:"
    echo "   ./test-reconciliation.sh small     # Traditional mode (500 objects)"
    echo "   ./test-reconciliation.sh medium    # Large-scale mode (5,000 objects)"
    if [ "$1" = "--large" ]; then
        echo "   ./test-reconciliation.sh large     # Enterprise mode (50,000 objects)"
    fi
    echo ""
    echo "3. 🔍 Monitor performance:"
    echo "   ./monitor-memory.sh"
    echo ""
    echo "4. 📊 Access the application:"
    echo "   Frontend: http://localhost:3000"
    echo "   Backend API: http://localhost:5000"
    echo "   MinIO Console: http://localhost:9001"
    echo ""
    echo -e "${YELLOW}🧪 Test Datasets Created:${NC}"
    echo "   • Small (500 objects) - Tests traditional reconciliation"
    echo "   • Medium (5,000 objects) - Tests large-scale streaming"
    if [ "$1" = "--large" ]; then
        echo "   • Large (50,000 objects) - Tests enterprise streaming"
    fi
    echo ""
    echo -e "${YELLOW}📖 Documentation:${NC}"
    echo "   • Full testing guide: docs/LOCAL_TESTING_GUIDE.md"
    echo "   • Workflow diagrams: docs/MIGRATION_WORKFLOW_DIAGRAM.md"
    echo "   • Large-scale docs: docs/LARGE_SCALE_RECONCILIATION.md"
    echo ""
    echo -e "${GREEN}🎯 Ready to test enterprise-grade S3 migrations!${NC}"
}

# Main execution
main() {
    echo "🧪 S3 Migration Scheduler - Local Testing Setup"
    echo "=============================================="
    echo ""
    
    check_prerequisites
    setup_minio
    install_dependencies
    setup_test_data
    generate_test_datasets $1
    create_helper_scripts
    show_final_instructions $1
}

# Run main function with all arguments
main "$@"