# CORS Fix - OPTIONS Preflight & Environment Configuration

## Issue Summary
The QA application was experiencing CORS errors due to two critical issues:
1. **Frontend Environment Variable**: `VITE_API_BASE_URL` not set in Render, causing frontend to call `http://localhost:8000` instead of QA backend
2. **Backend CORS Configuration**: OPTIONS preflight requests blocked by authentication before CORS headers could be added

### Error Symptoms
```
Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource at http://localhost:8000/user-data/.
(Reason: CORS header 'Access-Control-Allow-Origin' missing). Status code: 200.
```

## Root Causes

### 1. Missing Environment Variable in QA Frontend
**Critical Issue**: Vite injects environment variables at BUILD time, not runtime. The QA frontend static site on Render was built without `VITE_API_BASE_URL` set, causing it to default to `http://localhost:8000`.

**Why it happened**: Environment variables for static sites must be configured in Render dashboard BEFORE the build runs. The variable was defined in `render.yaml` as `sync: false` (secret), but the actual value wasn't set in the dashboard.

### 2. Authentication Dependency on OPTIONS Requests
All `/user-data/` endpoints required authentication via `Depends(get_current_user_id)`. When browsers send OPTIONS preflight requests, they **do not include the Authorization header**. This caused:

1. Browser sends OPTIONS request (no Authorization header)
2. FastAPI processes request through router
3. `get_current_user_id` dependency tries to extract Bearer token
4. No token present → HTTPException raised
5. FastAPI returns 400/401 **before** CORSMiddleware can add CORS headers
6. Browser sees response without CORS headers → blocks all subsequent requests

### 3. Missing QA URLs in CORS Configuration
The CORS middleware was missing QA environment URLs in the allowed origins list.

## Solutions Implemented

### 1. Set Frontend Environment Variable in Render
Used Render MCP to set `VITE_API_BASE_URL=https://meal-planner-api-qa.onrender.com` for the QA frontend service. This triggered an automatic rebuild with the correct API URL baked into the static assets.

**Command used**:
```
mcp_render_update_environment_variables(
  serviceId: "srv-d5tddhe3jp1c73e5a490",
  envVars: [{"key": "VITE_API_BASE_URL", "value": "https://meal-planner-api-qa.onrender.com"}]
)
```

### 2. Updated CORS Allowed Origins
Added missing URLs to the CORS configuration in `backend/main.py`:
- `http://localhost:5173` - Vite dev server default port
- `https://qa.mealplan.mankoo.ca` - QA environment custom domain
- `https://meal-planner-frontend-qa.onrender.com` - QA Render URL
- `https://meal-planner-api-qa.onrender.com` - QA API Render URL

### 3. Added OPTIONS Request Middleware
Created a custom middleware that intercepts OPTIONS requests **before** they reach the authentication layer:

```python
@app.middleware("http")
async def handle_options_requests(request, call_next):
    """
    Handle OPTIONS preflight requests before they hit authentication.
    This ensures CORS headers are added even when auth would normally fail.
    """
    if request.method == "OPTIONS":
        # Return 200 OK for OPTIONS requests
        # CORSMiddleware will add the appropriate headers
        return JSONResponse(content={}, status_code=200)

    response = await call_next(request)
    return response
```

### Key Points
- Middleware is added **after** CORSMiddleware so CORS headers are still applied
- OPTIONS requests return 200 OK immediately without hitting authentication
- All other requests (GET, POST, PUT, DELETE) still require authentication
- This is a standard pattern for handling CORS preflight in authenticated APIs

## Verification

### After the fix:
1. ✅ Frontend calls correct QA backend URL (`https://meal-planner-api-qa.onrender.com`)
2. ✅ OPTIONS requests return `200 OK` with proper CORS headers
3. ✅ Authenticated API calls succeed from QA frontend
4. ✅ No CORS errors in browser console

### Deployment Status
- **QA Backend**: Live at `https://meal-planner-api-qa.onrender.com` (deploy: dep-d5u2ib6mcj7s73d2r1q0)
- **QA Frontend**: Live at `https://meal-planner-frontend-qa.onrender.com` (deploy: dep-d5u2i8ogjchc73bcro0g)

## Files Modified
- `backend/main.py` - Updated CORS configuration and added OPTIONS middleware
- Render QA Frontend Service - Set `VITE_API_BASE_URL` environment variable

## Important Lessons

### Vite Environment Variables
- **Build-time injection**: Vite replaces `import.meta.env.VITE_*` with actual values during build
- **Not runtime**: Unlike server-side apps, static sites can't read env vars at runtime
- **Render requirement**: For static sites, env vars must be set in dashboard before build
- **Verification**: Check built files to confirm correct values are baked in

### CORS Preflight Pattern
- OPTIONS requests must bypass authentication
- Middleware ordering matters: CORS first, then custom middleware
- Return 200 OK for OPTIONS, let CORSMiddleware add headers
- Never block OPTIONS at authentication layer

## Deployment Notes

### For QA Environment
Ensure these environment variables are set in Render dashboard:
- **Frontend**: `VITE_API_BASE_URL=https://meal-planner-api-qa.onrender.com`
- **Backend**: Standard Supabase and Gemini API keys

### For Production
Same pattern applies. Ensure:
- **Frontend**: `VITE_API_BASE_URL=https://meal-planner-api-v2.onrender.com`
- **Backend**: CORS includes production URLs

## Related Documentation
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [MDN: CORS Preflight Requests](https://developer.mozilla.org/en-US/docs/Glossary/Preflight_request)
- [FastAPI CORS Documentation](https://fastapi.tiangolo.com/tutorial/cors/)
- [Render Static Site Environment Variables](https://render.com/docs/configure-environment-variables)

## Related Implementation Files
- `03-supabase-authentication-implementation.md`
- `05-streaming-implementation-and-security.md`
- `14-automatic-environment-detection.md`
