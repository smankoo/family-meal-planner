# Supabase Production Setup - Complete

## Status: ✅ Ready for Credentials

The Supabase infrastructure is fully configured and the migration has been successfully applied to production. You just need to add two credentials from the dashboard to complete the setup.

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
- `backend/supabase_auth.py` - JWT validation middleware
- `backend/models.py` - SQLAlchemy models for Supabase
- `backend/database.py` - Connection pooling configured
- `backend/routers/user_data.py` - Protected endpoints with JWT validation
- Dependencies added to `backend/pyproject.toml`

## What You Need to Do

### Step 1: Get JWT Secret

1. Visit: https://supabase.com/dashboard/project/yirgkzecscyuxisolatu/settings/api
2. Scroll to "Project API keys" section
3. Find "JWT Secret" (it's a long string)
4. Copy it

### Step 2: Get Database Connection String

1. Visit: https://supabase.com/dashboard/project/yirgkzecscyuxisolatu/settings/database
2. Click on "Connection string" tab
3. Select "Connection pooling" sub-tab
4. Set Mode to "Transaction"
5. Copy the connection string (format: `postgresql://postgres.[project-ref]:[password]@...`)

### Step 3: Update backend/.env

Open `backend/.env` and replace the placeholder values:

```bash
# Replace this line:
SUPABASE_JWT_SECRET=<GET_FROM_DASHBOARD_SETTINGS_API_JWT_SECRET>
# With the actual JWT secret from Step 1

# Replace this line:
DATABASE_URL=<GET_FROM_DASHBOARD_SETTINGS_DATABASE_CONNECTION_POOLING>
# With the actual connection string from Step 2
```

### Step 4: Start the App

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
