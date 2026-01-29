# Google OAuth Setup Checklist

Use this checklist to configure Google OAuth across all three environments.

## Prerequisites

- [ ] Google Cloud account
- [ ] Access to all three Supabase projects (Local, QA, Production)
- [ ] Production Supabase project ID

## Phase 1: Google Cloud Console (15 minutes)

### Create OAuth Client ID

- [ ] Go to https://console.cloud.google.com/
- [ ] Select or create project
- [ ] Navigate to **APIs & Services** > **OAuth consent screen**
- [ ] Configure consent screen:
  - [ ] Choose "External" user type
  - [ ] App name: "Family Meal Planner"
  - [ ] User support email: your email
  - [ ] Developer contact: your email
- [ ] Add scopes:
  - [ ] `openid`
  - [ ] `.../auth/userinfo.email`
  - [ ] `.../auth/userinfo.profile`
- [ ] Add test users (your email for testing)
- [ ] Save and continue

### Create Credentials

- [ ] Navigate to **APIs & Services** > **Credentials**
- [ ] Click **Create Credentials** > **OAuth client ID**
- [ ] Choose **Web application**
- [ ] Name: "Family Meal Planner - All Environments"

### Configure JavaScript Origins

Add these **Authorized JavaScript origins**:

- [ ] `http://localhost:5173`
- [ ] `http://127.0.0.1:5173`
- [ ] `https://qa.mealplan.mankoo.ca`
- [ ] `https://mealplan.mankoo.ca`

### Configure Redirect URIs

Add these **Authorized redirect URIs**:

- [ ] `http://127.0.0.1:54321/auth/v1/callback`
- [ ] `https://kzesxycoqofzlzifynql.supabase.co/auth/v1/callback`
- [ ] `https://<your-prod-project-id>.supabase.co/auth/v1/callback`

**Note**: Replace `<your-prod-project-id>` with actual production Supabase project ID

### Save Credentials

- [ ] Click **Create**
- [ ] Copy **Client ID** (save to password manager)
- [ ] Copy **Client Secret** (save to password manager)

## Phase 2: Local Development (5 minutes)

### Configure Local Supabase

- [ ] Open `.env.local` (NOT committed to git)
- [ ] Add these lines:
  ```bash
  SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=your-client-id
  SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=your-client-secret
  ```
- [ ] Save file (credentials are safe - .env.local is in .gitignore)
- [ ] Note: `supabase/config.toml` already configured to use env() variables

### Restart Local Supabase

```bash
cd supabase
supabase stop
supabase start
```

- [ ] Supabase restarted successfully
- [ ] No errors in console

### Test Locally

```bash
./scripts/dev.sh
```

- [ ] App opens at http://localhost:5173
- [ ] Click "Sign In"
- [ ] Click "Continue with Google"
- [ ] Redirects to Google consent screen
- [ ] After consent, redirects back to app
- [ ] User is signed in
- [ ] Check user in Supabase Studio: http://127.0.0.1:54323
- [ ] User appears in `auth.users` table

## Phase 3: QA Environment (10 minutes)

### Configure QA Supabase

- [ ] Go to https://supabase.com/dashboard
- [ ] Select **Meal Planner QA** project (`kzesxycoqofzlzifynql`)
- [ ] Navigate to **Authentication** > **Providers**
- [ ] Find **Google** in the list
- [ ] Click to expand
- [ ] Toggle **Enable**
- [ ] Enter **Client ID**: (paste from Phase 1)
- [ ] Enter **Client Secret**: (paste from Phase 1)
- [ ] Click **Save**

### Configure QA Redirect URLs

- [ ] In same Supabase project, go to **Authentication** > **URL Configuration**
- [ ] Set **Site URL**: `https://qa.mealplan.mankoo.ca`
- [ ] Under **Redirect URLs**, click **Add URL**
- [ ] Add: `https://qa.mealplan.mankoo.ca/auth/callback`
- [ ] Click **Save**

### Deploy to QA

```bash
git add .
git commit -m "Add Google OAuth configuration"
git push origin master
```

- [ ] Push successful
- [ ] Check Render dashboard for QA deployment
- [ ] Wait for build to complete (~5-10 minutes)
- [ ] Check build logs for errors

### Test QA

- [ ] Open https://qa.mealplan.mankoo.ca
- [ ] Click "Sign In"
- [ ] Click "Continue with Google"
- [ ] Redirects to Google consent screen
- [ ] After consent, redirects back to QA app
- [ ] User is signed in
- [ ] Check user in QA Supabase Dashboard
- [ ] User appears in `auth.users` table
- [ ] Verify user is NOT in production database

