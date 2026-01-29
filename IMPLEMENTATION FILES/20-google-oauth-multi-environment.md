# Google OAuth Multi-Environment Configuration

## Overview

Your app has three environments, each requiring separate OAuth configuration:

| Environment | Frontend URL | Supabase Project | Auto-Deploy |
|-------------|-------------|------------------|-------------|
| **Local** | `http://localhost:5173` | Local Docker | N/A |
| **QA** | `https://qa.mealplan.mankoo.ca` | QA Project | ✅ Yes |
| **Production** | `https://mealplan.mankoo.ca` | Prod Project | ❌ Manual |

## Google Cloud Console Configuration

You need to configure **ONE** OAuth Client ID that works for **ALL** environments.

### Step 1: Create OAuth Client ID

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**
5. Choose **Web application**
6. Name it: "Family Meal Planner - All Environments"

### Step 2: Configure Authorized JavaScript Origins

Add ALL your frontend URLs:

```
http://localhost:5173
http://127.0.0.1:5173
https://qa.mealplan.mankoo.ca
https://mealplan.mankoo.ca
```

**Why these?**
- `localhost:5173` - Local development (Vite dev server)
- `127.0.0.1:5173` - Alternative local address
- `qa.mealplan.mankoo.ca` - QA environment
- `mealplan.mankoo.ca` - Production environment

### Step 3: Configure Authorized Redirect URIs

Add ALL your Supabase callback URLs:

```
http://127.0.0.1:54321/auth/v1/callback
https://kzesxycoqofzlzifynql.supabase.co/auth/v1/callback
https://<your-prod-project-id>.supabase.co/auth/v1/callback
```

**Why these?**
- `127.0.0.1:54321` - Local Supabase (Docker)
- `kzesxycoqofzlzifynql.supabase.co` - QA Supabase project
- `<your-prod-project-id>.supabase.co` - Production Supabase project

**Important**: Replace `<your-prod-project-id>` with your actual production Supabase project ID.

### Step 4: Save Credentials

1. Click **Create**
2. Copy the **Client ID** and **Client Secret**
3. You'll use these in ALL environments

## Supabase Configuration

You need to configure Google OAuth in **EACH** Supabase project separately.

### Local Supabase (Docker)

**File**: `supabase/config.toml` (already configured with env() variables)

The config file uses environment variable substitution:
```toml
[auth.external.google]
enabled = true
client_id = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID)"
secret = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET)"  # pragma: allowlist secret
```

**File**: `.env.local` (add your credentials here - NOT committed to git)

```bash
# Add these lines to your .env.local file
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=your-google-client-secret
```

**Then restart Supabase:**
```bash
cd supabase
supabase stop
supabase start
```

**Security**: ✅ Credentials stay in `.env.local` which is in `.gitignore`

### QA Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select **Meal Planner QA** project (`kzesxycoqofzlzifynql`)
3. Navigate to **Authentication** > **Providers**
4. Find **Google** in the list
5. Enable it
6. Enter:
   - **Client ID**: `your-google-client-id.apps.googleusercontent.com`
   - **Client Secret**: `your-google-client-secret`
7. Click **Save**

**Also configure redirect URLs:**
1. Go to **Authentication** > **URL Configuration**
2. Set **Site URL**: `https://qa.mealplan.mankoo.ca`
3. Add **Redirect URLs**:
   - `https://qa.mealplan.mankoo.ca/auth/callback`
4. Click **Save**

### Production Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select **Meal Planner** production project
3. Navigate to **Authentication** > **Providers**
4. Find **Google** in the list
5. Enable it
6. Enter:
   - **Client ID**: `your-google-client-id.apps.googleusercontent.com`
   - **Client Secret**: `your-google-client-secret`
7. Click **Save**

**Also configure redirect URLs:**
1. Go to **Authentication** > **URL Configuration**
2. Set **Site URL**: `https://mealplan.mankoo.ca`
3. Add **Redirect URLs**:
   - `https://mealplan.mankoo.ca/auth/callback`
4. Click **Save**

## OAuth Flow by Environment

### Local Development

```
User at: http://localhost:5173
         ↓
Clicks "Continue with Google"
         ↓
Redirects to: https://accounts.google.com/...
         ↓
User grants permission
         ↓
Google redirects to: http://127.0.0.1:54321/auth/v1/callback
         ↓
Local Supabase processes OAuth
         ↓
Redirects to: http://localhost:5173/auth/callback
         ↓
User signed in! (data in local Docker database)
```

### QA Environment

```
User at: https://qa.mealplan.mankoo.ca
         ↓
Clicks "Continue with Google"
         ↓
Redirects to: https://accounts.google.com/...
         ↓
User grants permission
         ↓
Google redirects to: https://kzesxycoqofzlzifynql.supabase.co/auth/v1/callback
         ↓
QA Supabase processes OAuth
         ↓
Redirects to: https://qa.mealplan.mankoo.ca/auth/callback
         ↓
User signed in! (data in QA Supabase database)
```

### Production Environment

