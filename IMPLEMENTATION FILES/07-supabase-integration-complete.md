# Supabase Integration - Complete Implementation

## Overview
Complete Supabase integration with secure backend validation, ORM compatibility, and IaC setup.

## Architecture

### Authentication Flow
```
Frontend → Supabase Auth (login/register)
Frontend gets JWT token
Frontend → FastAPI (with JWT in Authorization header)
FastAPI validates JWT
FastAPI → Supabase PostgreSQL (via SQLAlchemy ORM)
```

### Security
- ✅ Supabase handles authentication
- ✅ Backend validates all JWT tokens
- ✅ No direct database access from frontend
- ✅ Row Level Security (RLS) as backup
- ✅ Enterprise-grade security model

## Setup Instructions

### 1. Initialize Supabase (IaC)

```bash
# Already done - supabase directory created with:
# - config.toml (configuration as code)
# - migrations/ (database schema)
# - seed.sql (dev data)
```

### 2. Create Development Branch

```bash
# Make setup script executable
chmod +x supabase/setup.sh

# Run setup script
./supabase/setup.sh

# Select option 1 to create development branch
# This creates an isolated dev environment
```

### 3. Get Supabase Credentials

After creating the branch:

```bash
# List branches to get project IDs
supabase --experimental branches list

# Switch to develop branch in Supabase Dashboard
# Go to Settings > API and copy:
# - Project URL
# - anon key (public)
# - service_role key (secret)
# - JWT Secret
```

### 4. Configure Backend Environment

Create `backend/.env.development`:

```bash
# Supabase Configuration (Development Branch)
SUPABASE_URL=https://[dev-branch-ref].supabase.co
SUPABASE_JWT_SECRET=[dev-jwt-secret-from-settings-api]
DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres

# Get DATABASE_URL from: Settings > Database > Connection string (URI)

# API Configuration
PORT=8000
GEMINI_API_KEY=[your-key]

# Debug
SQL_DEBUG=false
```

### 5. Configure Frontend Environment

Create `.env.local`:

```bash
# Environment
NODE_ENV=development

# Supabase Configuration (Development Branch)
VITE_SUPABASE_URL=https://[dev-branch-ref].supabase.co
VITE_SUPABASE_ANON_KEY=[dev-anon-key]

# Backend API
VITE_API_URL=http://localhost:8000

# Google Analytics
VITE_GA_MEASUREMENT_ID=
VITE_GA_DEBUG=true
VITE_GA_TEST_MODE=true

# Gemini API
VITE_GEMINI_API_KEY=[your-key]
```

### 6. Run Migrations

```bash
# Link to your Supabase project (one-time)
supabase link --project-ref [your-dev-branch-ref]

# Push migrations to Supabase
supabase db push

# This creates:
# - profiles table
# - user_data table
# - RLS policies
# - Triggers for auto-profile creation
```

### 7. Install Dependencies

```bash
# Backend
cd backend
uv sync

# Frontend (if needed)
cd ..
npm install
```

### 8. Start Development

```bash
# Use existing scripts
./scripts/dev.sh
```

## Code Changes Summary

### Backend Changes

1. **New Files:**
   - `backend/supabase_auth.py` - JWT validation
   - `backend/.env.example` - Environment template

2. **Updated Files:**
   - `backend/models.py` - Supabase-compatible models (Profile instead of User)
   - `backend/database.py` - PostgreSQL connection with pooling
   - `backend/pyproject.toml` - Added supabase and pyjwt packages
   - `backend/routers/user_data.py` - Uses Supabase auth
   - `backend/main.py` - Removed local auth router

3. **Removed:**
   - `backend/auth.py` - No longer needed (Supabase handles auth)
   - `backend/routers/auth.py` - No longer needed

### Frontend Changes

1. **Updated Files:**
   - `contexts/AuthContext.tsx` - Uses Supabase client
   - `services/dataService.ts` - Sends Supabase JWT to backend

2. **No Changes Needed:**
   - `config/supabase.ts` - Already configured
   - UI components - Work as-is

### Infrastructure as Code

1. **New Files:**
   - `supabase/config.toml` - Supabase configuration
   - `supabase/migrations/20260128000001_initial_schema.sql` - Database schema
   - `supabase/seed.sql` - Development seed data
   - `supabase/setup.sh` - Automated setup script

## Testing the Integration

### 1. Test User Registration

```bash
# Start the app
./scripts/dev.sh

# Open http://localhost:3000
# Click "Get Started"
# Register with email/password
```

### 2. Verify Backend

```bash
# Check backend logs
tail -f logs/backend-dev.log

# Should see JWT validation working
```

### 3. Verify Database

```bash
# Check Supabase Dashboard
# Go to Table Editor
# Should see:
# - profiles table with your user
# - user_data table (empty initially)
```

### 4. Test Data Persistence

```bash
# In the app:
# 1. Add family members
# 2. Set preferences
# 3. Generate a meal plan
# 4. Refresh the page
# 5. Data should persist
```

## Migration from Local Auth

The app will automatically work with Supabase auth. Users will need to:
1. Register again (old local accounts won't transfer)
2. Their data will be fresh in the new system

## Production Setup (Future)

When ready for production:

1. Use main Supabase project (not branch)
2. Create `.env.production` with prod credentials
3. Run migrations on production
4. Deploy backend with prod environment variables
5. Deploy frontend with prod Supabase URL

## Rollback Plan

If issues occur:
1. Dev branch is isolated - can delete without affecting anything
2. Local FastAPI auth code is still in git history
3. Can revert to previous commit
4. No production data at risk

## Key Benefits

✅ **Security**: Enterprise-grade with backend validation
✅ **Scalability**: Supabase handles auth complexity
✅ **IaC**: Everything in git, reproducible
✅ **Isolation**: Dev/prod completely separate
✅ **ORM**: SQLAlchemy still works
✅ **Flexibility**: Easy to add OAuth providers later

## Troubleshooting

### JWT Validation Fails
- Check `SUPABASE_JWT_SECRET` matches Supabase Dashboard > Settings > API > JWT Secret
- Ensure frontend is sending token in Authorization header

### Database Connection Fails
- Check `DATABASE_URL` format
- Verify password doesn't have special characters (URL encode if needed)
- Check Supabase Dashboard > Settings > Database for correct connection string

### Migrations Fail
- Ensure you're linked to correct project: `supabase link`
- Check migration syntax
- View errors in Supabase Dashboard > Database > Migrations

### User Not Created in Profiles
- Check database trigger exists: `handle_new_user`
- Verify trigger is enabled
- Check Supabase logs for errors

## Next Steps

1. Create development branch
2. Configure environment variables
3. Run migrations
4. Test authentication flow
5. Verify data persistence
6. Document any issues
7. Plan production deployment
