# Deployment View

## Infrastructure Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      Production Environment                      │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    Render.com Platform                     │ │
│  │                                                            │ │
│  │  ┌──────────────────────┐  ┌──────────────────────────┐  │ │
│  │  │  Static Site         │  │  Web Service             │  │ │
│  │  │  (Frontend)          │  │  (Backend API)           │  │ │
│  │  │                      │  │                          │  │ │
│  │  │  - React build       │  │  - FastAPI app           │  │ │
│  │  │  - Global CDN        │  │  - Python 3.11           │  │ │
│  │  │  - Auto SSL          │  │  - Auto-scaling          │  │ │
│  │  │                      │  │                          │  │ │
│  │  │  mealplan.mankoo.ca  │  │  api.mealplan.mankoo.ca  │  │ │
│  │  └──────────────────────┘  └──────────────────────────┘  │ │
│  │                                                            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    Supabase Platform                       │ │
│  │                                                            │ │
│  │  - PostgreSQL Database                                    │ │
│  │  - Authentication Service                                 │ │
│  │  - Connection Pooler                                      │ │
│  │  - Automatic Backups                                      │ │
│  │                                                            │ │
│  │  Project: yirgkzecscyuxisolatu                           │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         QA Environment                           │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    Render.com Platform                     │ │
│  │                                                            │ │
│  │  ┌──────────────────────┐  ┌──────────────────────────┐  │ │
│  │  │  Static Site         │  │  Web Service             │  │ │
│  │  │  (Frontend QA)       │  │  (Backend API QA)        │  │ │
│  │  │                      │  │                          │  │ │
│  │  │  qa.mealplan.mankoo  │  │  api-qa.mealplan.mankoo  │  │ │
│  │  │  .ca                 │  │  .ca                     │  │ │
│  │  └──────────────────────┘  └──────────────────────────┘  │ │
│  │                                                            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    Supabase Platform                       │ │
│  │                                                            │ │
│  │  Project: kzesxycoqofzlzifynql (QA)                      │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      Local Development                           │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    Docker Containers                       │ │
│  │                                                            │ │
│  │  - Supabase (PostgreSQL, Auth, API)                       │ │
│  │  - Inbucket (Email testing)                               │ │
│  │  - Studio (Database UI)                                   │ │
│  │                                                            │ │
│  │  Ports: 54321 (API), 54322 (DB), 54323 (Studio)          │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    Native Processes                        │ │
│  │                                                            │ │
│  │  - Vite Dev Server (port 3000)                            │ │
│  │  - FastAPI (port 8000)                                    │ │
│  │                                                            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Environment Configuration

### Local Development

**Purpose**: Developer workstations
**Database**: Docker Supabase (localhost)
**Deployment**: Manual (`./scripts/dev.sh`)

**Environment Variables** (`.env.local`):
```bash
# Supabase (local Docker)
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<local-anon-key>

# Backend API
VITE_API_BASE_URL=http://localhost:8000

# Google OAuth (shared across environments)
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=<google-client-id>
SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=<google-client-secret>

# Gemini API
GEMINI_API_KEY=<your-api-key>

# Analytics (debug mode)
VITE_GA_MEASUREMENT_ID=G-X5HX141WYD
VITE_GA_DEBUG=true
```

**Backend Environment** (`backend/.env`):
```bash
# Database (local Docker)
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres  # pragma: allowlist secret

# Supabase (local)
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_JWT_SECRET=<local-jwt-secret>  # pragma: allowlist secret

# Gemini API
GEMINI_API_KEY=<your-api-key>

# Environment
ENVIRONMENT=development
```

**Startup**:
```bash
# Start Supabase
cd supabase && supabase start

# Start backend and frontend
./scripts/dev.sh
```

### QA Environment

**Purpose**: Automated testing before production
**Database**: Supabase QA project
**Deployment**: Auto-deploy on push to `master`

**Frontend Environment** (Render dashboard):
```bash
VITE_SUPABASE_URL=https://kzesxycoqofzlzifynql.supabase.co
VITE_SUPABASE_ANON_KEY=<qa-anon-key>
VITE_API_BASE_URL=https://meal-planner-api-qa.onrender.com
VITE_GA_MEASUREMENT_ID=G-X5HX141WYD
VITE_GA_DEBUG=false
VITE_ENVIRONMENT=qa
```

