#!/bin/bash

# Family Meal Planner - Quick Status Script
# Quick status check without detailed health verification

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_PORT=3000
BACKEND_PORT=8000

# Check if service is running
check_service() {
    local port=$1
    local name=$2

    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        local pid=$(lsof -ti :$port)
        echo -e "${GREEN}●${NC} $name is running (PID: $pid, Port: $port)"
        return 0
    else
        echo -e "${RED}●${NC} $name is not running (Port: $port)"
        return 1
    fi
}

echo "Family Meal Planner - Service Status"
echo "===================================="

backend_running=false
frontend_running=false

if check_service $BACKEND_PORT "Backend"; then
    backend_running=true
fi

if check_service $FRONTEND_PORT "Frontend"; then
    frontend_running=true
fi

echo ""

if [ "$backend_running" = true ] && [ "$frontend_running" = true ]; then
    echo -e "${GREEN}✓ All services are running${NC}"
    echo ""
    echo "🌐 Access your application:"
    echo "   Frontend: http://localhost:$FRONTEND_PORT"
    echo "   Backend:  http://localhost:$BACKEND_PORT"
    echo "   API Docs: http://localhost:$BACKEND_PORT/docs"
elif [ "$backend_running" = true ] || [ "$frontend_running" = true ]; then
    echo -e "${YELLOW}⚠ Some services are running${NC}"
    echo ""
    echo "💡 To start missing services: npm run start"
else
    echo -e "${RED}✗ No services are running${NC}"
    echo ""
    echo "💡 To start the application:"
    echo "   npm run start        # Production mode"
    echo "   npm run dev:full     # Development mode"
fi

echo ""
echo "🔧 Management commands:"
echo "   npm run status       # This status check"
echo "   npm run health       # Full health check"
echo "   npm run stop         # Stop all services"
