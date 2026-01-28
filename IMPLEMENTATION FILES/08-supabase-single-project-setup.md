# Supabase Setup - Single Project Approach

## Overview
Since Supabase branching requires Pro plan, we'll use:
- **Local Supabase** for development (free, runs on your machine)
- **Hosted Supabase** for production (your existing project)

This gives you complete isolation without needing Pro plan.

## Architecture

### Development
```
Frontend → Local Supabase (localhost:54321)
Backend → Local PostgreSQL (localhost:54322)
```

### Production
```
Frontend → Hosted Supabase (yirgkzecscyuxisolatu.supabase.co)
Backend → Hosted PostgreSQL
```

## Setup Instructions

### 1. Start Local Supabase

```bash
# Start local Supabase stack
supabase start

# This starts:
# - PostgreSQL on localhost:54322
# - API on localhost:54321
# - Studio on localhost:54323
# - Auth, Storage, Realtime, etc.
```

### 2. Apply Migrations Locally

```bash
# Migrations are automatically applied when you run supabase start
# They're in supabase/migrations/

# To reset and reapply:
supabase db reset
```

### 3. Configure Development Environment

Create `.env.local`:
```bash
NODE_ENV=development

# Local Supabase (get these from `supabase start` output)
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<from-supabase-start-output>

# Backend API
VITE_API_URL=http://localhost:8000

# Other config
VITE_GA_DEBUG=true
VITE_GA_TEST_MODE=true
VITE_GEMINI_API_KEY=your-key
```

Create `backend/.env.development`:
```bash
# Local Supabase (get these from `supabase start` output)
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_JWT_SECRET=<from-supabase-start-output>
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres

# API
PORT=8000
GEMINI_API_KEY=your-key
SQL_DEBUG=false
```

### 4. Start Development

```bash
# Terminal 1: Keep Supabase running
supabase start

# Terminal 2: Start your app
./scripts/dev.sh
```

### 5. Access Local Services

- **App**: http://localhost:3000
- **Supabase Studio**: http://localhost:54323
- **API Docs**: http://localhost:8000/docs

## Production Setup

### 1. Link to Hosted Project

```bash
# Link to your production Supabase project
supabase link --project-ref yirgkzecscyuxisolatu
```

### 2. Push Migrations to Production

```bash
# When ready to deploy to production
supabase db push --linked
```

### 3. Configure Production Environment

Create `.env.production`:
```bash
NODE_ENV=production

# Hosted Supabase
VITE_SUPABASE_URL=https://yirgkzecscyuxisolatu.supabase.co
VITE_SUPABASE_ANON_KEY=[get-from-dashboard]

# Production API
VITE_API_URL=https://your-production-api.com

# Other config
VITE_GA_DEBUG=false
VITE_GA_TEST_MODE=false
VITE_GEMINI_API_KEY=your-prod-key
```

Create `backend/.env.production`:
```bash
# Hosted Supabase
SUPABASE_URL=https://yirgkzecscyuxisolatu.supabase.co
SUPABASE_JWT_SECRET=[get-from-dashboard-settings-api]
DATABASE_URL=[get-from-dashboard-settings-database]

# API
PORT=8000
GEMINI_API_KEY=your-prod-key
SQL_DEBUG=false
```

## Benefits of This Approach

✅ **Complete Isolation**: Dev and prod are separate databases
✅ **Free**: No Pro plan needed
✅ **Fast**: Local Supabase is instant
✅ **Safe**: Can't accidentally affect production
✅ **Full Features**: All Supabase features work locally
✅ **Offline**: Can develop without internet

## Local Supabase Commands

```bash
# Start Supabase
supabase start

# Stop Supabase
supabase stop

# Reset database (fresh start)
supabase db reset

# View status
supabase status

# View logs
supabase logs

# Access Studio
open http://localhost:54323
```

## Development Workflow

1. **Start local Supabase**: `supabase start`
2. **Develop**: Make changes, test locally
3. **Create migrations**: `supabase db diff -f migration_name`
4. **Test migrations**: `supabase db reset` (applies all migrations)
5. **Commit**: Git commit your changes
6. **Deploy to prod**: `supabase db push --linked` (when ready)

## Troubleshooting

### Port Already in Use
```bash
# Stop Supabase
supabase stop

# Kill any lingering processes
pkill -f supabase

# Start again
supabase start
```

### Database Issues
```bash
# Reset everything
supabase db reset

# This will:
# - Drop all tables
# - Reapply all migrations
# - Run seed.sql
```

### Can't Connect to Local Supabase
```bash
# Check status
supabase status

# Should show all services running
# If not, check logs:
supabase logs
```

## Migration from Current Setup

Since you already have the Supabase project set up:

1. **Keep using it for production** (don't change anything)
2. **Use local Supabase for development** (new setup)
3. **Migrations sync both ways**:
   - Develop locally
   - Push to production when ready

## Next Steps

1. Run `supabase start`
2. Configure `.env.local` and `backend/.env.development`
3. Start app with `./scripts/dev.sh`
4. Develop and test locally
5. When ready, push to production with `supabase db push --linked`

This approach gives you the best of both worlds: isolated development environment (free) and production Supabase (your existing project).
