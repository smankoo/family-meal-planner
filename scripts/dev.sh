#!/bin/bash

# Family Meal Planner - Development Script
# Starts the application in development mode with live reloading and enhanced logging

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_PORT=3000
BACKEND_PORT=8000

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

info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

# Cleanup function for graceful shutdown
cleanup() {
    log "Shutting down development servers..."

    # Kill all background jobs
    jobs -p | xargs -r kill 2>/dev/null || true

    # Wait a moment for graceful shutdown
    sleep 2

    # Force kill any remaining processes on our ports
    local backend_pid=$(lsof -ti :$BACKEND_PORT 2>/dev/null || true)
    local frontend_pid=$(lsof -ti :$FRONTEND_PORT 2>/dev/null || true)

    if [ ! -z "$backend_pid" ]; then
        kill -9 $backend_pid 2>/dev/null || true
    fi

    if [ ! -z "$frontend_pid" ]; then
        kill -9 $frontend_pid 2>/dev/null || true
    fi

    success "Development servers stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Check prerequisites for development
check_dev_prerequisites() {
    log "Checking development prerequisites..."

    # Check if Docker is running (required for local Supabase)
    if ! docker info >/dev/null 2>&1; then
        error "Docker is not running"
        info "Please start Docker Desktop and try again"
        info "Local Supabase requires Docker to run"
        exit 1
    fi

    # Check if Supabase CLI is installed
    if ! command -v supabase &> /dev/null; then
        warning "Supabase CLI not found"
        info "Install with: brew install supabase/tap/supabase"
        info "Or: npm install -g supabase"
        exit 1
    fi

    # Check if local Supabase is running
    if ! curl -s http://127.0.0.1:54321/health >/dev/null 2>&1; then
        warning "Local Supabase is not running"
        info "Starting local Supabase..."
        cd supabase
        if ! supabase start; then
            error "Failed to start local Supabase"
            info "Make sure Docker Desktop is running"
            exit 1
        fi
        cd ..
        success "Local Supabase started"
    else
        success "Local Supabase is running"
    fi

    # Check if ports are available
    if lsof -Pi :$BACKEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        error "Backend port $BACKEND_PORT is already in use"
        info "Run './scripts/stop.sh' to stop any running instances"
        exit 1
    fi

    if lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        error "Frontend port $FRONTEND_PORT is already in use"
        info "Run './scripts/stop.sh' to stop any running instances"
        exit 1
    fi

    # Check if dependencies are installed
    if [ ! -d "node_modules" ]; then
        warning "Installing Node.js dependencies..."
        npm install
    fi

    if [ ! -d "backend/.venv" ]; then
        warning "Creating Python virtual environment with uv..."
        cd backend
        uv sync
        cd ..
    fi

    # Check Python dependencies
    cd backend
    source .venv/bin/activate

    # Check if FastAPI is installed
    if ! python -c "import fastapi" 2>/dev/null; then
        warning "Installing Python dependencies with uv..."
        uv sync
    fi

    cd ..

    success "Development prerequisites ready"
}

# Setup development environment
setup_dev_env() {
    log "Setting up development environment..."

    # Create logs directory
    mkdir -p logs

    # Setup backend .env if not exists
    if [ ! -f "backend/.env" ]; then
        warning "Creating backend .env file..."
        cat > backend/.env << EOF
GEMINI_API_KEY=your_gemini_api_key_here
PORT=8000
ENVIRONMENT=development
DEBUG=true
EOF
        warning "Please update backend/.env with your actual API keys"
    fi

    # Setup frontend .env.local if not exists
    if [ ! -f ".env.local" ]; then
        warning "Creating frontend .env.local file..."
        cat > .env.local << EOF
VITE_API_URL=http://localhost:8000
VITE_ENVIRONMENT=development
EOF
    fi

    success "Development environment configured"
}

# Start backend in development mode
start_backend_dev() {
    log "Starting backend in development mode..."

    cd backend
    source .venv/bin/activate

    # Start with auto-reload enabled
    uvicorn main:app --host 0.0.0.0 --port $BACKEND_PORT --reload --log-level debug > ../logs/backend-dev.log 2>&1 &

    cd ..

    # Wait for backend to start
    local attempts=0
    local max_attempts=15

    while [ $attempts -lt $max_attempts ]; do
        if curl -s -f "http://localhost:$BACKEND_PORT/" >/dev/null 2>&1; then
            success "Backend development server started"
            return 0
        fi

        attempts=$((attempts + 1))
        log "Waiting for backend... ($attempts/$max_attempts)"
        sleep 2
    done

    error "Backend failed to start. Check logs/backend-dev.log"
    return 1
}

# Start frontend in development mode
start_frontend_dev() {
    log "Starting frontend in development mode..."

    # Start Vite dev server
    npm run dev > logs/frontend-dev.log 2>&1 &

    # Wait for frontend to start
    local attempts=0
    local max_attempts=15

    while [ $attempts -lt $max_attempts ]; do
        # Check if Vite dev server is listening on the port
        if lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
            success "Frontend development server started"
            return 0
        fi

        attempts=$((attempts + 1))
        log "Waiting for frontend... ($attempts/$max_attempts)"
        sleep 2
    done

    error "Frontend failed to start. Check logs/frontend-dev.log"
    return 1
}

# Display development information
show_dev_info() {
    echo ""
    echo -e "${PURPLE}================================================================${NC}"
    echo -e "${PURPLE}                    DEVELOPMENT MODE ACTIVE                     ${NC}"
    echo -e "${PURPLE}================================================================${NC}"
    echo -e "${PURPLE} Frontend:        ${GREEN}http://localhost:$FRONTEND_PORT${NC}                      ${PURPLE} ${NC}"
    echo -e "${PURPLE} Backend:         ${GREEN}http://localhost:$BACKEND_PORT${NC}                       ${PURPLE} ${NC}"
    echo -e "${PURPLE} API Docs:        ${GREEN}http://localhost:$BACKEND_PORT/docs${NC}                 ${PURPLE} ${NC}"
    echo -e "${PURPLE} Supabase Studio: ${GREEN}http://127.0.0.1:54323${NC}                       ${PURPLE} ${NC}"
    echo -e "${PURPLE}================================================================${NC}"
    echo -e "${PURPLE} Environment: ${CYAN}LOCAL DEVELOPMENT${NC}                              ${PURPLE} ${NC}"
    echo -e "${PURPLE}   • Using local Supabase (Docker)                             ${NC}"
    echo -e "${PURPLE}   • Local Postgres database                                   ${NC}"
    echo -e "${PURPLE}   • ${GREEN}✓${NC} Isolated from production                                ${PURPLE} ${NC}"
    echo -e "${PURPLE}================================================================${NC}"
    echo -e "${PURPLE} Features:                                                      ${NC}"
    echo -e "${PURPLE}   • Hot reloading enabled for both frontend and backend       ${NC}"
    echo -e "${PURPLE}   • Debug logging enabled                                     ${NC}"
    echo -e "${PURPLE}   • Auto-restart on file changes                             ${NC}"
    echo -e "${PURPLE}================================================================${NC}"
    echo -e "${PURPLE} Logs:                                                         ${NC}"
    echo -e "${PURPLE}   Frontend: ${CYAN}tail -f logs/frontend-dev.log${NC}                 ${PURPLE} ${NC}"
    echo -e "${PURPLE}   Backend:  ${CYAN}tail -f logs/backend-dev.log${NC}                  ${PURPLE} ${NC}"
    echo -e "${PURPLE}================================================================${NC}"
    echo -e "${PURPLE} Use ${CYAN}npm run stop${NC} to stop all development servers           ${PURPLE} ${NC}"
    echo -e "${PURPLE}================================================================${NC}"
    echo ""
}

# Monitor logs in real-time
monitor_logs() {
    log "Starting log monitoring..."

    # Create a function to colorize logs
    colorize_logs() {
        local service=$1
        local color=$2
        local logfile=$3

        tail -f "$logfile" 2>/dev/null | while IFS= read -r line; do
            echo -e "${color}[$service]${NC} $line"
        done &
    }

    # Start log monitoring for both services
    if [ -f "logs/backend-dev.log" ]; then
        colorize_logs "BACKEND" "$YELLOW" "logs/backend-dev.log"
    fi

    if [ -f "logs/frontend-dev.log" ]; then
        colorize_logs "FRONTEND" "$CYAN" "logs/frontend-dev.log"
    fi
}

# Main execution
main() {
    local show_logs=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --logs|-l)
                show_logs=true
                shift
                ;;
            --help|-h)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Start the Family Meal Planner in development mode"
                echo ""
                echo "OPTIONS:"
                echo "  --logs, -l     Show live logs from both services"
                echo "  --help, -h     Show this help message"
                echo ""
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                exit 1
                ;;
        esac
    done

    log "Starting Family Meal Planner in development mode..."

    # Setup
    check_dev_prerequisites
    setup_dev_env

    # Start services
    if ! start_backend_dev; then
        cleanup
        exit 1
    fi

    if ! start_frontend_dev; then
        cleanup
        exit 1
    fi

    # Show development information
    show_dev_info

    # Start log monitoring if requested
    if [ "$show_logs" = true ]; then
        log "Starting log monitoring (Press Ctrl+C to stop log monitoring only)..."
        monitor_logs
        # Wait for user interrupt for log monitoring
        wait
    else
        log "Development servers started successfully!"
        log "Use 'npm run dev:logs' to monitor logs in real-time"
        log "Use 'npm run stop' to stop all services"
    fi
}

# Run main function
main "$@"
