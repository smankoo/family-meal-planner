# QA/Production Deployment Strategy - Implementation Complete ✅

**Date:** January 28, 2026
**Status:** Configured - Two-tier deployment with QA auto-deploy and manual production

## Overview

Implemented a two-tier deployment strategy with separate Supabase projects for QA and Production to ensure complete isolation and safe testing.

## Deployment Tiers

### 1. QA Environment (Auto-Deploy)
- **Trigger**: Every push to `master` branch
- **Purpose**: Testing and validation
- **Services**:
  - `meal-planner-api-qa` (Backend)
  - `meal-planner-frontend-qa` (Frontend)
- **Supabase**: Separate QA project (`kzesxycoqofzlzifynql`)
- **Configuration**: `autoDeploy: true` in render.yaml

### 2. Production Environment (Manual Deploy)
- **Trigger**: Manual deployment via Render dashboard
- **Purpose**: Live users
- **Services**:
  - `meal-planner-api-v2` (Backend)
  - `meal-planner-frontend-v2` (Frontend)
- **Supabase**: Production project (`yirgkzecscyuxisolatu`)
- **Configuration**: `autoDeploy: false` in render.yaml

## Supabase Configuration

### QA Supabase Project
- **Project Name**: Meal Planner QA
- **Project Ref**: `kzesxycoqofzlzifynql`
- **Project URL**: `https://kzesxycoqofzlzifynql.supabase.co`
- **Database**: Transaction pooler at `aws-1-us-east-2.pooler.supabase.com:6543`
- **Schema**: Applied via `supabase db push`

### Production Supabase Project
- **Project Name**: Meal Planner
- **Project Ref**: `yirgkzecscyuxisolatu`
- **Project URL**: `https://yirgkzecscyuxisolatu.supabase.co`
- **Database**: Transaction pooler (already configured)

### Benefits of Separate Supabase Projects
- ✅ Complete data isolation between QA and production
- ✅ Safe testing without risk to production data
- ✅ Independent schema changes and migrations
- ✅ Separate user authentication databases
- ✅ Can reset QA database without affecting production

## Implementation Details

### render.yaml Structure

All secrets (Supabase URLs, anon keys, database URLs) are marked with `sync: false` and must be set manually in the Render dashboard to avoid committing sensitive credentials.

```yaml
services:
  # QA Environment (Auto-deploy)
  - name: meal-planner-api-qa
    autoDeploy: true
    branch: master
    envVars:
      - key: ENVIRONMENT
        value: qa
      - key: SUPABASE_URL
        sync: false  # Set to QA Supabase URL in dashboard
      - key: DATABASE_URL
        sync: false  # Set to QA pooler connection in dashboard
      - key: SQL_DEBUG
        value: true

  - name: meal-planner-frontend-qa
    autoDeploy: true
    branch: master
    envVars:
      - key: VITE_ENVIRONMENT
        value: qa
      - key: VITE_SUPABASE_URL
        sync: false  # Set to QA Supabase URL in dashboard
      - key: VITE_SUPABASE_ANON_KEY
        sync: false  # Set to QA anon key in dashboard
      - key: VITE_GA_DEBUG
        value: true

  # Production Environment (Manual deploy)
  - name: meal-planner-api-v2
    autoDeploy: false  # MANUAL ONLY
    branch: master
    envVars:
      - key: ENVIRONMENT
        value: production
      - key: SUPABASE_URL
        sync: false  # Already set in dashboard
      - key: DATABASE_URL
        sync: false  # Already set in dashboard
      - key: SQL_DEBUG
        value: false

  - name: meal-planner-frontend-v2
    autoDeploy: false  # MANUAL ONLY
    branch: master
    envVars:
      - key: VITE_ENVIRONMENT
        value: production
      - key: VITE_SUPABASE_URL
        sync: false  # Already set in dashboard
      - key: VITE_SUPABASE_ANON_KEY
        sync: false  # Already set in dashboard
      - key: VITE_GA_DEBUG
        value: false
```

## Setting Up QA Environment in Render

After pushing this configuration, you'll need to set the following environment variables in the Render dashboard for the QA services:

### QA Backend (`meal-planner-api-qa`)
1. `SUPABASE_URL`: `https://kzesxycoqofzlzifynql.supabase.co`
2. `DATABASE_URL`: `postgresql://postgres.kzesxycoqofzlzifynql:[PASSWORD]@aws-1-us-east-2.pooler.supabase.com:6543/postgres`
3. `GEMINI_API_KEY`: (copy from production or use same key)

