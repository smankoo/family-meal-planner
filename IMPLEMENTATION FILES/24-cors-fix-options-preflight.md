# CORS Fix - Complete Solution for QA Environment

## Issue Summary
The QA application was experiencing CORS errors due to multiple issues:
1. **Frontend Environment Variable**: `VITE_API_BASE_URL` not properly injected during build
2. **Hardcoded localhost in dataService**: `dataService.ts` had hardcoded `localhost:8000`
3. **Custom OPTIONS middleware blocking CORS headers**: A custom middleware was intercepting OPTIONS requests before CORSMiddleware could add headers
4. **Incorrect Database Credentials**: Backend was crashing due to wrong Supabase connection string

## Root Causes & Solutions

### 1. Vite Environment Variable Injection (Fixed)
**Problem**: Vite's `define` block wasn't properly injecting `process.env` variables from Render into the build.

**Solution**: Updated `vite.config.ts` to explicitly merge `.env` file values with `process.env` values, with CI/Render taking precedence:

```typescript
// Build the final env by merging file env with process.env
// process.env (from Render/CI) takes precedence over .env files
const finalEnv: Record<string, string> = {};

// First, add all VITE_ vars from .env files
Object.keys(fileEnv).forEach(key => {
  if (key.startsWith('VITE_')) {
    finalEnv[key] = fileEnv[key];
  }
});

// Then, override with process.env VITE_ vars (from Render/CI)
Object.keys(process.env).forEach(key => {
  if (key.startsWith('VITE_') && process.env[key]) {
    finalEnv[key] = process.env[key] as string;
  }
});

// Explicitly define each VITE_ variable in the define block
define: {
  'import.meta.env.VITE_API_BASE_URL': JSON.stringify(finalEnv.VITE_API_BASE_URL || ''),
  // ... other vars
}
```

### 2. Hardcoded localhost in dataService.ts (Fixed)
**Problem**: `services/dataService.ts` had `private baseUrl = 'http://localhost:8000'` hardcoded, while `geminiService.ts` and `apiService.ts` correctly used the environment variable.

**Solution**: Updated `dataService.ts` to use the environment variable:
```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

class DataService {
  private baseUrl = API_BASE_URL;
  // ...
}
```

### 3. Custom OPTIONS Middleware Blocking CORS (Fixed)
**Problem**: A custom middleware was added to handle OPTIONS requests, but it was returning a response BEFORE CORSMiddleware could add the required CORS headers.

**Solution**: Removed the custom OPTIONS middleware entirely. FastAPI's CORSMiddleware handles OPTIONS preflight requests automatically:

```python
# Configure CORS - this handles OPTIONS preflight requests automatically
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",
        "https://mealplan.mankoo.ca",
        "https://qa.mealplan.mankoo.ca",
        "https://meal-planner-frontend-v2.onrender.com",
        "https://meal-planner-frontend-qa.onrender.com",
        "https://meal-planner-api-v2.onrender.com",
        "https://meal-planner-api-qa.onrender.com",
        "https://www.mankoo.ca",
        "https://mankoo.ca"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Verification

### Backend CORS Headers (Confirmed Working)
```bash
$ curl -s -X OPTIONS https://meal-planner-api-qa.onrender.com/user-data/ \
  -H "Origin: https://qa.mealplan.mankoo.ca" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: authorization,content-type" -i

HTTP/2 200
access-control-allow-credentials: true
access-control-allow-headers: authorization,content-type
access-control-allow-methods: DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT
access-control-allow-origin: https://qa.mealplan.mankoo.ca
access-control-max-age: 600
```

### Frontend Build (Confirmed Working)
Build logs show correct environment variables:
```
=== Vite Build Environment ===
Mode: production
VITE_API_BASE_URL: https://meal-planner-api-qa.onrender.com
VITE_ENVIRONMENT: qa
VITE_SUPABASE_URL: (set)
==============================
```

### JS Bundle (Confirmed Working)
The built JS bundle contains the correct QA backend URL:
- `"https://meal-planner-api-qa.onrender.com"` appears for both geminiService and dataService
- No more `localhost:8000` references for API calls

## Browser Cache Note
After deploying the fix, browsers may cache the old (broken) preflight response for up to 10 minutes due to `access-control-max-age: 600`. Users experiencing issues should:
1. Wait 10 minutes for cache to expire, OR
2. Use incognito/private browsing mode, OR
3. Clear browser cache

## Database Connection Fix (Critical)
**Problem**: After fixing CORS configuration, the backend was still returning errors because it couldn't connect to the Supabase database. The error was "Circuit breaker open: Too many authentication errors" followed by "Network is unreachable".

**Root Cause**: The `DATABASE_URL` environment variable was using:
1. Wrong password (causing authentication errors)
2. Direct connection (port 5432) instead of connection pooler (port 6543)

**Solution**: Updated the `DATABASE_URL` on Render to use the correct Supabase Transaction Pooler connection string:
```
postgresql://postgres.kzesxycoqofzlzifynql:[PASSWORD]@aws-1-us-east-2.pooler.supabase.com:6543/postgres
```

**Why the pooler?** Serverless environments like Render need the connection pooler (port 6543) instead of direct connections (port 5432) because:
- Direct connections can fail with IPv6 network issues
- Pooler provides better connection management for serverless workloads
- Pooler handles connection limits more gracefully

## Final Verification
After all fixes were deployed:
- ✅ Backend starts successfully without database errors
- ✅ CORS headers present on all responses
- ✅ Frontend makes successful API calls (200 or 404, no CORS errors)
- ✅ No "Access-Control-Allow-Origin missing" errors in console
- ✅ User can generate meal plans and save data
- ⚠️ Occasional 502 errors during high load (separate issue, not CORS-related)

## Files Modified
- `vite.config.ts` - Fixed env var injection from process.env
- `services/dataService.ts` - Use VITE_API_BASE_URL instead of hardcoded localhost
- `services/geminiService.ts` - Added comment clarifying fallback behavior
- `services/apiService.ts` - Added comment clarifying fallback behavior
- `backend/main.py` - Removed custom OPTIONS middleware that was blocking CORS headers
- `.env.production` - Removed hardcoded values (now set via Render dashboard)

## Commits
1. `5fe7003` - Fix Vite env var injection from Render/CI process.env
2. `133bdd7` - Fix dataService.ts to use VITE_API_BASE_URL env var
3. `16dbaed` - Remove custom OPTIONS middleware that was blocking CORS headers
4. Database credentials updated via Render dashboard (no commit - env var only)

## Key Lessons Learned

### Vite Environment Variables
- Vite's `loadEnv()` only loads from `.env` files, NOT from `process.env`
- Must explicitly use `define` block to inject `process.env` values
- Build-time logging helps debug env var issues in CI

### CORS in FastAPI
- CORSMiddleware handles OPTIONS preflight automatically
- Custom middleware can interfere with CORS header injection
- Don't return responses for OPTIONS before CORSMiddleware processes them

### Debugging CORS Issues
- Use `curl` to test OPTIONS and actual requests separately
- Check for `access-control-allow-origin` header in responses
- Browser preflight cache can mask fixes for up to 10 minutes
