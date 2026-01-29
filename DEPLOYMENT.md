# Deployment Guide - QA/Production Strategy

This guide explains the two-tier deployment strategy for the Family Meal Planner.

## Deployment Strategy

**QA Environment**: Auto-deploys on every push to `main` → Test and validate
**Production Environment**: Manual deploy only → After QA validation → Controlled releases

This ensures all changes are tested before reaching production users.

## Environment Overview

| Environment | Auto-Deploy | Purpose | URL Pattern |
|-------------|-------------|---------|-------------|
| **Local** | N/A | Development | localhost:3000 |
| **QA** | ✅ Yes | Testing | *-qa.onrender.com |
| **Production** | ❌ Manual | Live users | *-prod.onrender.com |

## Initial Setup

### 1. Connect to Render

1. Go to Render Dashboard → "New +" → "Blueprint"
2. Connect your GitHub repository
3. Render creates **4 services** from `render.yaml`:
   - `meal-planner-api-qa`
   - `meal-planner-frontend-qa`
   - `meal-planner-api-prod`
   - `meal-planner-frontend-prod`

### 2. Configure QA Environment

**QA Backend** (meal-planner-api-qa):
- `DATABASE_URL`: Supabase connection string (can share with prod or use separate)
- `GEMINI_API_KEY`: Your API key
- `VITE_API_URL`: `https://meal-planner-api-qa.onrender.com`

**QA Frontend** (meal-planner-frontend-qa):
- `VITE_API_URL`: `https://meal-planner-api-qa.onrender.com`

### 3. Configure Production Environment

**Production Backend** (meal-planner-api-prod):
- `DATABASE_URL`: Production Supabase connection string
- `GEMINI_API_KEY`: Production API key
- `VITE_API_URL`: `https://meal-planner-api-prod.onrender.com`

**Production Frontend** (meal-planner-frontend-prod):
- `VITE_API_URL`: `https://meal-planner-api-prod.onrender.com`

## Daily Workflow

### 1. Push to Main (Auto-deploys to QA)

```bash
git push origin main
```

**What happens:**
- ✅ QA backend rebuilds automatically
- ✅ QA frontend rebuilds automatically
- ❌ Production unchanged

### 2. Test in QA

Visit: `https://meal-planner-frontend-qa.onrender.com`

- Test authentication
- Test core features
- Check browser console for errors
- Monitor QA logs

### 3. Promote to Production (Manual)

After QA validation:

1. **Render Dashboard** → `meal-planner-api-prod`
2. Click **"Manual Deploy"** → **"Deploy latest commit"**
3. Wait for completion
4. **Render Dashboard** → `meal-planner-frontend-prod`
5. Click **"Manual Deploy"** → **"Deploy latest commit"**
6. Verify production works

## Environment Differences

### QA
- Auto-deploy: **Yes**
- Debug logging: **Enabled**
- GA debug: **Enabled**
- Purpose: **Testing**

### Production
- Auto-deploy: **No (manual only)**
- Debug logging: **Disabled**
- GA debug: **Disabled**
- Purpose: **Live users**

## Rollback

If production has issues:

1. Render Dashboard → Service → Deploys
2. Find last good deploy
3. Click "Rollback to this version"

## Best Practices

1. ✅ Always test in QA first
2. ✅ Let QA run for a while before promoting
3. ✅ Monitor QA logs after each push
4. ✅ Use separate API keys for QA and production
5. ✅ Document what's deployed where
6. ✅ Have a rollback plan ready

## Summary

**Safe**: Production never auto-deploys
**Fast**: QA updates immediately for rapid iteration
**Controlled**: Manual promotion to production after validation
