# Deployment Guide - QA/Production Strategy

This guide explains the two-tier deployment strategy with separate Supabase projects for complete isolation.

## Deployment Strategy

**QA Environment**: Auto-deploys on every push to `master` → Test with isolated QA database
**Production Environment**: Manual deploy only → After QA validation → Controlled releases

This ensures all changes are tested in isolation before reaching production users.

## Environment Overview

| Environment | Auto-Deploy | Supabase Project | URL Pattern |
|-------------|-------------|------------------|-------------|
| **Local** | N/A | Local Docker | localhost:3000 |
| **QA** | ✅ Yes | Meal Planner QA | *-qa.onrender.com |
| **Production** | ❌ Manual | Meal Planner | Custom domain |

## Initial Setup

### 1. Connect to Render

1. Go to Render Dashboard → "New +" → "Blueprint"
2. Connect your GitHub repository
3. Render creates **4 services** from `render.yaml`:
   - `meal-planner-api-qa`
   - `meal-planner-frontend-qa`
   - `meal-planner-api-v2` (existing production backend)
   - `meal-planner-frontend-v2` (existing production frontend)

### 2. Configure QA Environment Variables

**IMPORTANT**: See `QA_SETUP_CREDENTIALS.md` for the actual credential values (not committed to git).

**QA Backend** (meal-planner-api-qa):
```
SUPABASE_URL=https://kzesxycoqofzlzifynql.supabase.co
DATABASE_URL=postgresql://postgres.kzesxycoqofzlzifynql:[PASSWORD]@aws-1-us-east-2.pooler.supabase.com:6543/postgres
GEMINI_API_KEY=[YOUR-KEY]
```

**QA Frontend** (meal-planner-frontend-qa):
```
VITE_SUPABASE_URL=https://kzesxycoqofzlzifynql.supabase.co
VITE_SUPABASE_ANON_KEY=[QA-ANON-KEY]
VITE_API_URL=https://meal-planner-api-qa.onrender.com
```

### 3. Production Environment

Production environment variables are already configured in Render dashboard.
No changes needed unless updating credentials.

## Daily Workflow

### 1. Push to Master (Auto-deploys to QA)

```bash
git push origin master
```

**What happens:**
- ✅ QA backend rebuilds automatically
- ✅ QA frontend rebuilds automatically
- ✅ Uses QA Supabase database
- ❌ Production unchanged

### 2. Test in QA

Visit: `https://meal-planner-frontend-qa.onrender.com`

- Test authentication (creates users in QA database)
- Test core features
- Check browser console for errors
- Monitor QA logs
- Verify data in QA Supabase Table Editor

### 3. Promote to Production (Manual)

After thorough QA validation:

1. **Render Dashboard** → `meal-planner-api-v2`
2. Click **"Manual Deploy"** → **"Deploy latest commit"**
3. Wait for completion
4. **Render Dashboard** → `meal-planner-frontend-v2`
5. Click **"Manual Deploy"** → **"Deploy latest commit"**
6. Verify production works
7. Check production logs

## Environment Differences

### QA
- Auto-deploy: **Yes**
- Debug logging: **Enabled**
- GA debug: **Enabled**
- Supabase: **Separate QA project**
- Database: **QA data only**
- Purpose: **Testing and validation**

### Production
- Auto-deploy: **No (manual only)**
- Debug logging: **Disabled**
- GA debug: **Disabled**
- Supabase: **Production project**
- Database: **Live user data**
- Purpose: **Live users**

## Database Management

### QA Database
- Completely separate from production
- Can be reset/wiped without affecting production
- Schema applied via: `supabase db push`
- Safe for testing destructive operations

### Production Database
- Contains live user data
- Never modified by QA testing
- Migrations applied manually after QA validation
- Always backed up

## Rollback

If production deployment has issues:

1. Render Dashboard → Service → Deploys
2. Find last known good deploy
3. Click "Rollback to this version"
4. Verify rollback successful
5. Investigate issue in QA

## Best Practices

1. ✅ Always test in QA first
2. ✅ Let QA run for hours/days before promoting
3. ✅ Monitor QA logs after each push
4. ✅ Test authentication thoroughly in QA
5. ✅ Verify QA database has expected data
6. ✅ Document what's deployed where
7. ✅ Have a rollback plan ready
8. ✅ Coordinate production deploys with team

## Troubleshooting

### QA Not Deploying
- Check Render dashboard for build errors
- Verify `autoDeploy: true` in render.yaml
- Check GitHub webhook connection

### QA Authentication Failing
- Verify VITE_SUPABASE_URL is set correctly
- Verify VITE_SUPABASE_ANON_KEY is set correctly
- Check QA Supabase dashboard for auth logs

### QA Database Connection Issues
- Verify DATABASE_URL has correct password
- Check Supabase project is active
- Verify pooler connection string format

## Summary

**Safe**: Production never auto-deploys, separate databases ensure complete isolation
**Fast**: QA updates immediately for rapid iteration
**Controlled**: Manual promotion to production after thorough validation
**Isolated**: QA and production use completely separate Supabase projects
