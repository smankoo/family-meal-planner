# Supabase Branching Setup for Dev/Prod Isolation

## Overview
This document outlines the safe setup of Supabase branching to maintain complete isolation between development and production environments.

## Architecture

### Environment Isolation
- **Production**: Main Supabase project (existing)
- **Development**: Persistent Supabase branch (to be created)
- **Data**: Completely separate - no shared users or data
- **Code**: Separate deployments via environment variables

### Security Model
1. Frontend authenticates with Supabase (dev or prod)
2. Frontend gets Supabase JWT token
3. Frontend sends JWT to FastAPI backend
4. Backend validates Supabase JWT
5. Backend uses Supabase service role for database operations

## Step-by-Step Setup (MANUAL - DO NOT AUTOMATE)

### Step 1: Create Development Branch
```bash
# This creates a persistent development branch
# Run this command manually to review costs
supabase --experimental branches create --persistent

# When prompted, name it "develop"
# Note the branch project ID from the output
```

### Step 2: Get Branch Credentials
```bash
# List all branches to get the dev branch project ID
supabase --experimental branches list

# The output will show:
# - BRANCH PROJECT ID (use this in .env.local)
# - Status
# - Created date
```

### Step 3: Get Branch API Keys
1. Go to Supabase Dashboard
2. Switch to the "develop" branch using the branch dropdown
3. Navigate to Settings > API
4. Copy the following for DEVELOPMENT:
   - Project URL
   - anon (public) key
   - service_role (secret) key

### Step 4: Configure Environment Files

Create `.env.local` for development:
```bash
# Environment
NODE_ENV=development

# Supabase Configuration (Development Branch)
VITE_SUPABASE_URL=https://[dev-branch-id].supabase.co
VITE_SUPABASE_ANON_KEY=[dev-branch-anon-key]

# Backend API
VITE_API_URL=http://localhost:8000

# Google Analytics
VITE_GA_MEASUREMENT_ID=
VITE_GA_DEBUG=true
VITE_GA_TEST_MODE=true

# Gemini API
VITE_GEMINI_API_KEY=[your-key]
```

Create `backend/.env.development` for backend dev:
```bash
# Supabase Configuration (Development Branch)
SUPABASE_URL=https://[dev-branch-id].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[dev-branch-service-role-key]
SUPABASE_JWT_SECRET=[dev-branch-jwt-secret]

# API Configuration
PORT=8000
GEMINI_API_KEY=[your-key]
```

Keep `.env.production` for production (DO NOT FILL YET):
```bash
# Environment
NODE_ENV=production

# Supabase Configuration (Production - Main Project)
VITE_SUPABASE_URL=[prod-url]
VITE_SUPABASE_ANON_KEY=[prod-anon-key]

# Backend API
VITE_API_URL=[prod-api-url]

# Google Analytics
VITE_GA_MEASUREMENT_ID=[prod-id]
VITE_GA_DEBUG=false
VITE_GA_TEST_MODE=false

# Gemini API
VITE_GEMINI_API_KEY=[prod-key]
```

### Step 5: Update .gitignore
Ensure sensitive files are not committed:
```
.env.local
.env.development
.env.production
backend/.env
backend/.env.development
backend/.env.production
```

## Code Changes Required

### 1. Backend: Add Supabase JWT Validation
- Install `supabase-py` package
- Create middleware to validate Supabase JWT tokens
- Replace local PostgreSQL with Supabase PostgreSQL connection
- Use service role key for database operations

### 2. Frontend: Use Supabase Auth
- Keep existing `@supabase/supabase-js` package
- Update `AuthContext` to use Supabase auth methods
- Send Supabase JWT to backend in all API calls
- Remove local auth modal (use Supabase's built-in UI or keep custom)

### 3. Data Service: Keep Backend API Calls
- No changes needed - still calls FastAPI
- Backend handles all database operations
- Frontend never directly accesses Supabase database

## Safety Checklist

Before touching production:
- [ ] Dev branch created and tested
- [ ] All code changes tested in dev environment
- [ ] Users can register/login in dev
- [ ] Data persists correctly in dev
- [ ] No errors in dev environment
- [ ] Environment variables clearly separated
- [ ] .gitignore updated to prevent credential leaks

## Migration Path

1. **Phase 1**: Set up dev branch (this document)
2. **Phase 2**: Implement Supabase auth in dev
3. **Phase 3**: Test thoroughly in dev
4. **Phase 4**: Document production setup
5. **Phase 5**: Apply to production (separate task)

## Rollback Plan

If anything goes wrong:
- Dev branch can be deleted without affecting production
- Local FastAPI auth still works as fallback
- No production data is at risk

## Notes

- Branches are completely isolated - changes in dev cannot affect prod
- Each branch has its own database, users, and data
- Merging a branch only applies migrations, not data
- Cost: ~$0.01344/hour for dev branch on Micro compute
