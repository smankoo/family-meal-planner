#!/bin/bash

# Family Meal Planner - Stop Script
# Gracefully stops both frontend and backend services

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
GRACEFUL_TIMEOUT=10

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

# Kill process gracefully with timeout
kill_process_gracefully() {
    local pid=$1
    local name=$2
    local timeout=${3:-$GRACEFUL_TIMEOUT}
    
    if [ -z "$pid" ]; then
        warning "No PID provided for $name"
        return 1
    fi
    
    # Check if process exists
    if ! kill -0 $pid 2>/dev/null; then
        log "$name (PID: $pid) is not running"
        return 0
    fi
    
    log "Stopping $name (PID: $pid)..."
    
    # Send SIGTERM for graceful shutdown
    kill $pid 2>/dev/null || true
    
    # Wait for graceful shutdown
    local count=0
    while [ $count -lt $timeout ] && kill -0 $pid 2>/dev/null; do
        sleep 1
        count=$((count + 1))
        log "Waiting for $name to stop... ($count/$timeout)"
    done
    
    # Force kill if still running
    if kill -0 $pid 2>/dev/null; then
        warning "$name didn't stop gracefully, force killing..."
        kill -9 $pid 2>/dev/null || true
        sleep 1
        
        if kill -0 $pid 2>/dev/null; then
            error "Failed to stop $name (PID: $pid)"
            return 1
        fi
    fi
    
    success "$name stopped successfully"
    return 0
}

# Kill processes by port
kill_by_port() {
    local port=$1
    local service=$2
    
    log "Checking for processes on port $port..."
    
    local pids=$(lsof -ti :$port 2>/dev/null || true)
    
    if [ -z "$pids" ]; then
        log "No processes found on port $port"
        return 0
    fi
    
    for pid in $pids; do
        log "Found process $pid on port $port"
        kill_process_gracefully $pid "$service (port $port)"
    done
}

# Clean up PID files
cleanup_pid_files() {
    log "Cleaning up PID files..."
    
    if [ -f ".backend.pid" ]; then
        rm -f .backend.pid
        log "Removed backend PID file"
    fi
    
    if [ -f ".frontend.pid" ]; then
        rm -f .frontend.pid
        log "Removed frontend PID file"
    fi
}

# Stop services by PID files
stop_by_pid_files() {
    local stopped_any=0
    
    # Stop backend
    if [ -f ".backend.pid" ]; then
        local backend_pid=$(cat .backend.pid 2>/dev/null || true)
        if [ ! -z "$backend_pid" ]; then
            kill_process_gracefully $backend_pid "Backend"
            stopped_any=1
        fi
    fi
    
    # Stop frontend
    if [ -f ".frontend.pid" ]; then
        local frontend_pid=$(cat .frontend.pid 2>/dev/null || true)
        if [ ! -z "$frontend_pid" ]; then
            kill_process_gracefully $frontend_pid "Frontend"
            stopped_any=1
        fi
    fi
    
    return $stopped_any
}

# Find and kill Node.js processes that might be our frontend
kill_node_processes() {
    log "Checking for Node.js processes..."
    
    # Look for vite processes
    local vite_pids=$(pgrep -f "vite" 2>/dev/null || true)
    if [ ! -z "$vite_pids" ]; then
        for pid in $vite_pids; do
            # Check if it's our vite process by looking at the command line
            local cmdline=$(ps -p $pid -o command= 2>/dev/null || true)
            if echo "$cmdline" | grep -q "vite"; then
                log "Found Vite process: $pid"
                kill_process_gracefully $pid "Vite"
            fi
        done
    fi
}

# Find and kill Python processes that might be our backend
kill_python_processes() {
    log "Checking for Python processes..."
    
    # Look for uvicorn or main.py processes
    local python_pids=$(pgrep -f "main.py\|uvicorn" 2>/dev/null || true)
    if [ ! -z "$python_pids" ]; then
        for pid in $python_pids; do
            local cmdline=$(ps -p $pid -o command= 2>/dev/null || true)
            if echo "$cmdline" | grep -q "main.py\|uvicorn"; then
                log "Found Python backend process: $pid"
                kill_process_gracefully $pid "Python Backend"
            fi
        done
    fi
}

# Main execution
main() {
    log "Stopping Family Meal Planner application..."
    
    local force_mode=false
    
    # Check for force flag
    if [ "$1" = "--force" ] || [ "$1" = "-f" ]; then
        force_mode=true
        warning "Force mode enabled - will kill all related processes"
    fi
    
    # Try to stop by PID files first
    if stop_by_pid_files; then
        log "Stopped services using PID files"
    else
        log "No PID files found, checking ports and process names..."
        
        # Kill by port
        kill_by_port $BACKEND_PORT "Backend"
        kill_by_port $FRONTEND_PORT "Frontend"
        
        # Kill by process name patterns
        kill_node_processes
        kill_python_processes
    fi
    
    # Clean up PID files
    cleanup_pid_files
    
    # Final verification
    log "Performing final verification..."
    
    local backend_running=$(lsof -ti :$BACKEND_PORT 2>/dev/null || true)
    local frontend_running=$(lsof -ti :$FRONTEND_PORT 2>/dev/null || true)
    
    if [ ! -z "$backend_running" ]; then
        error "Backend is still running on port $BACKEND_PORT (PID: $backend_running)"
        if [ "$force_mode" = true ]; then
            kill -9 $backend_running 2>/dev/null || true
        fi
    fi
    
    if [ ! -z "$frontend_running" ]; then
        error "Frontend is still running on port $FRONTEND_PORT (PID: $frontend_running)"
        if [ "$force_mode" = true ]; then
            kill -9 $frontend_running 2>/dev/null || true
        fi
    fi
    
    # Check for any remaining processes
    local remaining_backend=$(lsof -ti :$BACKEND_PORT 2>/dev/null || true)
    local remaining_frontend=$(lsof -ti :$FRONTEND_PORT 2>/dev/null || true)
    
    if [ -z "$remaining_backend" ] && [ -z "$remaining_frontend" ]; then
        success "All services stopped successfully!"
        log "Ports $FRONTEND_PORT and $BACKEND_PORT are now free"
    else
        error "Some processes may still be running. Use --force flag to force kill all processes."
        exit 1
    fi
}

# Show usage if help requested
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Stop the Family Meal Planner application (frontend and backend)"
    echo ""
    echo "OPTIONS:"
    echo "  --force, -f    Force kill all related processes"
    echo "  --help, -h     Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0              # Graceful shutdown"
    echo "  $0 --force      # Force kill all processes"
    exit 0
fi

# Run main function
main "$@"