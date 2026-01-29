# Google OAuth Sign-In Implementation

## Overview

Google Sign-In has been implemented in the AuthModal component. This guide walks you through the configuration steps needed to enable it.

## Why Google First?

Google OAuth is simpler than Apple Sign-In because:
- No secret key rotation required (Apple requires rotating every 6 months)
- Fewer configuration steps
- Works consistently across all platforms
- Better testing experience (works in browsers and simulators)
- No Apple Developer account required ($99/year for Apple)

## Implementation Status

✅ **Frontend Code**: Complete
- Google Sign-In button added to AuthModal
- OAuth flow integrated with Supabase Auth
- Callback handling already in place via AuthCallback component
- Elegant UI with Google branding

## Configuration Steps

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your Project ID for reference

### 2. Configure OAuth Consent Screen

1. Navigate to **APIs & Services** > **OAuth consent screen**
2. Choose **External** user type (unless you have a Google Workspace)
3. Fill in the required information:
   - **App name**: Your app name (e.g., "Family Meal Planner")
   - **User support email**: Your email
   - **Developer contact email**: Your email
4. Add scopes:
   - `openid`
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
5. Add test users (for development)
6. Save and continue

### 3. Create OAuth 2.0 Credentials

1. Navigate to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Choose **Web application**
4. Configure:

   **For Local Development:**
   - **Authorized JavaScript origins**:
     - `http://localhost:5173` (Vite dev server)
     - `http://127.0.0.1:5173`
   - **Authorized redirect URIs**:
     - `http://127.0.0.1:54321/auth/v1/callback` (Supabase local API)

   **For Production:**
   - **Authorized JavaScript origins**:
     - `https://your-domain.com`
     - `https://<project-id>.supabase.co`
   - **Authorized redirect URIs**:
     - `https://<project-id>.supabase.co/auth/v1/callback`

5. Click **Create**
6. Copy the **Client ID** and **Client Secret**

### 4. Configure Supabase

#### Option A: Using Supabase Dashboard (Recommended)

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** > **Providers**
4. Find **Google** in the list
5. Enable the provider
6. Enter your **Client ID** and **Client Secret**
7. Click **Save**

#### Option B: Using Supabase CLI (Local Development)

1. Edit `supabase/config.toml`:

```toml
[auth.external.google]
enabled = true
client_id = "your-google-client-id"
secret = "your-google-client-secret"  # pragma: allowlist secret
```

2. Restart your local Supabase:

```bash
cd supabase
supabase stop
supabase start
```

### 5. Update Redirect URLs in Supabase

1. In Supabase Dashboard, go to **Authentication** > **URL Configuration**
2. Add to **Redirect URLs**:
   - `http://localhost:5173/auth/callback` (local dev)
   - `https://your-production-domain.com/auth/callback` (production)

## Testing

### Local Development

1. Start your development environment:
   ```bash
   ./scripts/dev.sh
   ```

2. Open the app at `http://localhost:5173`

3. Click the "Sign In" button to open the auth modal

4. Click "Continue with Google"

5. You should be redirected to Google's consent screen

6. After granting permission, you'll be redirected back to your app

7. Check the browser console for any errors

### Verify Authentication

After signing in, check:
- User appears in Supabase Dashboard under **Authentication** > **Users**
- User metadata includes email and name from Google
- Session is persisted (refresh the page, user should stay logged in)

## Troubleshooting

### "redirect_uri_mismatch" Error

**Problem**: The redirect URI doesn't match what's configured in Google Cloud Console.

**Solution**:
1. Check the error message for the exact redirect URI being used
2. Add that exact URI to Google Cloud Console under **Authorized redirect URIs**
3. Common URIs to add:
   - `http://127.0.0.1:54321/auth/v1/callback` (local Supabase)
   - `https://<project-id>.supabase.co/auth/v1/callback` (hosted Supabase)

### "Access blocked: Authorization Error"

**Problem**: OAuth consent screen not properly configured.

**Solution**:
1. Go to OAuth consent screen in Google Cloud Console
2. Add your email as a test user
3. Ensure all required fields are filled
4. If in production, submit for verification

### User Not Redirected After Sign-In

**Problem**: Callback route not properly configured.

**Solution**:
1. Verify `/auth/callback` route exists in your app (it does - AuthCallback.tsx)
2. Check browser console for errors
3. Verify redirect URL in Supabase matches your app's URL

### Session Not Persisting

**Problem**: Cookies or localStorage issues.

**Solution**:
1. Check browser console for storage errors
2. Ensure third-party cookies are enabled
3. Verify Supabase client is configured with `persistSession: true` (already set in config/supabase.ts)

## Security Best Practices

1. **Never commit credentials**: Keep Client ID and Secret in environment variables
2. **Use HTTPS in production**: OAuth requires secure connections
3. **Restrict redirect URIs**: Only add URIs you control
4. **Rotate secrets periodically**: Though not required like Apple, it's good practice
5. **Monitor usage**: Check Google Cloud Console for unusual activity

## Next Steps

After Google OAuth is working:

1. **Test thoroughly**: Try sign-in, sign-out, and session persistence
2. **Add Apple Sign-In**: If needed, follow similar process (more complex)
3. **Customize user experience**: Add user profile pictures from Google
4. **Handle edge cases**: Account linking, email verification, etc.

## Code Changes Made

### components/AuthModal.tsx
- Added `handleGoogleSignIn` function
- Added Google Sign-In button with proper branding
- Added elegant divider between OAuth and email sign-in
- Removed "Coming Soon" notice

### .env.example
- Added comments about OAuth configuration
- Noted that Google OAuth is configured in Supabase Dashboard

### components/AuthCallback.tsx
- No changes needed - already handles OAuth callbacks properly

## Resources

- [Supabase Google Auth Docs](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google OAuth 2.0 Setup](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)

## Support

If you encounter issues:
1. Check Supabase logs in Dashboard under **Logs** > **Auth**
2. Check browser console for client-side errors
3. Verify all redirect URIs match exactly (including http vs https)
4. Ensure OAuth consent screen is properly configured
