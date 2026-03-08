# Cross-Cutting Concerns

## Security

### Authentication & Authorization

**JWT Token Flow**:
```
1. User signs in via Supabase
2. Supabase issues JWT (ES256)
3. Frontend stores token in session
4. Frontend includes token in API requests (Authorization header)
5. Backend validates JWT using JWKS endpoint
6. Backend extracts user_id from token
7. Database enforces RLS based on user_id
```

**Token Security**:
- Asymmetric signing (ES256) - no shared secrets
- Short expiration (1 hour)
- Automatic refresh via Supabase client
- PKCE flow for OAuth

**Row Level Security (RLS)**:
```sql
-- Users can only access their own data
CREATE POLICY "Users can view own data"
    ON user_data FOR SELECT
    USING (auth.uid() = user_id);

-- Plan members can access shared plans
CREATE POLICY "Members can view plans"
    ON collaborative_plans FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM plan_members
            WHERE plan_id = collaborative_plans.id
            AND user_id = auth.uid()
        )
    );
```

**API Security**:
- CORS restricted to known origins
- No wildcard origins in production
- Input validation via Pydantic schemas
- SQL injection prevention (parameterized queries)

### Secret Management

**Pre-commit Hooks**:
- `detect-secrets`: High entropy string detection
- `detect-private-key`: SSH key detection
- Custom regex: API key patterns (Google, AWS, OpenAI, etc.)

**Patterns Detected**:
```regex
# Google API Keys
AIza[0-9A-Za-z_-]{35}

# AWS Keys
AKIA[0-9A-Z]{16}

# GitHub Tokens
ghp_[0-9a-zA-Z]{36}

# OpenAI Keys
sk-[0-9a-zA-Z]{48}

# Generic patterns
(API_KEY|TOKEN|SECRET|PASSWORD)\s*=\s*['"]\w+['"]
```

**Environment Variables**:
- Never committed to git
- Stored in `.env.local` (gitignored)
- Render dashboard for QA/production
- Documented in `.env.example`

### Data Privacy

**GDPR Compliance**:
- User data export available (`/user-data/export/all`)
- User data deletion via account deletion
- RLS ensures data isolation
- No PII in logs or analytics

**IP Anonymization**:
- Google Analytics configured with `anonymize_ip: true`
- No user tracking without consent
- Session-based analytics only

**Data Encryption**:
- At rest: Supabase automatic encryption
- In transit: HTTPS/TLS everywhere
- Database: SSL connections required

## Performance

### Frontend Optimization

**Code Splitting**:
```typescript
// React Router lazy loading
const MealPrepView = lazy(() => import('./components/MealPrepView'));
const GroceryListView = lazy(() => import('./components/GroceryListView'));
```

**Bundle Optimization**:
- Vite tree-shaking
- Minification in production
- Gzip compression
- CDN delivery via Render

**Streaming Rendering**:
- Progressive content display
- Direct DOM manipulation (no React re-renders)
- Skeleton loaders during fetch
- Smooth animations (CSS transitions)

**Request Batching**:
```typescript
// dataService.ts
private requestQueue: QueuedRequest[] = [];
private readonly MAX_CONCURRENT_REQUESTS = 3;
private readonly REQUEST_DELAY = 100; // ms

// Batch concurrent requests to avoid overwhelming backend
```

### Backend Optimization

**Async Operations**:
```python
# All endpoints are async
@router.get("/user-data/")
async def get_all_user_data(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    # Non-blocking database queries
```

**Connection Pooling**:
```python
# database.py
engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True  # Verify connections before use
)
```

**Streaming Responses**:
```python
# Server-Sent Events for progressive rendering
async def generate_plan_stream():
    async for chunk in gemini_stream():
        yield f"data: {json.dumps(chunk)}\n\n"
```

### Database Optimization

**Indexes**:
```sql
CREATE INDEX idx_user_data_user_id ON user_data(user_id);
CREATE INDEX idx_user_data_data_type ON user_data(data_type);
CREATE INDEX idx_plan_members_plan_id ON plan_members(plan_id);
```

**JSONB Queries**:
```sql
-- Efficient JSONB queries
SELECT data->'family' FROM user_data
WHERE user_id = $1 AND data_type = 'family';
```

**Connection Pooler**:
- Supabase Pooler (port 6543) for serverless
- Handles connection limits gracefully
- Reduces connection overhead

### Performance Metrics

**Target Metrics**:
- Time-to-first-content: < 3 seconds
- Full page load: < 5 seconds
- API response time: < 500ms (p95)
- Database query time: < 100ms (p95)

**Monitoring**:
- Google Analytics: Page load times
- Render logs: API response times
- Supabase dashboard: Query performance

## Observability

### Logging

**Frontend Logging**:
```typescript
// Development: Verbose console logs
if (import.meta.env.DEV) {
  console.log('Saved family data:', data);
}

// Production: Error logging only
console.error('Failed to save data:', error);
```

**Backend Logging**:
```python
import logging

logger = logging.getLogger(__name__)

# INFO: Normal operations
logger.info(f"User {user_id} generated meal plan")

# WARNING: Potential issues
logger.warning(f"Rate limit approaching for user {user_id}")

# ERROR: Failures
logger.error(f"Failed to save data: {error}", exc_info=True)
```

**Log Levels**:
- DEBUG: Detailed debugging (dev only)
- INFO: Normal operations
- WARNING: Potential issues
- ERROR: Failures requiring attention
- CRITICAL: System failures

### Analytics