**Backend Environment** (Render dashboard):
```bash
DATABASE_URL=postgresql://postgres.kzesxycoqofzlzifynql:<password>@aws-1-us-east-2.pooler.supabase.com:6543/postgres
SUPABASE_URL=https://kzesxycoqofzlzifynql.supabase.co
GEMINI_API_KEY=<your-api-key>
ENVIRONMENT=qa
```

**Deployment Trigger**:
```bash
git push origin master
# Automatically triggers QA deployment
```

### Production Environment

**Purpose**: Live users
**Database**: Supabase production project
**Deployment**: Manual only (via Render dashboard)

**Frontend Environment** (Render dashboard):
```bash
VITE_SUPABASE_URL=https://yirgkzecscyuxisolatu.supabase.co
VITE_SUPABASE_ANON_KEY=<prod-anon-key>
VITE_API_BASE_URL=https://meal-planner-api-v2.onrender.com
VITE_GA_MEASUREMENT_ID=G-X5HX141WYD
VITE_GA_DEBUG=false
VITE_ENVIRONMENT=production
```

**Backend Environment** (Render dashboard):
```bash
DATABASE_URL=postgresql://postgres.yirgkzecscyuxisolatu:<password>@aws-1-us-east-2.pooler.supabase.com:6543/postgres
SUPABASE_URL=https://yirgkzecscyuxisolatu.supabase.co
GEMINI_API_KEY=<your-api-key>
ENVIRONMENT=production
```

**Deployment Process**:
1. Test thoroughly in QA
2. Go to Render dashboard
3. Select production service
4. Click "Manual Deploy"
5. Select branch/commit
6. Confirm deployment
7. Monitor logs for errors

## Render Configuration

### Blueprint (render.yaml)

```yaml
services:
  # QA Frontend
  - type: web
    name: meal-planner-frontend-qa
    env: static
    buildCommand: npm install && npm run build
    staticPublishPath: ./dist
    envVars:
      - key: VITE_SUPABASE_URL
        sync: false
      - key: VITE_SUPABASE_ANON_KEY
        sync: false
      - key: VITE_API_BASE_URL
        value: https://meal-planner-api-qa.onrender.com
      - key: VITE_ENVIRONMENT
        value: qa
    routes:
      - type: rewrite
        source: /*
        destination: /index.html

  # QA Backend
  - type: web
    name: meal-planner-api-qa
    env: python
    buildCommand: cd backend && pip install -r requirements.txt
    startCommand: cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: DATABASE_URL
        sync: false
      - key: SUPABASE_URL
        sync: false
      - key: GEMINI_API_KEY
        sync: false
      - key: ENVIRONMENT
        value: qa

  # Production Frontend
  - type: web
    name: meal-planner-frontend-v2
    env: static
    buildCommand: npm install && npm run build
    staticPublishPath: ./dist
    autoDeploy: false  # Manual only
    envVars:
      - key: VITE_SUPABASE_URL
        sync: false
      - key: VITE_SUPABASE_ANON_KEY
        sync: false
      - key: VITE_API_BASE_URL
        value: https://meal-planner-api-v2.onrender.com
      - key: VITE_ENVIRONMENT
        value: production

  # Production Backend
  - type: web
    name: meal-planner-api-v2
    env: python
    buildCommand: cd backend && pip install -r requirements.txt
    startCommand: cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT
    autoDeploy: false  # Manual only
    envVars:
      - key: DATABASE_URL
        sync: false
      - key: SUPABASE_URL
        sync: false
      - key: GEMINI_API_KEY
        sync: false
      - key: ENVIRONMENT
        value: production
```

## Database Migrations

### Supabase Migrations

**Location**: `supabase/migrations/`

**Migration Files**:
- `20260128000001_initial_schema.sql` - Initial tables and RLS
- `20260203000001_add_shared_plans.sql` - Collaborative plans

**Apply Migrations**:

**Local**:
```bash
cd supabase
supabase db push
```

**QA/Production**:
```bash
# Migrations auto-apply via Supabase CLI
# Or manually via Supabase Dashboard SQL Editor
```

**Migration Strategy**:
- All schema changes via migrations
- Never modify database directly
- Test migrations in local first
- Apply to QA, verify, then production

