# Family Meal Planner - Scripts Documentation

This directory contains sophisticated scripts for managing the Family Meal Planner application. These scripts handle both frontend (React/Vite) and backend (FastAPI/Python) services with proper health checks, graceful shutdowns, and comprehensive error handling.

## 🚀 Quick Start

```bash
# Start the application (production mode)
npm run start

# Start in development mode with hot reloading
npm run dev:full

# Stop the application
npm run stop

# Check application health
npm run health
```

## 📋 Available Scripts

| Script | Command | Description | Features |
|--------|---------|-------------|----------|
| **Production** |
| `start.sh` | `npm run start` | Start both services in production mode | Health checks, auto-setup, PID tracking |
| `stop.sh` | `npm run stop` | Gracefully stop all services | Graceful shutdown, cleanup, force option |
| **Development** |
| `dev.sh` | `npm run dev:full` | Start in development mode | Hot reloading, debug logging, live monitoring |
| | `npm run dev:logs` | Development mode with live logs | Real-time log streaming |
| **Monitoring** |
| `status.sh` | `npm run status` | Quick service status check | Fast overview of running services |
| `health-check.sh` | `npm run health` | Comprehensive health check | HTTP checks, resource monitoring |
| | `npm run health:detailed` | Detailed health information | Process info, system resources, logs |
| | `npm run health:json` | JSON health output | Machine-readable for monitoring |
| **Utilities** |
| | `npm run stop:force` | Force kill all processes | Emergency shutdown |

## 🔧 Configuration

### Environment Files

The scripts automatically create template environment files if they don't exist:

#### Backend (`.env`)
```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=8000
ENVIRONMENT=development
DEBUG=true
```

#### Frontend (`.env.local`)
```env
VITE_API_URL=http://localhost:8000
VITE_ENVIRONMENT=development
```

### Ports

- **Frontend**: 3000 (Vite configured port)
- **Backend**: 8000 (FastAPI default)

These can be modified in the script configuration sections.

## 📊 Logging

All scripts create detailed logs in the `logs/` directory:

- `logs/frontend.log` - Production frontend logs
- `logs/backend.log` - Production backend logs
- `logs/frontend-dev.log` - Development frontend logs
- `logs/backend-dev.log` - Development backend logs

### Viewing Logs

```bash
# View live logs
tail -f logs/backend.log
tail -f logs/frontend.log

# View development logs
tail -f logs/backend-dev.log
tail -f logs/frontend-dev.log

# Search for errors
grep -i error logs/*.log
```

## 🛠️ Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Check what's using the port
lsof -i :8000
lsof -i :3000

# Force stop all services
npm run stop:force
```

#### Services Won't Start
```bash
# Check detailed health status
npm run health:detailed

# View recent logs
tail -50 logs/backend.log
tail -50 logs/frontend.log
```

#### Dependencies Missing
```bash
# The start script will automatically install missing dependencies
# But you can manually install them:
npm install                    # Frontend dependencies
cd backend && pip install -r requirements.txt  # Backend dependencies
```

### Script Debugging

All scripts support verbose output and have comprehensive error handling. Check the logs directory for detailed information about any failures.

#### Enable Debug Mode
```bash
# Run scripts with bash debug mode
bash -x ./scripts/start.sh
```

## 🔒 Security Features

- ✅ Input validation and sanitization
- ✅ Process isolation and cleanup
- ✅ Graceful signal handling
- ✅ Timeout protection against hanging processes
- ✅ Port security checks
- ✅ Environment variable validation

## 🚦 Process Management

### PID Tracking
The scripts maintain PID files for proper process management:
- `.backend.pid` - Backend process ID
- `.frontend.pid` - Frontend process ID

### Signal Handling
All scripts properly handle:
- `SIGINT` (Ctrl+C) - Graceful shutdown
- `SIGTERM` - Graceful termination
- `SIGKILL` - Force termination (fallback)

## 📈 Monitoring Integration

The health check script supports JSON output for integration with monitoring systems:

```bash
# Get health status in JSON format
npm run health:json

# Example output:
{
  "timestamp": "2024-01-27T10:30:00Z",
  "services": {
    "backend": {
      "running": true,
      "healthy": true,
      "port": 8000
    },
    "frontend": {
      "running": true,
      "healthy": true,
      "port": 5173
    }
  },
  "overall_status": "healthy"
}
```

## 🔄 CI/CD Integration

These scripts are designed to work well in CI/CD environments:

```yaml
# Example GitHub Actions usage
- name: Start Application
  run: npm run start

- name: Health Check
  run: npm run health:json

- name: Stop Application
  run: npm run stop
```

## 📝 Best Practices

1. **Always use the provided scripts** instead of running services manually
2. **Check health status** before running tests or deployments
3. **Monitor logs** for early detection of issues
4. **Use development mode** for local development with hot reloading
5. **Graceful shutdown** to prevent data corruption or resource leaks

## 🆘 Support

If you encounter issues with the scripts:

1. Check the logs in the `logs/` directory
2. Run health check with detailed output: `npm run health:detailed`
3. Try force stopping and restarting: `npm run stop:force && npm run start`
4. Verify all dependencies are installed and up to date

For script modifications or enhancements, all scripts are well-documented with inline comments and follow bash best practices.