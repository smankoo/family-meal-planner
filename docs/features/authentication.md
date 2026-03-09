# Authentication System

## Overview

The Family Meal Planner uses **Supabase Auth** for production-grade authentication with support for email/password and OAuth providers (Google).

## Features

- ✅ Email/password authentication
- ✅ Google OAuth sign-in
- ✅ Password reset via email
- ✅ JWT-based sessions
- ✅ Automatic token refresh
- ✅ Row Level Security (RLS)

## Architecture

### Authentication Flow

```
┌──────┐         ┌──────────┐         ┌──────────┐         ┌─────────┐
│ User │         │ Frontend │         │ Supabase │         │ Backend │
└──┬───┘         └────┬─────┘         └────┬─────┘         └────┬────┘
   │                  │                     │                     │
   │ 1. Sign In       │                     │                     │
   ├─────────────────>│                     │                     │
   │                  │                     │                     │
   │                  │ 2. signInWithEmail()│                     │
   │                  ├────────────────────>│                     │
   │                  │                     │                     │
   │                  │ 3. JWT token        │                     │
   │                  │<────────────────────┤                     │
   │                  │                     │                     │
   │                  │ 4. Store session    │                     │
   │                  ├──────────┐          │                     │
   │                  │          │          │                     │
   │                  │<─────────┘          │                     │
   │                  │                     │                     │
   │ 5. Authenticated │                     │                     │
   │<─────────────────┤                     │                     │
   │                  │                     │                     │
   │ 6. API request   │                     │                     │
   ├─────────────────>│                     │                     │
   │                  │                     │                     │
   │                  │ 7. Request + JWT    │                     │
   │                  ├─────────────────────────────────────────>│
   │                  │                     │                     │
   │                  │                     │ 8. Validate JWT     │
   │                  │                     │<────────────────────┤
   │                  │                     │                     │
   │                  │                     │ 9. User ID          │
   │                  │                     ├────────────────────>│
   │                  │                     │                     │
   │                  │ 10. Response        │                     │
   │                  │<─────────────────────────────────────────┤
   │                  │                     │                     │
   │ 11. Data         │                     │                     │
   │<─────────────────┤                     │                     │
```

