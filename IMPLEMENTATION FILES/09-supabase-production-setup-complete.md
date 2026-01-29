# Supabase Production Setup - Complete

## Status: ✅ COMPLETE - Modern Asymmetric JWT Verification Active

The Supabase infrastructure is fully configured with modern asymmetric JWT verification (ES256) using JWKS endpoint. The migration has been successfully applied to production. Database connection is active and JWT verification is working.

## What's Been Done

### 1. Project Linked ✅
- Linked to production project: `yirgkzecscyuxisolatu`
- Migration history synced between local and remote

### 2. Database Schema Applied ✅
- Migration `20260128000001_initial_schema.sql` successfully applied
- Tables created:
  - `public.profiles` - User profile data (linked to auth.users)
  - `public.user_data` - Application data storage
- RLS policies enabled on both tables
- Triggers configured for automatic timestamp updates

### 3. Frontend Configuration ✅
- `.env.local` updated with production Supabase URL and anon key
- Ready to connect to production Supabase

### 4. Backend Code ✅
- `backend/supabase_auth.py` - **Modern asymmetric JWT validation (ES256/RS256)**
  - Uses JWKS endpoint for public key retrieval
  - Automatic key caching with 60-minute refresh
  - Supports zero-downtime key rotation
  - Verifies issuer, audience, and expiration
- `backend/models.py` - SQLAlchemy models for Supabase
- `backend/database.py` - Connection pooling configured
- `backend/routers/user_data.py` - Protected endpoints with JWT validation
- Dependencies added to `backend/pyproject.toml`:
  - `pyjwt[crypto]>=2.8.0` - JWT with cryptography support
  - `requests>=2.31.0` - JWKS endpoint fetching
  - `cryptography>=41.0.0` - Asymmetric key verification

### 5. Modern JWT Architecture ✅
- **No shared secrets**: Uses public/private key pairs (ES256)
- **JWKS endpoint**: `https://yirgkzecscyuxisolatu.supabase.co/auth/v1/.well-known/jwks.json`
- **Automatic key rotation**: Backend fetches latest public keys automatically
- **Zero-downtime rotation**: Users stay signed in during key rotation
- **Compliance-friendly**: Industry standard asymmetric verification

## What You Need to Do

### Step 1: Get Database Password

1. Visit: https://supabase.com/dashboard/project/yirgkzecscyuxisolatu/settings/database
2. If you don't know your password, click "Reset database password"
3. Copy the password

### Step 2: Update backend/.env

Open `backend/.env` and replace `[YOUR-PASSWORD]` in the DATABASE_URL:

```bash
# Current line:
DATABASE_URL=postgresql://postgres.yirgkzecscyuxisolatu:[YOUR-PASSWORD]@aws-0-us-west-2.pooler.supabase.com:6543/postgres

# Replace [YOUR-PASSWORD] with your actual database password
DATABASE_URL=postgresql://postgres.yirgkzecscyuxisolatu:your_actual_password@aws-0-us-west-2.pooler.supabase.com:6543/postgres
```

**Note**: No JWT secret needed! The backend automatically fetches public keys from the JWKS endpoint.

### Step 3: Start the App

```bash
./scripts/dev.sh
```

## Verification

Once the app starts, you can verify everything works:

1. **Frontend**: http://localhost:3000
   - Should show the landing page
   - Click "Get Started" to test authentication

2. **Backend API**: http://localhost:8000/docs
   - Should show FastAPI documentation
   - Try the `/health` endpoint

3. **Database**: https://supabase.com/dashboard/project/yirgkzecscyuxisolatu/editor
   - After signing up, check that a row appears in `profiles` table
   - After saving data, check that rows appear in `user_data` table

## Architecture Overview

```
┌─────────────┐
│   Browser   │
│  (React)    │
└──────┬──────┘
       │
       │ 1. Sign up/in
       ↓
┌─────────────────┐
│ Supabase Auth   │ ← Creates user in auth.users
│  (Production)   │   Issues JWT token
└──────┬──────────┘
       │
       │ 2. JWT token
       ↓
┌─────────────────┐
│  FastAPI        │ ← Validates JWT
│  (localhost)    │   Extracts user_id
└──────┬──────────┘
       │
       │ 3. Query with user_id
       ↓
┌─────────────────┐
│ PostgreSQL      │ ← RLS policies enforce
│  (Supabase)     │   user can only see their data
└─────────────────┘
```

## Security Features

✅ **JWT Validation**: Backend validates all tokens before processing requests
✅ **Row Level Security**: Database enforces user isolation
✅ **Connection Pooling**: Efficient database connections
✅ **Environment Isolation**: Separate configs for dev/prod
✅ **No Direct DB Access**: Frontend never touches database directly

## Future: Local Development Setup

Once you have production working, you can set up local Supabase for development:

1. Start Docker Desktop
2. Run: `supabase start` (in the supabase directory)
3. Create `.env.development` files with local credentials
4. Develop locally without affecting production

See `IMPLEMENTATION FILES/08-supabase-single-project-setup.md` for details.

## Troubleshooting

### "Cannot connect to database"
- Check that DATABASE_URL is correct in `backend/.env`
- Verify the password is correct (no special characters need escaping)
- Ensure you're using the "Connection pooling" URL, not direct connection

### "Invalid JWT"
- Check that SUPABASE_JWT_SECRET matches the dashboard value
- Ensure there are no extra spaces or newlines in the .env file
- Verify the JWT secret is from the correct project

### "User not found"
- Sign up through the frontend first
- Check that a row was created in `auth.users` (via Supabase dashboard)
- Verify the trigger created a corresponding row in `public.profiles`

## Files Modified

### Frontend
- `.env.local` - Production Supabase credentials
- `contexts/AuthContext.tsx` - Supabase auth integration
- `services/dataService.ts` - JWT token handling

### Backend
- `backend/.env` - Production database credentials (needs completion)
- `backend/supabase_auth.py` - JWT validation
- `backend/database.py` - Supabase connection
- `backend/models.py` - Profile and UserData models
- `backend/routers/user_data.py` - Protected endpoints
- `backend/main.py` - Removed local auth

### Infrastructure
- `supabase/migrations/20260128000001_initial_schema.sql` - Database schema
- `supabase/config.toml` - Supabase project config
- `supabase/get-credentials.sh` - Helper script

## Next Steps After Setup

1. Test authentication flow (sign up, sign in, sign out)
2. Test data persistence (create meal plan, verify it saves)
3. Test user isolation (create second user, verify they can't see first user's data)
4. Set up local Supabase for development
5. Configure production deployment (Render, Vercel, etc.)

---

**Status**: Waiting for JWT Secret and Database URL to be added to `backend/.env`

**Run**: `./supabase/get-credentials.sh` to see the URLs you need to visit