**Event Tracking**:
```typescript
// Meal planning events
trackMealPlanning('plan_generation_started', {
  family_size: family.length,
  has_restrictions: preferences.restrictions.length > 0
});

// LLM interactions
trackLLMInteraction('plan_update_requested', {
  query_length: message.length,
  response_time: responseTime
});

// User engagement
trackEvent({
  action: 'stage_changed',
  category: 'navigation',
  custom_parameters: {
    from_stage: previousStage,
    to_stage: currentStage
  }
});
```

**Key Metrics**:
- User engagement: Active users, session duration
- Feature usage: Plan generation, chat interactions
- Performance: LLM response times, error rates
- Conversion: Sign-ups, plan completions

### Error Tracking

**Frontend Error Boundary**:
```typescript
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    // Log to analytics
    analyticsService.trackEvent({
      action: 'error',
      category: 'app_error',
      custom_parameters: {
        error_message: error.message,
        component_stack: errorInfo.componentStack
      }
    });
  }
}
```

**Backend Error Handling**:
```python
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)

    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": "An unexpected error occurred",
            "code": "INTERNAL_ERROR"
        }
    )
```

**Error Response Format**:
```typescript
interface ErrorResponse {
  error: string;           // User-friendly error title
  message: string;         // Detailed error message
  code: string;            // Error code for categorization
  retry_after?: number;    // Seconds to wait before retry
  details?: string;        // Technical details (dev only)
}
```

### Health Checks

**Backend Health Endpoint**:
```python
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "3.0.0"
    }
```

**Monitoring**:
- Render: Automatic health checks
- Supabase: Database health dashboard
- Manual: Smoke tests after deployment

## Reliability

### Error Handling

**Graceful Degradation**:
```typescript
// Try streaming, fallback to batch
try {
  await generateInitialMealPlanStream(/* ... */);
} catch (error) {
  console.warn('Streaming failed, falling back to batch:', error);
  await generateInitialMealPlan(/* ... */);
}
```

**Retry Logic**:
```typescript
// Exponential backoff for transient failures
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(Math.pow(2, i) * 1000); // 1s, 2s, 4s
    }
  }
}
```

**Rate Limit Handling**:
```python
# Backend returns structured error with retry_after
if isinstance(exc, google_exceptions.ResourceExhausted):
    return 429, ErrorResponse(
        error="Rate Limit Exceeded",
        message="API rate limit exceeded. Please try again in a few minutes.",
        code="RATE_LIMIT_EXCEEDED",
        retry_after=300  # 5 minutes
    )
```

### Data Consistency

**Invalidation Tracking**:
```typescript
interface InvalidationState {
  planVersion: number;        // Current plan version
  prepVersion: number;        // Prep tasks version
  groceryVersion: number;     // Grocery list version
  prepInvalidated: boolean;   // Needs regeneration
  groceryInvalidated: boolean;// Needs regeneration
}

// When plan changes
planVersion++;
if (prepVersion !== planVersion) {
  prepInvalidated = true;
}
if (groceryVersion !== planVersion) {
  groceryInvalidated = true;
}
```

**Transaction Safety**:
```python
# Database transactions for multi-step operations
try:
    collab_plan = CollaborativePlan(...)
    db.add(collab_plan)
    db.flush()  # Get ID without committing

    member = PlanMember(plan_id=collab_plan.id, ...)
    db.add(member)

    db.commit()  # Atomic commit
except Exception as e:
    db.rollback()  # Rollback on failure
    raise
```

### Backup and Recovery

**Supabase Automatic Backups**:
- Daily backups (retained 7 days on free tier)
- Point-in-time recovery (Pro tier)
- Manual backups via pg_dump

**Data Export**:
```bash
# Export user data
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/user-data/export/all > backup.json

# Import user data
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @backup.json \
  http://localhost:8000/user-data/import/all
```

## Maintainability

### Code Organization

**Frontend Structure**:
```
frontend/
├── components/        # React components
├── services/          # API clients
├── hooks/             # Custom hooks
├── contexts/          # Context providers
├── config/            # Configuration
├── utils/             # Utilities
└── types.ts           # Type definitions
```

**Backend Structure**:
```
backend/
├── routers/           # API routes
├── models.py          # Database models
├── schemas.py         # Pydantic schemas
├── database.py        # DB configuration
├── supabase_auth.py   # Auth utilities
└── main.py            # FastAPI app
```

### Documentation

**Code Comments**:
```typescript
/**
 * Custom hook for cloud-synced state management.
 *
 * Automatically loads data from Supabase on mount and saves changes.
 * Handles migration from localStorage for existing users.
 *
 * @param dataType - Type of data to persist
 * @param defaultValue - Default value if no data exists
 * @returns [state, setState] tuple
 */
export function usePersistedState<T>(
  dataType: DataType,
  defaultValue: T
): [T, (value: T) => void]
```

**Architecture Documentation**:
- This document set (Arc42 + C4)
- Feature-specific guides
- API documentation (OpenAPI)
- Database schema documentation

### Testing Strategy

**Current State**:
- Manual testing in local/QA environments
- Chrome DevTools for debugging
- Supabase Studio for database inspection

**Future Enhancements**:
- Unit tests (Jest, pytest)
- Integration tests (Playwright)
- E2E tests (Cypress)
- Load testing (k6)

### Dependency Management

**Frontend**:
```json
{
  "dependencies": {
    "react": "^19.2.3",
    "@supabase/supabase-js": "^2.48.1",
    "react-ga4": "^2.1.0"
  }
}
```

**Backend**:
```toml
[project]
dependencies = [
    "fastapi>=0.115.6",
    "sqlalchemy>=2.0.36",
    "google-genai>=1.0.0"
]
```

**Update Strategy**:
- Regular dependency updates
- Security patches immediately
- Major version updates tested in QA first
- Automated vulnerability scanning (GitHub Dependabot)
