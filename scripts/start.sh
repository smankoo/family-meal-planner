#!/bin/bash

# Family Meal Planner - Start Script
# Starts both frontend and backend with health checks and proper error handling

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_PORT=3000
BACKEND_PORT=8000
MAX_WAIT_TIME=30
HEALTH_CHECK_INTERVAL=2

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Cleanup function for graceful shutdown
cleanup() {
    log "Cleaning up processes..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    exit 1
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Check if ports are available
check_port() {
    local port=$1
    local service=$2

    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        error "$service port $port is already in use"
        log "Attempting to kill existing process on port $port..."

        # Try to kill the process gracefully
        local pid=$(lsof -ti :$port)
        if [ ! -z "$pid" ]; then
            kill $pid 2>/dev/null || true
            sleep 2

            # Force kill if still running
            if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
                kill -9 $pid 2>/dev/null || true
                sleep 1
            fi
        fi

        # Final check
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            error "Could not free port $port. Please manually kill the process and try again."
            exit 1
        fi

        success "Port $port is now available"
    fi
}

# Health check function
health_check() {
    local url=$1
    local service=$2
    local max_attempts=$((MAX_WAIT_TIME / HEALTH_CHECK_INTERVAL))
    local attempt=1

    log "Checking $service health at $url..."

    while [ $attempt -le $max_attempts ]; do
        # For frontend, check if the port is listening rather than HTTP response
        # because Vite might not respond properly to curl on the root path
        if [ "$service" = "Frontend" ]; then
            if lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
                success "$service is healthy!"
                return 0
            fi
        else
            # For backend, use HTTP check
            if curl -s -f "$url" >/dev/null 2>&1; then
                success "$service is healthy!"
                return 0
            fi
        fi

        log "Attempt $attempt/$max_attempts: $service not ready yet..."
        sleep $HEALTH_CHECK_INTERVAL
        attempt=$((attempt + 1))
    done

    error "$service failed to start within $MAX_WAIT_TIME seconds"
    return 1
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."

    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi

    # Check if Python is installed
    if ! command -v python3 &> /dev/null; then
        error "Python 3 is not installed. Please install Python 3 first."
        exit 1
    fi

    # Check if npm dependencies are installed
    if [ ! -d "node_modules" ]; then
        warning "Node modules not found. Installing dependencies..."
        npm install
    fi

    # Check if uv is installed
    if ! command -v uv &> /dev/null; then
        error "uv is not installed. Please install uv first:"
        error "curl -LsSf https://astral.sh/uv/install.sh | sh"
        exit 1
    fi

    # Check if Python virtual environment exists
    if [ ! -d "backend/.venv" ]; then
        warning "Python virtual environment not found. Creating with uv..."
        cd backend
        uv sync
        cd ..
    fi

    # Check if Python dependencies are installed
    if [ ! -f "backend/.venv/lib/python*/site-packages/fastapi" ]; then
        warning "Python dependencies not found. Installing with uv..."
        cd backend
        uv sync
        cd ..
    fi

    success "Prerequisites check completed"
}

# Start backend
start_backend() {
    log "Starting backend server..."

    cd backend

    # Check if .env file exists
    if [ ! -f ".env" ]; then
        warning "Backend .env file not found. Creating template..."
        cat > .env << EOF
GEMINI_API_KEY=your_gemini_api_key_here
PORT=8000
EOF
        warning "Please update backend/.env with your actual API keys"
    fi

    # Activate virtual environment and start server
    source .venv/bin/activate

    # Start backend in background
    python main.py > ../logs/backend.log 2>&1 &
    BACKEND_PID=$!

    cd ..

    # Wait a moment for the process to start
    sleep 2

    # Check if process is still running
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        error "Backend failed to start. Check logs/backend.log for details."
        exit 1
    fi

    log "Backend started with PID: $BACKEND_PID"
}

# Start frontend
start_frontend() {
    log "Starting frontend server..."

    # Check if .env.local exists
    if [ ! -f ".env.local" ]; then
        warning "Frontend .env.local file not found. Creating template..."
        cat > .env.local << EOF
VITE_API_URL=http://localhost:8000
EOF
    fi

    # Start frontend in background
    npm run dev > logs/frontend.log 2>&1 &
    FRONTEND_PID=$!

    # Wait a moment for the process to start
    sleep 2

    # Check if process is still running
    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        error "Frontend failed to start. Check logs/frontend.log for details."
        exit 1
    fi

    log "Frontend started with PID: $FRONTEND_PID"
}

# Main execution
main() {
    log "Starting Family Meal Planner application..."

    # Create logs directory
    mkdir -p logs

    # Check prerequisites
    check_prerequisites

    # Check if ports are available
    check_port $BACKEND_PORT "Backend"
    check_port $FRONTEND_PORT "Frontend"

    # Start backend
    start_backend

    # Health check backend
    if ! health_check "http://localhost:$BACKEND_PORT/" "Backend"; then
        cleanup
        exit 1
    fi

    # Start frontend
    start_frontend

    # Health check frontend
    if ! health_check "http://localhost:$FRONTEND_PORT/" "Frontend"; then
        cleanup
        exit 1
    fi

    # Save PIDs for stop script
    echo $BACKEND_PID > .backend.pid
    echo $FRONTEND_PID > .frontend.pid

    success "Application started successfully!"
    log "Frontend: http://localhost:$FRONTEND_PORT"
    log "Backend API: http://localhost:$BACKEND_PORT"
    log ""
    log "Services are running in the background."
    log "To stop the application, run: ./scripts/stop.sh"
    log "To view logs: tail -f logs/frontend.log or tail -f logs/backend.log"
    log "To check status: ./scripts/status.sh"
}

# Run main function
main "$@"