## Phase 4: Production Environment (10 minutes)

### Get Production Supabase Project ID

- [ ] Go to https://supabase.com/dashboard
- [ ] Select **Meal Planner** production project
- [ ] Copy project ID from URL or settings
- [ ] Update Google Cloud Console redirect URI with this ID

### Configure Production Supabase

- [ ] In production Supabase project, go to **Authentication** > **Providers**
- [ ] Find **Google** in the list
- [ ] Click to expand
- [ ] Toggle **Enable**
- [ ] Enter **Client ID**: (paste from Phase 1)
- [ ] Enter **Client Secret**: (paste from Phase 1)
- [ ] Click **Save**

### Configure Production Redirect URLs

- [ ] In same Supabase project, go to **Authentication** > **URL Configuration**
- [ ] Set **Site URL**: `https://mealplan.mankoo.ca`
- [ ] Under **Redirect URLs**, click **Add URL**
- [ ] Add: `https://mealplan.mankoo.ca/auth/callback`
- [ ] Click **Save**

### Deploy to Production

- [ ] Go to Render Dashboard
- [ ] Find **meal-planner-frontend-v2**
- [ ] Click **Manual Deploy**
- [ ] Select **Deploy latest commit**
- [ ] Wait for build to complete (~5-10 minutes)
- [ ] Check build logs for errors

### Test Production

- [ ] Open https://mealplan.mankoo.ca
- [ ] Click "Sign In"
- [ ] Click "Continue with Google"
- [ ] Redirects to Google consent screen
- [ ] After consent, redirects back to production app
- [ ] User is signed in
- [ ] Check user in Production Supabase Dashboard
- [ ] User appears in `auth.users` table
- [ ] Verify user is NOT in QA database

## Phase 5: Verification (5 minutes)

### Cross-Environment Check

- [ ] Local: Sign in with Google → User in local DB only
- [ ] QA: Sign in with Google → User in QA DB only
- [ ] Production: Sign in with Google → User in production DB only
- [ ] Confirm no data cross-contamination

### Browser Testing

Test in multiple browsers:

- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if on Mac)
- [ ] Mobile browser (iOS Safari or Android Chrome)

### Error Handling

- [ ] Try canceling Google consent → Shows appropriate error
- [ ] Try with blocked third-party cookies → Shows appropriate error
- [ ] Check browser console for any errors

## Troubleshooting

### "redirect_uri_mismatch" Error

- [ ] Check Google Cloud Console has exact redirect URI
- [ ] Verify no trailing slashes
- [ ] Verify correct protocol (http vs https)
- [ ] Wait 5 minutes for Google to propagate changes
- [ ] Try again

### OAuth Works Locally but Not in QA/Production

- [ ] Verify Supabase redirect URLs are configured
- [ ] Check Site URL matches domain exactly
- [ ] Verify Google Cloud Console has domain in JavaScript origins
- [ ] Check Render environment variables are set correctly

### User Not Appearing in Database

- [ ] Check Supabase Auth logs for errors
- [ ] Verify OAuth provider is enabled
- [ ] Check browser console for errors
- [ ] Verify correct Supabase project is being used

## Success Criteria

✅ All checkboxes above are complete
✅ Google OAuth works in all three environments
✅ Users are created in correct databases
✅ No data cross-contamination
✅ No console errors
✅ Smooth user experience

## Documentation Reference

- **Quick Start**: `GOOGLE_OAUTH_QUICKSTART.md`
- **Multi-Environment Setup**: `IMPLEMENTATION FILES/20-google-oauth-multi-environment.md`
- **Architecture Diagram**: `OAUTH_ENVIRONMENT_DIAGRAM.md`
- **Port Reference**: `OAUTH_PORTS_REFERENCE.md`
- **Detailed Guide**: `IMPLEMENTATION FILES/17-google-oauth-setup.md`

## Estimated Time

- Phase 1 (Google): 15 minutes
- Phase 2 (Local): 5 minutes
- Phase 3 (QA): 10 minutes
- Phase 4 (Production): 10 minutes
- Phase 5 (Verification): 5 minutes

**Total: ~45 minutes** (including build times)

## Next Steps After Completion

- [ ] Monitor production logs for OAuth errors
- [ ] Track OAuth sign-in conversion rate
- [ ] Consider adding Apple Sign-In (optional)
- [ ] Update user documentation
- [ ] Celebrate! 🎉
