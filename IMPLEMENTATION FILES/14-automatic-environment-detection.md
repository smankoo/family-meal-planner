# Automatic Environment Detection - Implementation Complete ✅

**Date:** January 28, 2026
**Status:** Configured - Automatic environment switching between dev and production

## Overview

The application now automatically detects and uses the correct configuration based on the environment:

- **Development**: Automatically uses local Supabase and local backend
- **Production**: Automatically uses production Supabase and production backend
- **No Manual Switching Required**: Just run the appropriate command

## How It Works

### Vite Environment Loading (Frontend)

Vite automatically loads environment files based on the mode:

1. **Development** (`npm run dev`):
   ```
   Priority: .env.local > .env.development > .env
   ```

2. **Production** (`npm run build:production`):
   ```
   Priority: Render env vars > .env.production > .env
   ```

### Python dotenv (Backend)

FastAPI loads environment variables in this order:

1. **Development** (local):
   ```
   Priority: backend/.env > system environment variables
   ```

2. **Production** (Render):
   ```
   Priority: Render env vars > backend/.env.production
   ```

## Configuration Files

### Frontend

#### `.env.local` (Development - Git Ignored)
```env
# Local Development with Local Supabase
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
VITE_API_URL=http://localhost:8000
VITE_ENVIRONMENT=development
VITE_GA_DEBUG=true
VITE_GA_TEST_MODE=true
```

#### `.env.production` (Production Template)
```env
# Production Configuration
# Actual values set in Render dashboard
VITE_SUPABASE_URL=https://yirgkzecscyuxisolatu.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpcmdremVjc2N5dXhpc29sYXR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1OTc2OTIsImV4cCI6MjA4NTE3MzY5Mn0.9S1RE4sIKqGZzWfTy9ql8O0fsCnPkSAHDqF98t27A6A
VITE_API_URL=https://meal-planner-api.onrender.com
VITE_ENVIRONMENT=production
VITE_GA_DEBUG=false
VITE_GA_TEST_MODE=false
```

### Backend

#### `backend/.env` (Development - Git Ignored)
```env
# Local Development
SUPABASE_URL=http://127.0.0.1:54321
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
PORT=8000
ENVIRONMENT=development
SQL_DEBUG=true
```

#### `backend/.env.production` (Production Template)
```env
# Production Configuration
# Actual values set in Render dashboard
SUPABASE_URL=https://yirgkzecscyuxisolatu.supabase.co
DATABASE_URL=postgresql://postgres.yirgkzecscyuxisolatu:***@aws-0-us-west-2.pooler.supabase.com:6543/postgres
PORT=8000
ENVIRONMENT=production
SQL_DEBUG=false
```

## Usage

### Development

```bash
# Start local Supabase (if not running)
cd supabase && supabase start

# Start full dev environment
./scripts/dev.sh

# Or start services individually
npm run dev              # Frontend only
cd backend && uv run uvicorn main:app --reload  # Backend only
```

**Automatically uses:**
- Local Supabase at `http://127.0.0.1:54321`
- Local backend at `http://localhost:8000`
- Local PostgreSQL at `127.0.0.1:54322`

### Production

```bash
# Deploy to Render
git push origin main
```

**Automatically uses:**
- Production Supabase at `yirgkzecscyuxisolatu.supabase.co`
- Production backend at `https://meal-planner-api.onrender.com`
- Production PostgreSQL (Supabase hosted)

## Render Configuration

Updated `render.yaml` with secure configuration:

```yaml
services:
  # Backend API
  - type: web
    name: meal-planner-api
    envVars:
      - key: ENVIRONMENT
        value: production
      - key: SUPABASE_URL
        value: https://yirgkzecscyuxisolatu.supabase.co
      - key: DATABASE_URL
        sync: false  # SECRET - Set in Render dashboard
      - key: GEMINI_API_KEY
        sync: false  # SECRET - Set in Render dashboard

  # Frontend Static Site
  - type: static
    name: meal-planner-frontend
    envVars:
      - key: VITE_ENVIRONMENT
        value: production
      - key: VITE_SUPABASE_URL
        value: https://yirgkzecscyuxisolatu.supabase.co
      - key: VITE_SUPABASE_ANON_KEY
        value: eyJhbGci...  # Public key - safe to commit
      - key: VITE_API_URL
        sync: false  # Set in Render dashboard
```

**Secrets (set manually in Render dashboard):**
- `DATABASE_URL` - Contains database password
- `GEMINI_API_KEY` - API key
- `VITE_API_URL` - Backend URL

See `DEPLOYMENT.md` for complete deployment instructions.

## Verification

### Check Current Environment

**In Browser Console:**
```javascript
console.log('Environment:', import.meta.env.VITE_ENVIRONMENT);
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('API URL:', import.meta.env.VITE_API_URL);
```

**Expected Output (Development):**
```
Environment: development
Supabase URL: http://127.0.0.1:54321
API URL: http://localhost:8000
```

**Expected Output (Production):**
```
Environment: production
Supabase URL: https://yirgkzecscyuxisolatu.supabase.co
API URL: https://meal-planner-api.onrender.com
```

### Backend Verification

```bash
# Check backend logs
tail -f logs/backend-dev.log | grep "SUPABASE_URL"
```

## Security Features

1. **Environment Isolation**:
   - Dev and prod use completely different Supabase instances
   - JWT tokens from dev won't work in prod (different issuers)
   - Separate databases prevent accidental data mixing

2. **Credential Management**:
   - `.env.local` and `backend/.env` are git-ignored
   - Production secrets only in Render dashboard
   - No secrets in committed code

3. **Automatic Validation**:
   - JWT issuer validation ensures correct environment
   - Database connection strings are environment-specific
   - CORS configured per environment

## Troubleshooting

### Wrong Environment Detected

**Problem**: App uses production config in development

**Solution**:
```bash
# Ensure .env.local exists
ls -la .env.local

# If missing, copy from example
cp .env.example .env.local

# Restart dev server
./scripts/stop.sh && ./scripts/dev.sh
```

### Environment Variables Not Loading

**Problem**: Changes to `.env.local` not reflected

**Solution**:
```bash
# Vite caches env vars - restart required
./scripts/stop.sh
./scripts/dev.sh
```

### Production Build Has Dev URLs

**Problem**: Built app still uses localhost

**Solution**:
```bash
# Use explicit production build
npm run build:production

# Or set mode
vite build --mode production
```

## NPM Scripts

Updated `package.json` with clear scripts:

```json
{
  "scripts": {
    "dev": "vite",                          // Dev server (uses .env.local)
    "build": "vite build",                  // Default build
    "build:production": "vite build --mode production",  // Explicit prod build
    "dev:full": "./scripts/dev.sh",         // Full dev environment
    "dev:logs": "./scripts/dev.sh --logs"   // Dev with live logs
  }
}
```

## Summary

✅ **Automatic Detection**: No manual environment switching needed
✅ **Development**: Uses `.env.local` → Local Supabase
✅ **Production**: Uses Render env vars → Production Supabase
✅ **Secure**: Secrets never committed, environments isolated
✅ **Simple**: Just run `./scripts/dev.sh` or `git push`

The application now seamlessly switches between development and production configurations based on how it's run.