```
User at: https://mealplan.mankoo.ca
         ↓
Clicks "Continue with Google"
         ↓
Redirects to: https://accounts.google.com/...
         ↓
User grants permission
         ↓
Google redirects to: https://<prod-project-id>.supabase.co/auth/v1/callback
         ↓
Production Supabase processes OAuth
         ↓
Redirects to: https://mealplan.mankoo.ca/auth/callback
         ↓
User signed in! (data in Production Supabase database)
```

## Testing Checklist

### ✅ Local Development
- [ ] Start app: `./scripts/dev.sh`
- [ ] Open: `http://localhost:5173`
- [ ] Click "Sign In" → "Continue with Google"
- [ ] Should redirect to Google and back
- [ ] Check user in local Supabase Studio: `http://127.0.0.1:54323`

### ✅ QA Environment
- [ ] Push to master (auto-deploys)
- [ ] Open: `https://qa.mealplan.mankoo.ca`
- [ ] Click "Sign In" → "Continue with Google"
- [ ] Should redirect to Google and back
- [ ] Check user in QA Supabase Dashboard
- [ ] Verify separate from production data

### ✅ Production Environment
- [ ] Manual deploy from Render Dashboard
- [ ] Open: `https://mealplan.mankoo.ca`
- [ ] Click "Sign In" → "Continue with Google"
- [ ] Should redirect to Google and back
- [ ] Check user in Production Supabase Dashboard
- [ ] Verify production data isolated from QA

## Common Issues

### "redirect_uri_mismatch" in QA

**Problem**: Google doesn't recognize QA redirect URI.

**Solution**:
1. Check Google Cloud Console has: `https://kzesxycoqofzlzifynql.supabase.co/auth/v1/callback`
2. Verify exact match (no trailing slash, correct protocol)
3. Wait 5 minutes for Google to propagate changes

### "redirect_uri_mismatch" in Production

**Problem**: Google doesn't recognize production redirect URI.

**Solution**:
1. Get your production Supabase project ID from dashboard
2. Add to Google Cloud Console: `https://<prod-id>.supabase.co/auth/v1/callback`
3. Verify exact match
4. Wait 5 minutes for Google to propagate changes

### OAuth Works Locally but Not in QA/Production

**Problem**: Supabase redirect URLs not configured.

**Solution**:
1. Check each Supabase project's **Authentication** > **URL Configuration**
2. Ensure **Site URL** matches your domain
3. Ensure **Redirect URLs** includes `/auth/callback`
4. Save and test again

### Users Created in Wrong Database

**Problem**: QA users appearing in production or vice versa.

**Solution**:
- This shouldn't happen if Supabase projects are separate
- Verify you're using correct Supabase project ID in each environment
- Check `VITE_SUPABASE_URL` in Render dashboard for each service

## Security Considerations

### Same OAuth Credentials Across Environments

**Is this safe?** Yes, because:
- ✅ Each Supabase project is isolated
- ✅ Users are stored in separate databases
- ✅ QA and production data never mix
- ✅ Google only validates the redirect URI

**Alternative approach** (more complex):
- Create separate OAuth Client IDs for each environment
- Requires managing 3 sets of credentials
- Only needed if you want separate Google Cloud projects

### Protecting Production

- ✅ Production never auto-deploys
- ✅ Test OAuth thoroughly in QA first
- ✅ Monitor production logs after enabling
- ✅ Have rollback plan ready

## Deployment Workflow

### 1. Configure Locally
```bash
# Edit supabase/config.toml
# Add Google OAuth credentials
cd supabase
supabase stop
supabase start
# Test locally
```

### 2. Push to QA
```bash
git add .
git commit -m "Add Google OAuth"
git push origin master
# Auto-deploys to QA
# Wait 5-10 minutes for build
```

### 3. Configure QA Supabase
- Go to QA Supabase Dashboard
- Enable Google provider
- Add credentials
- Configure redirect URLs
- Test at: `https://qa.mealplan.mankoo.ca`

### 4. Promote to Production
- Manual deploy from Render Dashboard
- Configure Production Supabase (same steps as QA)
- Test at: `https://mealplan.mankoo.ca`

## Summary

**One OAuth Client ID** works for all environments because:
- Google validates against the redirect URI
- Each environment has its own Supabase project
- Data is completely isolated

**Configuration needed:**
1. ✅ Google Cloud Console (once, all URIs)
2. ✅ Local Supabase (config.toml)
3. ✅ QA Supabase Dashboard
4. ✅ Production Supabase Dashboard

**Total setup time:** ~30 minutes for all environments

## Quick Reference

| Environment | Frontend | Supabase Callback |
|-------------|----------|-------------------|
| Local | `localhost:5173` | `127.0.0.1:54321/auth/v1/callback` |
| QA | `qa.mealplan.mankoo.ca` | `kzesxycoqofzlzifynql.supabase.co/auth/v1/callback` |
| Prod | `mealplan.mankoo.ca` | `<prod-id>.supabase.co/auth/v1/callback` |
