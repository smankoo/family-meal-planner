# Quick Start Guide

## ✅ Environment Status: SAFE FOR DEVELOPMENT

Your development environment is configured to use **local Supabase only**. Production data is protected.

## Start Development (3 Steps)

### 1. Start Docker Desktop
- Open Docker Desktop app
- Wait for whale icon in menu bar

### 2. Start Local Supabase
```bash
cd supabase
supabase start
```
**First time**: Downloads images (~2-3 min)
**After that**: Starts in ~10 seconds

### 3. Start Development
```bash
./scripts/dev.sh
```

## Access Points

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Supabase Studio**: http://127.0.0.1:54323

## Verify Safety

```bash
./scripts/verify-environment.sh
```

Should show:
- ✓ Using LOCAL Supabase
- ✓ Using LOCAL Database
- ✓ Production data is protected

## Stop Development

```bash
./scripts/stop.sh
```

## Current Configuration

| Component | Environment | Status |
|-----------|-------------|--------|
| Frontend | Local Supabase | ✅ Safe |
| Backend | Local Postgres | ✅ Safe |
| Production | Not accessible | ✅ Protected |

## Test Auth Locally

1. Open http://localhost:3000
2. Click "Get Started"
3. Sign up: `test@local.dev` / `testpass123`
4. Check Studio: http://127.0.0.1:54323
5. See user in local database only

## Production Protection

✅ Production Supabase: `yirgkzecscyuxisolatu.supabase.co` - NOT in use
✅ Production database: AWS RDS - NOT accessible
✅ All development is local only
✅ Can reset local database anytime without consequences

## Need Help?

- Full setup: `ENVIRONMENT_SETUP.md`
- Verification details: `IMPLEMENTATION FILES/12-environment-verification.md`
- Troubleshooting: `ENVIRONMENT_SETUP.md` (bottom section)