## Deployment Workflow

### Daily Development Workflow

```
1. Developer makes changes locally
   ├─> Test with local Supabase
   └─> Verify functionality

2. Commit and push to master
   ├─> git add .
   ├─> git commit -m "Feature: ..."
   └─> git push origin master

3. Automatic QA deployment
   ├─> Render detects push
   ├─> Builds frontend and backend
   ├─> Deploys to QA environment
   └─> ~5-10 minutes

4. Test in QA
   ├─> Visit qa.mealplan.mankoo.ca
   ├─> Test all features
   ├─> Check logs for errors
   └─> Verify database changes

5. If QA passes, promote to production
   ├─> Go to Render dashboard
   ├─> Select production services
   ├─> Click "Manual Deploy"
   └─> Monitor deployment

6. Verify production
   ├─> Visit mealplan.mankoo.ca
   ├─> Smoke test critical features
   └─> Monitor error rates
```

### Rollback Procedure

**If production deployment fails**:

1. **Immediate**: Redeploy previous version
   ```
   Render Dashboard → Production Service → Deploys → Redeploy previous
   ```

2. **Database**: Rollback migration if needed
   ```bash
   # Via Supabase Dashboard SQL Editor
   # Run reverse migration SQL
   ```

3. **Verify**: Test production after rollback

4. **Investigate**: Debug issue in QA

5. **Fix and Redeploy**: Once fixed, deploy again

## Monitoring and Logging

### Render Logs

**Access**:
- Render Dashboard → Service → Logs
- Real-time log streaming
- Search and filter capabilities

**Log Levels**:
- INFO: Normal operations
- WARNING: Potential issues
- ERROR: Failures requiring attention

### Supabase Logs

**Access**:
- Supabase Dashboard → Logs
- Auth logs, API logs, Database logs

**Monitor**:
- Failed authentication attempts
- Slow queries
- RLS policy violations

### Google Analytics

**Access**:
- Google Analytics Dashboard
- Real-time reports
- User behavior analysis

**Key Metrics**:
- Active users
- Page views
- Error rates
- LLM performance

## Scaling Strategy

### Current Capacity

**Render Free Tier**:
- 750 hours/month per service
- Sufficient for development and low traffic

**Render Starter ($7/month per service)**:
- Always-on instances
- No cold starts
- Better for production

**Supabase Free Tier**:
- 50K MAU
- 500MB database
- 5GB bandwidth

**Supabase Pro ($25/month)**:
- 100K MAU
- 8GB database
- 50GB bandwidth

### Scaling Triggers

**When to scale**:
- Response times > 3 seconds
- Error rates > 1%
- Database connections exhausted
- Monthly active users > 40K

**Scaling Actions**:
1. Upgrade Render plan (Starter → Standard)
2. Upgrade Supabase plan (Free → Pro)
3. Enable connection pooling
4. Add caching layer (Redis)
5. Optimize database queries

## Security Considerations

### Secrets Management

**Never commit**:
- API keys
- Database passwords
- JWT secrets
- OAuth credentials

**Storage**:
- Local: `.env.local` (gitignored)
- QA/Prod: Render environment variables
- Backup: Secure password manager

### SSL/TLS

**Render**:
- Automatic SSL certificates
- HTTPS enforced
- Auto-renewal

**Supabase**:
- SSL connections required
- Certificate pinning available

### Network Security

**CORS**:
- Explicit allowed origins
- No wildcards in production
- Credentials allowed for auth

**Rate Limiting**:
- Gemini API: Handled by Google
- Backend: Future implementation
- Database: Connection limits

## Cost Analysis

### Monthly Costs (Production)

| Service | Tier | Cost |
|---------|------|------|
| Render Frontend | Starter | $7 |
| Render Backend | Starter | $7 |
| Supabase | Pro | $25 |
| Google Gemini | Pay-as-you-go | ~$10-20 |
| **Total** | | **$49-59/month** |

### Cost Optimization

**Strategies**:
- Use free tiers for QA
- Optimize LLM prompts (reduce tokens)
- Cache frequent queries
- Compress static assets
- Use CDN for images

**Monitoring**:
- Track Gemini API usage
- Monitor database size
- Review bandwidth usage
- Set up billing alerts
