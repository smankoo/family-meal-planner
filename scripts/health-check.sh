#!/bin/bash

# Family Meal Planner - Health Check Script
# Checks the health status of both frontend and backend services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_PORT=3000
BACKEND_PORT=8000

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[✗]${NC} $1"
}

success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Check if a service is running on a port
check_port() {
    local port=$1
    local service=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        success "$service is running on port $port"
        return 0
    else
        error "$service is not running on port $port"
        return 1
    fi
}

# Check HTTP endpoint health
check_http_health() {
    local url=$1
    local service=$2
    local timeout=${3:-5}
    
    if curl -s -f --max-time $timeout "$url" >/dev/null 2>&1; then
        success "$service HTTP endpoint is healthy"
        return 0
    else
        error "$service HTTP endpoint is not responding"
        return 1
    fi
}

# Get detailed service information
get_service_info() {
    local port=$1
    local service=$2
    
    local pid=$(lsof -ti :$port 2>/dev/null || true)
    
    if [ ! -z "$pid" ]; then
        local cmd=$(ps -p $pid -o command= 2>/dev/null || true)
        local memory=$(ps -p $pid -o rss= 2>/dev/null || true)
        local cpu=$(ps -p $pid -o %cpu= 2>/dev/null || true)
        
        echo "  PID: $pid"
        echo "  Memory: ${memory}KB"
        echo "  CPU: ${cpu}%"
        echo "  Command: $cmd"
    fi
}

# Check backend API endpoints
check_backend_endpoints() {
    log "Checking backend API endpoints..."
    
    local base_url="http://localhost:$BACKEND_PORT"
    local endpoints=(
        "/"
        "/docs"
    )
    
    local healthy=0
    local total=${#endpoints[@]}
    
    for endpoint in "${endpoints[@]}"; do
        local url="$base_url$endpoint"
        if curl -s -f --max-time 5 "$url" >/dev/null 2>&1; then
            success "Endpoint $endpoint is healthy"
            healthy=$((healthy + 1))
        else
            error "Endpoint $endpoint is not responding"
        fi
    done
    
    echo "  Healthy endpoints: $healthy/$total"
}

# Check system resources
check_system_resources() {
    log "Checking system resources..."
    
    # Check available memory
    local available_memory=$(vm_stat | grep "Pages free" | awk '{print $3}' | sed 's/\.//')
    local memory_mb=$((available_memory * 4096 / 1024 / 1024))
    
    if [ $memory_mb -gt 500 ]; then
        success "Available memory: ${memory_mb}MB"
    else
        warning "Low available memory: ${memory_mb}MB"
    fi
    
    # Check disk space
    local disk_usage=$(df -h . | tail -1 | awk '{print $5}' | sed 's/%//')
    
    if [ $disk_usage -lt 90 ]; then
        success "Disk usage: ${disk_usage}%"
    else
        warning "High disk usage: ${disk_usage}%"
    fi
}

# Check log files
check_logs() {
    log "Checking log files..."
    
    local log_files=(
        "logs/frontend.log"
        "logs/backend.log"
        "logs/frontend-dev.log"
        "logs/backend-dev.log"
    )
    
    for log_file in "${log_files[@]}"; do
        if [ -f "$log_file" ]; then
            local size=$(du -h "$log_file" | cut -f1)
            local lines=$(wc -l < "$log_file")
            success "$log_file exists (${size}, ${lines} lines)"
            
            # Check for recent errors
            local recent_errors=$(tail -100 "$log_file" | grep -i "error\|exception\|failed" | wc -l)
            if [ $recent_errors -gt 0 ]; then
                warning "Found $recent_errors recent error(s) in $log_file"
            fi
        else
            warning "$log_file does not exist"
        fi
    done
}

# Main health check
main() {
    local detailed=false
    local json_output=false
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --detailed|-d)
                detailed=true
                shift
                ;;
            --json|-j)
                json_output=true
                shift
                ;;
            --help|-h)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Check the health status of the Family Meal Planner application"
                echo ""
                echo "OPTIONS:"
                echo "  --detailed, -d Show detailed service information"
                echo "  --json, -j     Output results in JSON format"
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
    
    if [ "$json_output" = true ]; then
        # JSON output for monitoring systems
        local backend_running=false
        local frontend_running=false
        local backend_healthy=false
        local frontend_healthy=false
        
        if check_port $BACKEND_PORT "Backend" >/dev/null 2>&1; then
            backend_running=true
        fi
        
        if check_port $FRONTEND_PORT "Frontend" >/dev/null 2>&1; then
            frontend_running=true
        fi
        
        if check_http_health "http://localhost:$BACKEND_PORT/" "Backend" >/dev/null 2>&1; then
            backend_healthy=true
        fi
        
        if check_http_health "http://localhost:$FRONTEND_PORT/" "Frontend" >/dev/null 2>&1; then
            frontend_healthy=true
        fi
        
        cat << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "services": {
    "backend": {
      "running": $backend_running,
      "healthy": $backend_healthy,
      "port": $BACKEND_PORT
    },
    "frontend": {
      "running": $frontend_running,
      "healthy": $frontend_healthy,
      "port": $FRONTEND_PORT
    }
  },
  "overall_status": "$([ "$backend_healthy" = true ] && [ "$frontend_healthy" = true ] && echo "healthy" || echo "unhealthy")"
}
EOF
        return 0
    fi
    
    # Regular output
    echo ""
    echo "🏥 Family Meal Planner Health Check"
    echo "=================================="
    
    local overall_healthy=true
    
    # Check backend
    log "Backend Service"
    if check_port $BACKEND_PORT "Backend"; then
        check_http_health "http://localhost:$BACKEND_PORT/" "Backend"
        
        if [ "$detailed" = true ]; then
            get_service_info $BACKEND_PORT "Backend"
            check_backend_endpoints
        fi
    else
        overall_healthy=false
    fi
    
    echo ""
    
    # Check frontend
    log "Frontend Service"
    if check_port $FRONTEND_PORT "Frontend"; then
        check_http_health "http://localhost:$FRONTEND_PORT/" "Frontend"
        
        if [ "$detailed" = true ]; then
            get_service_info $FRONTEND_PORT "Frontend"
        fi
    else
        overall_healthy=false
    fi
    
    if [ "$detailed" = true ]; then
        echo ""
        check_system_resources
        echo ""
        check_logs
    fi
    
    echo ""
    echo "=================================="
    
    if [ "$overall_healthy" = true ]; then
        success "Overall Status: HEALTHY"
        echo ""
        echo "🌐 Application URLs:"
        echo "   Frontend: http://localhost:$FRONTEND_PORT"
        echo "   Backend:  http://localhost:$BACKEND_PORT"
        echo "   API Docs: http://localhost:$BACKEND_PORT/docs"
        exit 0
    else
        error "Overall Status: UNHEALTHY"
        echo ""
        echo "💡 To start the application:"
        echo "   npm run start        # Production mode"
        echo "   npm run dev:full     # Development mode"
        exit 1
    fi
}

# Run main function
main "$@"