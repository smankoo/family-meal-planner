# CORS Fix - OPTIONS Preflight Request Handling

## Issue Summary
The application was experiencing CORS errors where OPTIONS preflight requests were returning 400 status codes without CORS headers, blocking all cross-origin API requests from the frontend.

### Error Symptoms
```
Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource at http://localhost:8000/user-data/.
(Reason: CORS header 'Access-Control-Allow-Origin' missing). Status code: 400.
```

## Root Causes Identified

### 1. Missing QA Frontend URL in CORS Configuration
The CORS middleware was missing the QA environment URL (`https://qa.mealplan.mankoo.ca`) in the allowed origins list.

### 2. Authentication Dependency on OPTIONS Requests
The critical issue was that all `/user-data/` endpoints required authentication via `Depends(get_current_user_id)`. When browsers send OPTIONS preflight requests, they **do not include the Authorization header**. This caused:

1. Browser sends OPTIONS request (no Authorization header)
2. FastAPI processes request through router
3. `get_current_user_id` dependency tries to extract Bearer token
4. No token present → HTTPException raised
5. FastAPI returns 400/401 **before** CORSMiddleware can add CORS headers
6. Browser sees 400 without CORS headers → blocks all subsequent requests

## Solution Implemented

### 1. Updated CORS Allowed Origins
Added missing URLs to the CORS configuration in `backend/main.py`:
- `http://localhost:5173` - Vite dev server default port
- `https://qa.mealplan.mankoo.ca` - QA environment
- `https://meal-planner-frontend-qa.onrender.com` - QA Render URL
- `https://meal-planner-api-qa.onrender.com` - QA API Render URL

### 2. Added OPTIONS Request Middleware
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

After the fix:
- OPTIONS requests now return `200 OK` instead of `400 Bad Request`
- CORS headers are properly included in OPTIONS responses
- Frontend can successfully make authenticated API calls
- No CORS errors in browser console

### Backend Logs (After Fix)
```
INFO:     127.0.0.1:56920 - "OPTIONS /user-data/ HTTP/1.1" 200 OK
INFO:     127.0.0.1:56921 - "OPTIONS /user-data/family HTTP/1.1" 200 OK
INFO:     127.0.0.1:56922 - "OPTIONS /user-data/preferences HTTP/1.1" 200 OK
```

## Files Modified
- `backend/main.py` - Updated CORS configuration and added OPTIONS middleware

## Deployment Notes

### For QA Environment
Ensure the following environment variables are set in Render dashboard:
- `VITE_API_BASE_URL` should point to the QA backend URL
- Backend should be accessible from `https://qa.mealplan.mankoo.ca`

### For Production
The same fix applies to production. The CORS configuration already includes production URLs.

## Best Practices Applied
1. **OPTIONS requests bypass authentication** - Standard CORS pattern
2. **Middleware ordering matters** - CORSMiddleware first, then custom middleware
3. **Explicit origin allowlist** - More secure than wildcard `*`
4. **Environment-specific URLs** - Separate QA and production origins

## Related Documentation
- [MDN: CORS Preflight Requests](https://developer.mozilla.org/en-US/docs/Glossary/Preflight_request)
- [FastAPI CORS Documentation](https://fastapi.tiangolo.com/tutorial/cors/)
- Implementation Files:
  - `03-supabase-authentication-implementation.md`
  - `05-streaming-implementation-and-security.md`
