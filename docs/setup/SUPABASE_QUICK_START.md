# Supabase Quick Start Guide

## 🚀 Complete IaC Setup - 5 Steps

### Step 1: Create Development Branch
```bash
./supabase/setup.sh
# Select option 1
# Confirm when prompted
```

### Step 2: Get Credentials
```bash
# List branches
supabase --experimental branches list

# Note the develop branch project ID
# Go to Supabase Dashboard > Switch to develop branch
# Settings > API > Copy all credentials
```

### Step 3: Configure Backend
```bash
# Copy template
cp backend/.env.example backend/.env.development

# Edit backend/.env.development with your credentials:
# - SUPABASE_URL
# - SUPABASE_JWT_SECRET
# - DATABASE_URL
# - GEMINI_API_KEY
```

### Step 4: Configure Frontend
```bash
# Copy template
cp .env.example .env.local

# Edit .env.local with your credentials:
# - VITE_SUPABASE_URL
# - VITE_SUPABASE_ANON_KEY
# - VITE_GEMINI_API_KEY
```

### Step 5: Run Migrations & Start
```bash
# Link to Supabase
supabase link --project-ref [your-dev-branch-ref]

# Push migrations
supabase db push

# Install backend dependencies
cd backend && uv sync && cd ..

# Start the app
./scripts/dev.sh
```

## ✅ What You Get

- **Isolated Dev Environment**: Separate from production
- **Supabase Auth**: Email/password (OAuth ready)
- **Secure Backend**: JWT validation on every request
- **SQLAlchemy ORM**: Works seamlessly with Supabase
- **Infrastructure as Code**: Everything in git
- **Auto-scaling**: Supabase handles it

## 📚 Full Documentation

See `IMPLEMENTATION FILES/07-supabase-integration-complete.md` for:
- Detailed architecture
- Security model
- Troubleshooting
- Production setup
- Migration guide

## 🔒 Security Model

```
Frontend → Supabase Auth (get JWT)
Frontend → FastAPI (send JWT)
FastAPI → Validate JWT
FastAPI → Supabase DB (via ORM)
```

**Result**: Enterprise-grade security with no direct DB access from frontend.

## 🎯 Key Files

- `supabase/config.toml` - Configuration as code
- `supabase/migrations/` - Database schema
- `backend/supabase_auth.py` - JWT validation
- `frontend/contexts/AuthContext.tsx` - Frontend auth
- `backend/models.py` - ORM models

## 💡 Tips

- Dev branch costs ~$0.01344/hour
- Can delete and recreate anytime
- Production uses main project (separate)
- All changes are in git (IaC)

## 🆘 Need Help?

Check the troubleshooting section in the full documentation.