### JWT Token Structure

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "aud": "authenticated",
  "role": "authenticated",
  "iat": 1234567890,
  "exp": 1234571490
}
```

**Token Properties**:
- Algorithm: ES256 (asymmetric)
- Expiration: 1 hour
- Auto-refresh: Handled by Supabase client
- Storage: Session storage (secure)

## Implementation

### Frontend (AuthContext)

**Location**: `frontend/contexts/AuthContext.tsx`

```typescript
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: { name?: string; avatar_url?: string }) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}
```

**Key Methods**:

**Sign In**:
```typescript
const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  setSession(data.session);
  setUser(data.user);
};
```

**Sign Up**:
```typescript
const signUpWithEmail = async (email: string, password: string, name?: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name } // User metadata
    }
  });

  if (error) throw error;

  setSession(data.session);
  setUser(data.user);
};
```

**Sign Out**:
```typescript
const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;

  setSession(null);
  setUser(null);
};
```

**Password Reset**:
```typescript
const resetPassword = async (email: string) => {
  const redirectUrl = `${window.location.origin}/auth/callback?type=recovery`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectUrl,
  });

  if (error) throw error;
};
```

### Backend (JWT Validation)

**Location**: `backend/supabase_auth.py`

```python
async def get_current_user_id(
    authorization: str = Header(None)
) -> str:
    """
    Validate JWT and extract user ID.
    Uses JWKS endpoint for public key verification.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")

    token = authorization.replace("Bearer ", "")

    try:
        # Fetch JWKS keys (cached)
        jwks_client = PyJWKClient(f"{SUPABASE_URL}/auth/v1/jwks")
        signing_key = jwks_client.get_signing_key_from_jwt(token)

        # Verify token
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256"],
            audience="authenticated"
        )

        return payload["sub"]  # User ID

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
```

### Database (Row Level Security)

**Location**: `supabase/migrations/20260128000001_initial_schema.sql`

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborative_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_members ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view own data"
    ON user_data FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data"
    ON user_data FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data"
    ON user_data FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own data"
    ON user_data FOR DELETE
    USING (auth.uid() = user_id);
```

## Google OAuth Setup

### Prerequisites

1. Google Cloud Console account
2. OAuth consent screen configured
3. OAuth 2.0 Client ID created

### Configuration Steps

**1. Google Cloud Console**:
```
1. Go to console.cloud.google.com
2. Create/select project
3. APIs & Services → Credentials
4. Create OAuth 2.0 Client ID
5. Add authorized origins:
   - http://localhost:5173 (local)
   - https://qa.mealplan.mankoo.ca (QA)
   - https://mealplan.mankoo.ca (production)
6. Add redirect URIs:
   - http://127.0.0.1:54321/auth/v1/callback (local)
   - https://kzesxycoqofzlzifynql.supabase.co/auth/v1/callback (QA)
   - https://yirgkzecscyuxisolatu.supabase.co/auth/v1/callback (prod)
```

**2. Supabase Configuration**:

**Local** (`supabase/config.toml`):
```toml
[auth.external.google]
enabled = true
client_id = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID)"
secret = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET)"  # pragma: allowlist secret
```

**QA/Production** (Supabase Dashboard):
```
1. Go to Authentication → Providers
2. Enable Google
3. Enter Client ID and Client Secret  # pragma: allowlist secret
4. Save
```

**3. Frontend Implementation**:

**Location**: `frontend/components/AuthModal.tsx`

```typescript
const handleGoogleSignIn = async () => {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });

    if (error) throw error;
  } catch (error: any) {
    showToast(error.message || 'Failed to sign in with Google', 'error');
  }
};
```

## OAuth Profile Auto-Population

On first sign-in via Google OAuth, the app automatically pre-fills the first family member's name from the user's Google profile. This reduces onboarding friction by eliminating redundant data entry.

### Available Data from Google OAuth

| Field | Source | Available |
|-------|--------|-----------|
| Full name | `user.user_metadata.full_name` | Yes |
| Avatar URL | `user.user_metadata.avatar_url` | Yes |
| Email | `user.email` | Yes |
| Age | N/A | No (not exposed by Google) |

### Behavior

- Only triggers on first run (before any plan has been generated)
- Only fills the name if the first family member's name field is still empty
- Users can freely edit or clear the auto-populated value
- Email-only signups are unaffected (no `full_name` in metadata)
- Returning users are never overwritten

### Implementation

**Location**: `frontend/App.tsx` (useEffect after viewMode initialization)

The effect reads `user.user_metadata.full_name` (falling back to `user.user_metadata.name`) and sets it on the first family member entry when all guard conditions pass.

## Password Reset Flow

### User Flow

```
1. User clicks "Forgot password?"
2. User enters email
3. User receives reset email
4. User clicks link in email
5. User redirected to /auth/callback?type=recovery
6. User enters new password
7. User automatically signed in
```

### Implementation

**1. Request Reset** (`components/AuthModal.tsx`):
```typescript
const handlePasswordReset = async (email: string) => {
  const redirectUrl = `${window.location.origin}/auth/callback?type=recovery`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectUrl,
  });

  if (error) throw error;

  showToast('Password reset email sent!', 'success');
};
```

**2. Handle Callback** (`frontend/components/AuthCallback.tsx`):
```typescript
const handlePasswordUpdate = async (newPassword: string) => {
  const { error } = await supabase.auth.updateUser({
    password: newPassword
  });

  if (error) throw error;

  showToast('Password updated successfully!', 'success');
  navigate('/');
};
```

### Email Configuration

**Local Development** (Inbucket):
```
- Emails sent to: http://localhost:54324
- No real emails sent
- Perfect for testing
```

**Production** (SMTP):
```
- Configure in Supabase Dashboard
- Settings → Auth → SMTP Settings
- Use SendGrid, AWS SES, or similar
```

## Security Considerations

### Token Security

**Storage**:
- ✅ Session storage (not localStorage)
- ✅ HttpOnly cookies (Supabase handles)
- ✅ Secure flag in production
- ❌ Never in URL parameters

**Transmission**:
- ✅ HTTPS only
- ✅ Authorization header
- ✅ No token in logs

**Validation**:
- ✅ Asymmetric verification (ES256)
- ✅ Expiration checked
- ✅ Audience validated
- ✅ Signature verified

### Password Security

**Requirements**:
- Minimum 6 characters (configurable)
- No maximum length
- No complexity requirements (user choice)

**Storage**:
- Bcrypt hashing (Supabase)
- Salt per password
- Never stored in plain text

**Reset**:
- Time-limited tokens (1 hour)
- Single-use tokens
- Secure email delivery

### OAuth Security

**PKCE Flow**:
- Proof Key for Code Exchange
- Prevents authorization code interception
- Required for public clients

**State Parameter**:
- CSRF protection
- Validates callback authenticity
- Generated by Supabase

## Testing

### Manual Testing

**Email/Password**:
```bash
1. Start app: ./scripts/dev.sh
2. Click "Sign Up"
3. Enter email and password
4. Verify: User created in Supabase Dashboard
5. Sign out
6. Sign in with same credentials
7. Verify: Successful login
```

**Google OAuth**:
```bash
1. Start app: ./scripts/dev.sh
2. Click "Continue with Google"
3. Select Google account
4. Grant permissions
5. Verify: Redirected back to app
6. Verify: User created in Supabase Dashboard
```

**Password Reset**:
```bash
1. Start app: ./scripts/dev.sh
2. Click "Forgot password?"
3. Enter email
4. Open Inbucket: http://localhost:54324
5. Click reset email
6. Click reset link
7. Enter new password
8. Verify: Password updated
9. Sign in with new password
```

### Automated Testing (Future)

```typescript
describe('Authentication', () => {
  it('should sign up new user', async () => {
    // Test implementation
  });

  it('should sign in existing user', async () => {
    // Test implementation
  });

  it('should handle invalid credentials', async () => {
    // Test implementation
  });

  it('should reset password', async () => {
    // Test implementation
  });
});
```

## Troubleshooting

### Common Issues

**"Invalid login credentials"**:
- Check email/password are correct
- Verify email confirmation if required
- Check Supabase logs for details

**OAuth redirect errors**:
- Verify redirect URLs match exactly
- Check domain configuration in Google Console
- Ensure HTTPS in production

**Token expired**:
- Automatic refresh should handle this
- If persists, check Supabase configuration
- Verify token expiration settings

**RLS policy violations**:
- Check user is authenticated
- Verify user_id matches
- Review RLS policies in Supabase

## Account Deletion

Users can permanently delete their account from the Settings page. The deletion process handles family plan memberships gracefully.

### Deletion Flow

```
1. User navigates to Settings → Account
2. User clicks "Delete account" link
3. Confirmation section expands with warning
4. User types "delete my account" to confirm
5. Frontend calls DELETE /account/me
6. Backend cleans up family memberships:
   - Sole owner → transfers ownership to another member
   - Last member → deletes the plan entirely
   - Regular member → removes membership
7. Backend deletes all user_data rows
8. Backend deletes profile row
9. Backend deletes Supabase auth user via admin API
10. Frontend signs out and redirects to login
```

### Backend Implementation

**Location**: `backend/routers/account.py`

The endpoint requires `SUPABASE_SERVICE_ROLE_KEY` to delete the auth user via the Supabase Admin API. This key must never be exposed to the browser.

### Environment Variables

```bash
# Required for account deletion
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
# Get from: supabase status -o env (local) or Supabase Dashboard > Settings > API (cloud)
```

## Related Documentation

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Google OAuth Setup](https://developers.google.com/identity/protocols/oauth2)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
