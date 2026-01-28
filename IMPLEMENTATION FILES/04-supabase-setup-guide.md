# Supabase Authentication Setup Guide

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/sign in
2. Click "New Project"
3. Choose your organization
4. Fill in project details:
   - **Name**: `family-meal-planner` (or your preferred name)
   - **Database Password**: Generate a strong password (save it securely)
   - **Region**: Choose closest to your users
5. Click "Create new project"
6. Wait for project to be ready (2-3 minutes)

## Step 2: Configure Authentication Providers

### Enable Email Authentication
1. Go to **Authentication** → **Providers**
2. **Email** should be enabled by default
3. Configure email templates if desired

### Enable Google Authentication
1. In **Authentication** → **Providers**, click **Google**
2. Enable Google provider
3. You'll need to set up Google OAuth:

#### Google OAuth Setup:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client IDs**
5. Configure OAuth consent screen first if prompted
6. For **Application type**, choose **Web application**
7. Add authorized redirect URIs:
   - `https://your-project-ref.supabase.co/auth/v1/callback`
   - `http://localhost:5173/auth/callback` (for development)
8. Copy **Client ID** and **Client Secret**
9. Back in Supabase, paste these values and save

### Enable Apple Authentication
1. In **Authentication** → **Providers**, click **Apple**
2. Enable Apple provider
3. You'll need Apple Developer account and to set up Sign in with Apple:

#### Apple OAuth Setup:
1. Go to [Apple Developer Console](https://developer.apple.com/account/)
2. **Certificates, Identifiers & Profiles** → **Identifiers**
3. Create new **App ID** or use existing
4. Enable **Sign In with Apple** capability
5. Create **Services ID** for web authentication
6. Configure domains and redirect URLs:
   - Domain: `your-project-ref.supabase.co`
   - Redirect URL: `https://your-project-ref.supabase.co/auth/v1/callback`
7. Create **Key** for Sign in with Apple
8. Download the key file (.p8)
9. In Supabase, configure:
   - **Services ID**: Your Services ID
   - **Apple Team ID**: Your team ID
   - **Apple Key ID**: Key ID from step 7
   - **Apple Private Key**: Contents of .p8 file

## Step 3: Set Up Database Schema

1. Go to **SQL Editor** in your Supabase dashboard
2. Copy the contents of `database/schema.sql` from this project
3. Paste into SQL Editor and click **Run**
4. This will create:
   - `profiles` table for user information
   - `user_data` table for meal plans and preferences
   - Row Level Security policies
   - Triggers for automatic profile creation

## Step 4: Configure Environment Variables

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy your **Project URL** and **anon public** key
3. Create `.env.local` file in your project root:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Existing variables...
VITE_GA_MEASUREMENT_ID=your_ga_measurement_id
VITE_GA_DEBUG=false
VITE_GA_TEST_MODE=false
VITE_GEMINI_API_KEY=your_gemini_api_key
```

## Step 5: Test Authentication

1. Start your development server: `npm run dev:full`
2. Open the app in your browser
3. You should see the authentication screen
4. Test each authentication method:
   - Email signup/signin
   - Google signin (if configured)
   - Apple signin (if configured)

## Step 6: Verify Database Integration

1. Sign up with a test account
2. Complete family setup
3. Generate a meal plan
4. Check Supabase dashboard:
   - Go to **Table Editor**
   - Verify `profiles` table has your user
   - Verify `user_data` table has your meal plan data

## Troubleshooting

### Common Issues:

**"Invalid login credentials"**
- Check email/password are correct
- Verify email confirmation if required

**OAuth redirect errors**
- Verify redirect URLs match exactly
- Check domain configuration in provider settings

**Database permission errors**
- Verify RLS policies are set up correctly
- Check user is authenticated properly

**Data not syncing**
- Check browser console for errors
- Verify environment variables are correct
- Test network connectivity to Supabase

### Development vs Production

**Development:**
- Use `http://localhost:5173` for redirect URLs
- Enable debug mode for easier troubleshooting

**Production:**
- Update redirect URLs to your production domain
- Disable debug mode
- Use secure HTTPS URLs only

## Security Notes

1. **Never commit** your `.env.local` file to version control
2. **Row Level Security** is enabled by default - users can only access their own data
3. **API keys** are safe to use in frontend (anon key has limited permissions)
4. **JWT secrets** are handled automatically by Supabase
5. **OAuth credentials** should be kept secure and not shared

## Cost Considerations

- **Free tier**: 50,000 Monthly Active Users
- **Database**: 500MB included
- **Bandwidth**: 5GB included
- **API requests**: 2 million included

Perfect for development and small to medium production apps!
