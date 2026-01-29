# Deployment Guide - Render

This guide explains how to deploy the Family Meal Planner to Render.

## Prerequisites

- Render account (free tier works)
- GitHub repository connected to Render
- Supabase production project set up

## Automatic Configuration

Most environment variables are automatically configured via `render.yaml`. However, **secrets must be set manually** in the Render dashboard for security.

## Manual Setup Required

### Backend Service (meal-planner-api)

Go to Render Dashboard → meal-planner-api → Environment and add:

1. **DATABASE_URL** (Secret - Required)
   ```
   postgresql://postgres.yirgkzecscyuxisolatu:[PASSWORD]@aws-0-us-west-2.pooler.supabase.com:6543/postgres
   ```
   Get this from: Supabase Dashboard → Project Settings → Database → Connection Pooling (Transaction mode)

2. **GEMINI_API_KEY** (Secret - Required)
   ```
   Your Gemini API key
   ```
   Get this from: Google AI Studio

### Frontend Service (meal-planner-frontend)

Go to Render Dashboard → meal-planner-frontend → Environment and add:

1. **VITE_API_URL** (Required)
   ```
   https://meal-planner-api.onrender.com
   ```
   Or your actual backend URL if different

## Automatic Configuration (via render.yaml)

These are set automatically and don't need manual configuration:

### Backend
- ✅ `ENVIRONMENT=production`
- ✅ `SUPABASE_URL=https://yirgkzecscyuxisolatu.supabase.co`
- ✅ `SQL_DEBUG=false`

### Frontend
- ✅ `VITE_ENVIRONMENT=production`
- ✅ `VITE_SUPABASE_URL=https://yirgkzecscyuxisolatu.supabase.co`
- ✅ `VITE_SUPABASE_ANON_KEY=eyJhbGci...` (public key, safe to commit)
- ✅ `VITE_GA_MEASUREMENT_ID=G-X5HX141WYD`
- ✅ `VITE_GA_DEBUG=false`
- ✅ `VITE_GA_TEST_MODE=false`

## Deployment Steps

### First Time Deployment

1. **Connect Repository to Render**
   - Go to Render Dashboard
   - Click "New +" → "Blueprint"
   - Connect your GitHub repository
   - Render will detect `render.yaml` automatically

2. **Set Secret Environment Variables**
   - Follow the "Manual Setup Required" section above
   - Set `DATABASE_URL` for backend
   - Set `GEMINI_API_KEY` for backend
   - Set `VITE_API_URL` for frontend

3. **Deploy**
   - Click "Apply" in Render
   - Services will build and deploy automatically

### Subsequent Deployments

Just push to your main branch:

```bash
git push origin main
```

Render automatically:
- Detects the push
- Builds both services
- Deploys with production configuration

## Verification

### Check Backend

Visit: `https://meal-planner-api.onrender.com/docs`

Should show FastAPI documentation.

### Check Frontend

Visit: `https://meal-planner-frontend.onrender.com`

Should show the app. Check browser console:

```javascript
console.log(import.meta.env.VITE_ENVIRONMENT);  // Should be "production"
console.log(import.meta.env.VITE_SUPABASE_URL); // Should be production URL
```

### Test Authentication

1. Sign up with a test account
2. Check Supabase Dashboard → Authentication → Users
3. Verify the user appears in production database

## Security Notes

### What's Safe to Commit

✅ **Safe** (in render.yaml):
- Supabase URL (public)
- Supabase anon key (public, meant for client-side)
- Google Analytics ID (public)
- Environment names
- Port numbers

❌ **Never Commit** (set in Render dashboard):
- Database URLs with passwords
- API keys (Gemini, etc.)
- Service keys
- JWT secrets

### Why Anon Key is Safe

The Supabase anon key is designed to be public:
- It's used client-side in the browser
- Row Level Security (RLS) policies protect data
- JWT verification happens server-side
- Users can only access their own data

## Troubleshooting

### Build Fails

**Problem**: Backend build fails with "uv: command not found"

**Solution**: Render should auto-detect Python. If not, add to render.yaml:
```yaml
buildCommand: "pip install uv && cd backend && uv sync"
```

### Frontend Shows Dev URLs

**Problem**: Built app still uses localhost

**Solution**: Check environment variables in Render dashboard match production values.

### Database Connection Fails

**Problem**: Backend can't connect to database

**Solution**:
1. Verify `DATABASE_URL` is set in Render dashboard
2. Use connection pooling URL (port 6543, not 5432)
3. Use transaction mode, not session mode

### CORS Errors

**Problem**: Frontend can't call backend API

**Solution**: Update backend CORS settings in `main.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://meal-planner-frontend.onrender.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Monitoring

### Logs

View logs in Render Dashboard:
- Backend: meal-planner-api → Logs
- Frontend: meal-planner-frontend → Logs

### Health Checks

Render automatically monitors:
- Backend: HTTP health check on `/`
- Frontend: Static site availability

## Costs

### Free Tier Limits

- Backend: Spins down after 15 minutes of inactivity
- Frontend: Always available (static site)
- Database: Supabase free tier (500MB)

### Upgrade Considerations

Consider upgrading if:
- Backend needs to stay always-on
- Need faster build times
- Require more resources

## Rollback

If deployment fails:

1. Go to Render Dashboard → Service → Deploys
2. Find last successful deploy
3. Click "Rollback to this version"

## Environment Variables Reference

### Backend (Set in Render Dashboard)

| Variable | Required | Secret | Example |
|----------|----------|--------|---------|
| `DATABASE_URL` | Yes | Yes | `postgresql://postgres.xxx:***@aws-0-us-west-2.pooler.supabase.com:6543/postgres` |
| `GEMINI_API_KEY` | Yes | Yes | `AIzaSy...` |
| `ENVIRONMENT` | Auto | No | `production` |
| `SUPABASE_URL` | Auto | No | `https://yirgkzecscyuxisolatu.supabase.co` |

### Frontend (Set in Render Dashboard)

| Variable | Required | Secret | Example |
|----------|----------|--------|---------|
| `VITE_API_URL` | Yes | No | `https://meal-planner-api.onrender.com` |
| `VITE_ENVIRONMENT` | Auto | No | `production` |
| `VITE_SUPABASE_URL` | Auto | No | `https://yirgkzecscyuxisolatu.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Auto | No | `eyJhbGci...` |

## Support

For issues:
1. Check Render logs
2. Check Supabase logs
3. Verify environment variables
4. Test locally first with production config

## Next Steps

After successful deployment:
1. Set up custom domain (optional)
2. Configure SSL (automatic with Render)
3. Set up monitoring/alerts
4. Configure backup strategy
