# Environment Setup Guide

## Overview

This project uses **proper environment separation** to ensure development work never touches production data:

- **Local Development**: Uses local Supabase instance (`supabase start`)
- **Production**: Uses remote Supabase project (isolated)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Development Environment (Your Machine)                     │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Local Supabase (Docker)                           │    │
│  │  - Postgres: localhost:54322                       │    │
│  │  - API: http://127.0.0.1:54321                     │    │
│  │  - Studio: http://127.0.0.1:54323                  │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Backend API (FastAPI)                             │    │
│  │  - Port: 8000                                      │    │
│  │  - Connects to: Local Postgres                     │    │
│  │  - JWT Validation: Local JWKS endpoint             │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Frontend (React + Vite)                           │    │
│  │  - Port: 3000                                      │    │
│  │  - Connects to: Local Supabase + Local Backend     │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Production Environment (Supabase Cloud)                    │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Production Supabase                               │    │
│  │  - Project: yirgkzecscyuxisolatu                   │    │
│  │  - Isolated from development                       │    │
│  │  - Real user data                                  │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

1. **Docker Desktop** - Required for local Supabase
   - Download: https://www.docker.com/products/docker-desktop
   - Must be running before starting development

2. **Supabase CLI** - For managing local instance
   ```bash
   brew install supabase/tap/supabase
   # or
   npm install -g supabase
   ```

3. **Node.js** - For frontend
4. **Python 3.11+** with `uv` - For backend

## Initial Setup

### 1. Start Local Supabase

```bash
# Start Docker Desktop first!

# Start local Supabase (first time will download images)
cd supabase
supabase start

# This will output:
# - API URL: http://127.0.0.1:54321
# - DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres  # pragma: allowlist secret
# - Studio URL: http://127.0.0.1:54323
# - Anon key: eyJhbGc...
```

**Important**: Save the anon key from the output!

### 2. Configure Environment Variables

**Frontend** (`.env.local`):
```bash
cp .env.example .env.local
# Edit .env.local with the anon key from supabase start
```

**Backend** (`backend/.env`):
```bash
cd backend
cp .env.example .env
# No changes needed - defaults are correct for local Supabase
```

### 3. Apply Database Migrations

```bash
# From project root
cd supabase
supabase db reset

# This applies all migrations in supabase/migrations/
# Your local database now matches the schema
```

### 4. Start Development Servers

```bash
# From project root
./scripts/dev.sh

# This starts:
# - Backend API (port 8000)
# - Frontend (port 3000)
# - Connects to local Supabase
```

## Daily Development Workflow

```bash
# 1. Start Docker Desktop

# 2. Start local Supabase (if not already running)
cd supabase && supabase start

# 3. Start dev servers
./scripts/dev.sh

# 4. Develop!
# - Frontend: http://localhost:3000
# - Backend API: http://localhost:8000
# - Supabase Studio: http://127.0.0.1:54323

# 5. Stop when done
./scripts/stop.sh
cd supabase && supabase stop
```

## Making Database Changes

### Option 1: Manual Migration (Recommended)

```bash
# Create a new migration file
cd supabase
supabase migration new add_new_feature

# Edit the generated file in supabase/migrations/
# Write your SQL

# Apply to local database
supabase db reset

# Test your changes
# Commit the migration file to git
```

### Option 2: Auto Schema Diff

```bash
# Make changes in Supabase Studio (http://127.0.0.1:54323)

# Generate migration from changes
cd supabase
supabase db diff -f add_new_feature

# Review the generated migration
# Apply it
supabase db reset

# Commit the migration file to git
```

## Environment Files

### Development (Default)
- **Frontend**: `.env.local` → Local Supabase
- **Backend**: `backend/.env` → Local Postgres
- **Never touches production**

### Production (Deployment)
- **Frontend**: `.env.production` → Production Supabase
- **Backend**: `backend/.env.production` → Production Postgres
- **Only used in CI/CD or production deployment**

## Verification

### Check Local Supabase is Running

```bash
cd supabase
supabase status

# Should show:
# API URL: http://127.0.0.1:54321
# DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
# Studio URL: http://127.0.0.1:54323
```

### Check Backend Connection

```bash
# Backend should connect to local Postgres
curl http://localhost:8000/

# Should return: {"message": "Family Meal Planner API"}
```

### Check Frontend Connection

```bash
# Open browser to http://localhost:3000
# Check browser console - should see local Supabase URL
```

## Troubleshooting

### "Docker is not running"
```bash
# Start Docker Desktop application
# Wait for it to fully start
# Try again
```

### "Port already in use"
```bash
# Stop existing Supabase
cd supabase
supabase stop

# Start again
supabase start
```

### "Migration failed"
```bash
# Reset database to clean state
cd supabase
supabase db reset

# This drops and recreates the database
# Applies all migrations from scratch
```

### "Can't connect to database"
```bash
# Check Supabase is running
cd supabase
supabase status

# Check backend .env has correct DATABASE_URL
# Should be: postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

## Production Deployment

**Never deploy from your local machine!**

Use CI/CD (GitHub Actions) to deploy:

1. Push migrations to `main` branch
2. GitHub Actions runs tests
3. Migrations applied to production Supabase
4. Backend deployed with production env vars
5. Frontend deployed with production env vars

See `.github/workflows/` for CI/CD configuration.

## Best Practices

✅ **DO**:
- Always develop against local Supabase
- Commit migration files to git
- Test migrations locally before pushing
- Use `supabase db reset` to verify migrations work from scratch
- Keep production credentials in CI/CD secrets only

❌ **DON'T**:
- Never connect to production database from local machine
- Never commit `.env.production` files
- Never run migrations directly on production
- Never share production credentials in code

## Key Benefits

1. **Safety**: Development never touches production data
2. **Speed**: Local database is fast, no network latency
3. **Offline**: Can develop without internet
4. **Testing**: Can reset database anytime without consequences
5. **Isolation**: Each developer has their own database
6. **Reproducibility**: Migrations ensure consistent schema

## Additional Resources

- [Supabase Local Development](https://supabase.com/docs/guides/cli/local-development)
- [Managing Environments](https://supabase.com/docs/guides/deployment/managing-environments)
- [Database Migrations](https://supabase.com/docs/guides/cli/managing-environments)
