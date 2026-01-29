# Google OAuth Quick Start

## ✅ Implementation Complete

Google Sign-In is now integrated into your app. You just need to configure it.

## 🚀 5-Step Setup (20 minutes)

**Note**: For QA/Production setup, see `IMPLEMENTATION FILES/20-google-oauth-multi-environment.md`

### 1. Google Cloud Console
- Go to: https://console.cloud.google.com/
- Create project or select existing
- Enable OAuth consent screen
- Add scopes: `openid`, `email`, `profile`

### 2. Create OAuth Credentials
- APIs & Services → Credentials → Create OAuth Client ID
- Type: **Web application**
- Add **Authorized JavaScript origins**:
  - `http://localhost:5173` (Vite dev server)
  - `http://127.0.0.1:5173`
  - `https://qa.mealplan.mankoo.ca` (QA)
  - `https://mealplan.mankoo.ca` (Production)
- Add **Authorized redirect URIs**:
  - Local: `http://127.0.0.1:54321/auth/v1/callback`
  - QA: `https://kzesxycoqofzlzifynql.supabase.co/auth/v1/callback`
  - Prod: `https://<your-prod-project-id>.supabase.co/auth/v1/callback`
- Copy **Client ID** and **Client Secret**

### 3. Configure Supabase (All Environments)

**Local:**
- Edit `supabase/config.toml` → Add Google credentials
- Restart: `cd supabase && supabase stop && supabase start`

**QA & Production:**
- Dashboard → Authentication → Providers → Google
- Enable and paste Client ID + Secret
- Configure redirect URLs in URL Configuration
- See `IMPLEMENTATION FILES/20-google-oauth-multi-environment.md` for details

### 4. Add Redirect URLs
- Supabase Dashboard → Authentication → URL Configuration
- Add: `http://localhost:5173/auth/callback`
- Add: `https://your-domain.com/auth/callback` (for production)

### 5. Test
```bash
./scripts/dev.sh
```
- Open http://localhost:5173
- Click "Sign In" → "Continue with Google"
- Should redirect to Google and back

## 📱 What Users See

```
┌─────────────────────────────────┐
│     Welcome Back / Sign Up      │
├─────────────────────────────────┤
│  [G] Continue with Google       │ ← NEW!
│                                 │
│  ─── Or continue with email ─── │
│                                 │
│  Email: [____________]          │
│  Password: [____________]       │
│  [Sign In]                      │
└─────────────────────────────────┘
```

## 🔧 Troubleshooting

**"redirect_uri_mismatch"**
→ Add exact URI from error to Google Cloud Console

**"Access blocked"**
→ Add your email as test user in OAuth consent screen

**Not redirecting back**
→ Check Supabase redirect URLs match your app URL

## 📚 Full Documentation

See `IMPLEMENTATION FILES/17-google-oauth-setup.md` for:
- Detailed setup instructions
- Security best practices
- Advanced troubleshooting
- Production deployment guide

## 🎯 Next Steps

1. ✅ Configure Google OAuth (follow steps above)
2. ✅ Test in local development
3. ✅ Deploy and test in production
4. ⏭️ Consider Apple Sign-In (optional, more complex)

## 💡 Why Google First?

- ✅ Simpler than Apple (no secret rotation)
- ✅ No paid developer account needed
- ✅ Works everywhere (web, mobile, desktop)
- ✅ Better testing experience

## 🆘 Need Help?

Check these in order:
1. Browser console for errors
2. Supabase Dashboard → Logs → Auth
3. Verify redirect URIs match exactly
4. Full guide: `IMPLEMENTATION FILES/17-google-oauth-setup.md`