### QA Frontend (`meal-planner-frontend-qa`)
1. `VITE_SUPABASE_URL`: `https://kzesxycoqofzlzifynql.supabase.co`
2. `VITE_SUPABASE_ANON_KEY`: (get from QA Supabase dashboard → Settings → API Keys → Legacy)
3. `VITE_API_URL`: (will be set to QA backend URL after it's deployed)

## Workflow

### Development → QA (Automatic)

```bash
# 1. Make changes locally
git add .
git commit -m "feat: new feature"

# 2. Push to master
git push origin master

# 3. Render automatically deploys to QA
# - meal-planner-api-qa rebuilds
# - meal-planner-frontend-qa rebuilds
# - Production unchanged
```

### QA → Production (Manual)

```
1. Test in QA environment thoroughly
2. Verify everything works correctly
3. Go to Render Dashboard
4. Deploy meal-planner-api-v2 manually
5. Deploy meal-planner-frontend-v2 manually
6. Verify production deployment
```

## Environment Configuration

### QA Environment

**Purpose**: Testing and validation with isolated data

**Settings**:
- Auto-deploy: ✅ Enabled
- Debug logging: ✅ Enabled
- GA debug: ✅ Enabled
- GA test mode: ✅ Enabled
- Supabase: Separate QA project
- Database: QA Supabase (transaction pooler)

**URLs**:
- Frontend: `https://meal-planner-frontend-qa.onrender.com`
- Backend: `https://meal-planner-api-qa.onrender.com`
- API Docs: `https://meal-planner-api-qa.onrender.com/docs`

### Production Environment

**Purpose**: Live users with production data

**Settings**:
- Auto-deploy: ❌ Disabled (manual only)
- Debug logging: ❌ Disabled
- GA debug: ❌ Disabled
- GA test mode: ❌ Disabled (live tracking)
- Supabase: Production project
- Database: Production Supabase (transaction pooler)

**URLs**:
- Frontend: Custom domain via Route53 CNAME
- Backend: `https://meal-planner-api-v2.onrender.com`
- API Docs: `https://meal-planner-api-v2.onrender.com/docs`

## Benefits

### Safety
- ✅ Production never auto-deploys
- ✅ All changes tested in QA first
- ✅ Manual gate before production
- ✅ Easy rollback if issues occur

### Speed
- ✅ QA updates immediately on push
- ✅ Rapid iteration and testing
- ✅ No waiting for manual approvals in QA

### Control
- ✅ Deliberate production deployments
- ✅ Time to validate in QA
- ✅ Coordinate with team/users
- ✅ Deploy during low-traffic periods

## Testing Checklist

Before promoting QA to production:

- [ ] Authentication works correctly
- [ ] Core features tested and working
- [ ] No errors in QA logs
- [ ] No console errors in browser
- [ ] Performance is acceptable
- [ ] Database migrations applied successfully
- [ ] Analytics tracking works
- [ ] Mobile and desktop tested

## Rollback Strategy

If production deployment has issues:

1. **Immediate**: Rollback via Render dashboard
   - Go to Service → Deploys
   - Find last known good deploy
   - Click "Rollback to this version"

2. **Alternative**: Redeploy previous commit
   - Find last good commit in git history
   - Manually deploy that commit in Render

3. **Emergency**: Disable service temporarily
   - Suspend service in Render
   - Fix issue locally
   - Deploy fix to QA
   - Test thoroughly
   - Deploy to production

## Monitoring

### QA Monitoring
- Check logs after each auto-deployment
- Test new features immediately
- Monitor for errors or warnings
- Verify environment variables

### Production Monitoring
- Set up alerts for errors
- Monitor performance metrics
- Track user analytics
- Review logs regularly
- Watch for unusual patterns

## Cost Considerations

### Free Tier Strategy
- **QA**: Free tier (spins down after 15 min)
- **Production**: Paid tier (always-on)

### Paid Tier Strategy
- **QA**: Starter plan ($7/month per service)
- **Production**: Standard or higher

## Environment Variables

### Secrets (Set in Render Dashboard)

**QA Backend**:
- `SUPABASE_URL`: QA Supabase project URL
- `DATABASE_URL`: QA Supabase pooler connection
- `GEMINI_API_KEY`: API key (can share with prod or use separate)

**QA Frontend**:
- `VITE_SUPABASE_URL`: QA Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: QA Supabase anon key
- `VITE_API_URL`: QA backend URL

**Production Backend**:
- `SUPABASE_URL`: Production Supabase URL (already set)
- `DATABASE_URL`: Production database (already set)
- `GEMINI_API_KEY`: Production API key (already set)

**Production Frontend**:
- `VITE_SUPABASE_URL`: Production Supabase URL (already set)
- `VITE_SUPABASE_ANON_KEY`: Production anon key (already set)
- `VITE_API_URL`: Production backend URL (already set)

### Auto-Configured (via render.yaml)

All other environment variables are set automatically in render.yaml:
- Environment names (qa/production)
- Debug flags
- Analytics settings

## Troubleshooting

### QA Not Auto-Deploying

**Check**:
1. Render Dashboard → Service → Settings
2. Verify "Auto-Deploy" is enabled
3. Verify "Branch" is set to "main"
4. Check GitHub webhook connection

### Production Accidentally Deployed

**Fix**:
1. Verify `autoDeploy: false` in render.yaml
2. Rollback to previous version
3. Re-apply render.yaml if needed

### Different Behavior QA vs Production

**Debug**:
1. Compare environment variables
2. Check database connections
3. Verify API URLs
4. Check CORS settings
5. Review logs for differences

## Best Practices

1. **Test Thoroughly in QA**
   - Don't rush to production
   - Let QA run for hours or days
   - Test all critical paths

2. **Monitor QA Logs**
   - Check after each deployment
   - Look for warnings and errors
   - Verify expected behavior

3. **Coordinate Production Deploys**
   - Communicate with team
   - Deploy during low-traffic times
   - Have someone available to monitor

4. **Document Changes**
   - Keep track of what's in QA
   - Note what's been promoted to production
   - Document any issues found

5. **Have Rollback Ready**
   - Know how to rollback quickly
   - Test rollback process
   - Keep previous version info handy

## Summary

✅ **QA**: Auto-deploys on push → Immediate testing → Rapid iteration
✅ **Production**: Manual deploy only → After QA validation → Controlled releases
✅ **Safe**: Production protected from automatic deployments
✅ **Fast**: QA updates immediately for quick feedback
✅ **Controlled**: Deliberate production releases with validation gate

The two-tier strategy provides the perfect balance between development speed and production safety.
