<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1MF1dWa5oZaGgIdiWFym23qBk8oQNPx36

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1MF1dWa5oZaGgIdiWFym23qBk8oQNPx36

## 🚀 Quick Start

**Prerequisites:** Node.js and Python 3.11+ with [uv](https://docs.astral.sh/uv/) package manager

### Install uv (if not already installed)
```bash
# Install uv package manager
curl -LsSf https://astral.sh/uv/install.sh | sh
# Or with pip: pip install uv
```

### Simple Start (Recommended)
```bash
# Install dependencies and start both frontend and backend
npm run start
# Services start and script exits - they run in background
```

### Development Mode
```bash
# Start with hot reloading and enhanced logging
npm run dev:full
# Services start and script exits - they run in background

# Or start with live log monitoring
npm run dev:logs
# Services start and logs are monitored (Ctrl+C stops monitoring only)
```

### Stop Application
```bash
# Graceful shutdown
npm run stop

# Force stop if needed
npm run stop:force
```

### Check Status
```bash
# Quick status check
npm run status

# Full health check
npm run health
```

## 📋 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run start` | Start both frontend and backend (services run in background) |
| `npm run stop` | Gracefully stop all services |
| `npm run dev:full` | Start in development mode (services run in background) |
| `npm run dev:logs` | Development mode with live log monitoring |
| `npm run status` | Quick service status check |
| `npm run health` | Check application health status |
| `npm run health:detailed` | Detailed health check with system info |

## 🔧 Manual Setup (Alternative)

If you prefer to set up manually:

1. **Install dependencies:**
   ```bash
   npm install
   cd backend && uv sync
   ```

2. **Set up environment variables:**
   - Set `GEMINI_API_KEY` in `backend/.env`
   - Configure frontend settings in `.env.local`

3. **Run services separately:**
   ```bash
   # Terminal 1 - Backend
   cd backend && source .venv/bin/activate && python main.py

   # Terminal 2 - Frontend
   npm run dev
   ```

## 📊 Application URLs

When running:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## 🛠️ Troubleshooting

- **Port conflicts**: Run `npm run stop:force` to kill any stuck processes
- **Dependencies issues**: The start script will auto-install missing dependencies
- **Service health**: Use `npm run health:detailed` to diagnose issues
- **Logs**: Check `logs/` directory for detailed error information

## 📚 Documentation

For detailed script documentation and advanced usage, see [scripts/README.md](scripts/README.md).
