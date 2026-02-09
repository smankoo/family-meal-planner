# Architecture Decision Records (ADRs)

## ADR-001: Use Streaming for LLM Responses

**Status**: Accepted
**Date**: 2026-01-15
**Context**: Initial implementation used batch responses, resulting in 15-20 second wait times with no user feedback.

**Decision**: Implement Server-Sent Events (SSE) for streaming LLM responses meal-by-meal.

**Consequences**:
- ✅ Reduced perceived latency from 15-20s to 2-3s
- ✅ Improved user experience with progressive rendering
- ✅ Maintained app responsiveness during generation
- ❌ Increased complexity in parsing partial JSON
- ❌ More complex state management
- ❌ Requires fallback to batch mode if streaming fails

**Alternatives Considered**:
- WebSockets: More complex, overkill for one-way streaming
- Polling: Higher latency, more server load
- Batch only: Poor UX, long wait times

---

## ADR-002: Supabase for Authentication

**Status**: Accepted
**Date**: 2026-01-10
**Context**: Need production-grade authentication with OAuth support.

**Decision**: Use Supabase Auth instead of building custom authentication.

**Consequences**:
- ✅ Free tier supports 50K MAU
- ✅ Built-in OAuth (Google, Apple)
- ✅ JWT-based with automatic refresh
- ✅ Includes database and real-time capabilities
- ✅ Production-ready security (RLS, encryption)
- ❌ Vendor lock-in to Supabase
- ❌ Limited customization of auth UI
- ❌ Requires internet connection

**Alternatives Considered**:
- Auth0: More expensive ($25/month minimum)
- Firebase Auth: Good but wanted PostgreSQL
- Custom auth: Too much work, security risks

---

## ADR-003: Cloud-First Data Persistence

**Status**: Accepted
**Date**: 2026-01-29
**Context**: Initial implementation used localStorage with optional cloud sync, causing sync conflicts.

**Decision**: Use Supabase as single source of truth, remove localStorage dependencies.

**Consequences**:
- ✅ Enables cross-device synchronization
- ✅ Eliminates sync conflicts
- ✅ Provides automatic backups
- ✅ Simplifies codebase (no dual persistence)
- ❌ Requires authentication for data persistence
- ❌ Network dependency (limited offline support)
- ❌ Slightly higher latency than localStorage

**Alternatives Considered**:
- Dual persistence: Complex, sync conflicts
- localStorage only: No cross-device sync
- IndexedDB: More complex, still local only

---

## ADR-004: Centralized Theme System

**Status**: Accepted
**Date**: 2026-01-25
**Context**: Hardcoded styling scattered across components, difficult to maintain consistency.

**Decision**: Implement CSS variables + Tailwind extensions for centralized theme system.

**Consequences**:
- ✅ Single source of truth for design tokens
- ✅ Easy theme switching (dark mode ready)
- ✅ Consistent styling across components
- ✅ Reduced code duplication
- ❌ Initial setup overhead
- ❌ Learning curve for team
- ❌ Some Tailwind features limited with CSS variables

**Alternatives Considered**:
- CSS Modules: More boilerplate, harder to theme
- Styled Components: Runtime overhead, harder to theme
- Plain CSS: Too much duplication

---

## ADR-005: FastAPI for Backend

**Status**: Accepted
**Date**: 2026-01-05
**Context**: Need async-capable backend with streaming support.

**Decision**: Use FastAPI instead of Express.js or Django.

**Consequences**:
- ✅ Native async/await support
- ✅ Automatic API documentation (OpenAPI)
- ✅ Excellent performance (comparable to Node.js)
- ✅ Type safety with Pydantic
- ✅ Built-in streaming support
- ❌ Python ecosystem less mature than Node.js for some tasks
- ❌ Team needs Python knowledge

**Alternatives Considered**:
- Express.js: Less type-safe, more boilerplate
- Django: Overkill for API-only backend, less async support
- Flask: Less modern, no native async

---

## ADR-006: Monorepo Structure

**Status**: Accepted
**Date**: 2026-01-01
**Context**: Need to manage frontend and backend code together.

**Decision**: Use monorepo with separate frontend and backend folders.

**Consequences**:
- ✅ Simplified development workflow
- ✅ Shared types and constants
- ✅ Atomic commits across stack
- ✅ Easier local development setup
- ❌ Larger repository size
- ❌ Requires coordination for deployments
- ❌ Shared dependencies can cause conflicts

**Alternatives Considered**:
- Separate repos: More complex, harder to sync changes
- Nx/Turborepo: Overkill for small team
- Lerna: Deprecated, not recommended

---

## ADR-007: Multi-Environment Strategy

**Status**: Accepted
**Date**: 2026-01-20
**Context**: Need to test changes safely before production.

**Decision**: Implement separate environments for local, QA, and production.

**Consequences**:
- ✅ Prevents production data contamination
- ✅ Enables safe testing of changes
- ✅ Supports continuous deployment to QA
- ✅ Manual gate for production releases
- ❌ Higher infrastructure complexity
- ❌ Multiple sets of credentials to manage
- ❌ Increased testing overhead

**Alternatives Considered**:
- Single environment: Too risky, no testing isolation
- Local + Production only: No QA testing environment
- Feature flags: More complex, still need separate databases

---

## ADR-008: Render.com for Hosting

**Status**: Accepted
**Date**: 2026-01-15
**Context**: Need cost-effective hosting with simple deployment.

**Decision**: Use Render.com for frontend and backend hosting.

**Consequences**:
- ✅ Simple deployment (Blueprint YAML)
- ✅ Auto-deploy from GitHub
- ✅ Free tier for development
- ✅ Affordable production pricing
- ✅ Built-in SSL and CDN
- ❌ Less mature than AWS/GCP
- ❌ Limited customization options
- ❌ Occasional cold starts on free tier

**Alternatives Considered**:
- Vercel: Great for frontend, but backend more expensive
- AWS: Too complex for small team
- Heroku: More expensive, less modern
- DigitalOcean: More manual setup required

---

## ADR-009: Direct DOM Manipulation for Streaming Animations

**Status**: Accepted
**Date**: 2026-01-18
**Context**: React re-renders caused stuttering during streaming animations.

**Decision**: Use direct DOM manipulation for streaming animations instead of React state updates.

**Consequences**:
- ✅ Smooth animations without stuttering
- ✅ Better performance during streaming
- ✅ Only newly received content animates
- ❌ Breaks React's declarative paradigm
- ❌ Requires careful ref management
- ❌ Harder to test

**Alternatives Considered**:
- React state only: Caused stuttering
- CSS-only animations: Couldn't target new content
- Web Animations API: More complex, similar result

---

## ADR-010: JSONB for Flexible Data Storage

**Status**: Accepted
**Date**: 2026-01-28
**Context**: Meal plan structure evolves frequently, need flexible schema.

**Decision**: Use PostgreSQL JSONB columns for meal plans and user data.

**Consequences**:
- ✅ Flexible schema for evolving data structures
- ✅ No migrations needed for data structure changes
- ✅ Efficient querying with JSONB operators
- ✅ Maintains relational benefits (RLS, transactions)
- ❌ Less type safety at database level
- ❌ Harder to enforce data constraints
- ❌ Potential for inconsistent data structures

**Alternatives Considered**:
- Strict relational schema: Too rigid, frequent migrations
- NoSQL (MongoDB): Lose RLS and transaction benefits
- Hybrid approach: More complex, harder to maintain

---

## ADR-011: Request Batching in Data Service

**Status**: Accepted
**Date**: 2026-01-30
**Context**: Multiple components loading data simultaneously overwhelmed backend.

**Decision**: Implement request batching with max 3 concurrent requests.

**Consequences**:
- ✅ Prevents overwhelming backend
- ✅ Improves perceived performance
- ✅ Reduces database load
- ✅ Better error handling
- ❌ Slightly higher latency for queued requests
- ❌ More complex implementation
- ❌ Requires careful queue management

**Alternatives Considered**:
- No batching: Overwhelmed backend
- Single request for all data: Slower, all-or-nothing
- GraphQL: Overkill for current needs

---

## ADR-012: Collaborative Plans with Share IDs

**Status**: Accepted
**Date**: 2026-02-03
**Context**: Users want to share meal plans with family members.

**Decision**: Implement collaborative plans with short, readable share IDs (12-char hex).

**Consequences**:
- ✅ Simple URL sharing
- ✅ No email required for sharing
- ✅ Role-based access control
- ✅ Real-time collaboration ready
- ❌ Share IDs are guessable (low probability)
- ❌ No expiration mechanism (yet)
- ❌ No access revocation (yet)

**Alternatives Considered**:
- Email invitations: More complex, requires email
- UUID share IDs: Too long, not user-friendly
- Public plans: Security concerns
- Real-time sync: More complex, future enhancement

---

## ADR-013: Optimize Meal Replacement Prompt Size

**Status**: Accepted
**Date**: 2026-02-08
**Context**: Meal replacement was taking 8-30 seconds inconsistently. Investigation revealed the LLM prompt was sending the entire week's meal plan (~3000 characters, 28 meals with full descriptions) when only meal names were needed for variety checking.

**Decision**: Optimize the `/api/replace-meal` endpoint to send only meal names instead of full meal objects, reducing prompt size by ~80%.

**Consequences**:
- ✅ Reduced average latency from 14.9s to 5.4s (64% improvement)
- ✅ More consistent performance (4.9-6.4s range vs 9-23s)
- ✅ 60% reduction in API costs per request
- ✅ Maintained full quality and variety checking
- ✅ Improved user experience significantly
- ❌ Slightly less context for LLM (acceptable trade-off)

**Implementation Details**:
```python
# Before: ~3000 characters
prompt = f"""
Full week context (for variety):
{json.dumps(request.currentPlan)}  # All 28 meals with descriptions
"""

# After: ~1600 characters (80% reduction)
meal_names_in_week = [f"{day} {type}: {meal['name']}"
                      for day in plan for type, meal in day['meals'].items()]
prompt = f"""
Other meals this week (avoid duplicates):
{'\n'.join(meal_names_in_week)}  # Just names
"""
```

**Performance Metrics**:
- Breakfast replacement: 22.6s → 4.9s (78% faster)
- Dinner replacement: 13.0s → 6.4s (51% faster)
- Snack replacement: 9.1s → 5.0s (45% faster)

**Alternatives Considered**:
- Streaming response: Would help perceived latency but not actual latency
- Caching: Wouldn't help first-time replacements
- Faster model: Would reduce quality
- No variety checking: Would reduce quality

**Related**: See PERFORMANCE_ANALYSIS.md for detailed benchmarking data.

---

## ADR-014: Automatic Background Data Generation

**Status**: Accepted
**Date**: 2026-02-09
**Context**: Users had to manually progress through tabs (Meals → Prep → Grocery) by clicking large pill buttons at the bottom of each screen. This created an artificial, video-game-like progression that didn't match user expectations. Users often wanted to jump directly to a specific tab or spend time in just one view without being prompted to move forward.

**Decision**: Remove manual progression buttons and implement automatic background generation of prep plans and grocery lists. All tabs become freely accessible once a meal plan exists, with data generating transparently in the background.

**Consequences**:
- ✅ **Apple-like UX**: Everything "just works" without user intervention
- ✅ **Zero waiting**: Users never blocked by data generation
- ✅ **Free navigation**: All tabs accessible anytime, no forced progression
- ✅ **Transparent processing**: Background generation is silent and non-blocking
- ✅ **Graceful degradation**: Errors fail silently without disrupting user flow
- ✅ **Progressive enhancement**: Data streams in as it becomes available
- ✅ **Automatic invalidation**: Changes to meal plan trigger background regeneration
- ❌ **Increased complexity**: More state management for background processes
- ❌ **Hidden processing**: Users may not realize data is being generated
- ❌ **Resource usage**: Background generation consumes API quota even if user doesn't view tabs

**Implementation Details**:
```typescript
// Background generation functions
const generatePrepPlanInBackground = async (mealPlan: WeekPlan) => {
  if (isPrepGenerating || !isPrepPlanInvalidated()) return;

  setIsPrepGenerating(true);
  await generateMealPrepPlanStream(
    mealPlan,
    onTaskReceived,
    () => {
      setIsPrepGenerating(false);
      // Chain to grocery generation
      generateGroceryListInBackground(mealPlan, tasks);
    },
    onError // Silent failure
  );
};

// Triggered automatically on meal plan completion
onMealPlanComplete: () => {
  generatePrepPlanInBackground(completedPlan);
}

// Triggered automatically on meal replacement
onMealReplaced: () => {
  generatePrepPlanInBackground(updatedPlan);
}
```

**User Experience Flow**:
1. User generates meal plan → Prep generation starts in background
2. Prep completes → Grocery generation starts in background
3. User can switch to any tab anytime:
   - If data ready: Shows immediately
   - If generating: Shows elegant loading state with streaming updates
4. User replaces a meal → Prep and grocery regenerate automatically in background

**Alternatives Considered**:
- **Manual progression with buttons**: Original implementation, felt forced and game-like
- **Generate on tab switch**: Would cause waiting when switching tabs
- **Pre-generate everything**: Would waste API quota if user doesn't view all tabs
- **Notification-based**: Would interrupt user flow with notifications

**Performance Impact**:
- Prep generation: ~8-12 seconds (background, non-blocking)
- Grocery generation: ~6-10 seconds (background, non-blocking)
- Total: ~14-22 seconds, but user never waits
- API cost: Same as before, just automatic instead of manual

**Related Changes**:
- Removed bottom pill buttons ("Prep Strategy", "Shopping List", "ALL DONE")
- Updated `StageStepper` to make all tabs clickable once meal plan exists
- Added `isPrepGenerating` and `isGroceryGenerating` state flags
- Updated loading states in `MealPrepView` and `GroceryListView` to handle background generation

---

## Technical Debt Register

### High Priority

**1. Add Automated Testing**
- **Issue**: No unit or integration tests
- **Impact**: Regressions not caught early
- **Effort**: High (2-3 weeks)
- **Plan**: Start with critical paths (auth, data persistence)

**2. Implement Real-time Collaboration**
- **Issue**: Collaborative plans only sync on refresh
- **Impact**: Poor UX for simultaneous editing
- **Effort**: Medium (1-2 weeks)
- **Plan**: Use Supabase Realtime subscriptions

**3. Add Offline Support**
- **Issue**: App requires internet connection
- **Impact**: Poor UX in low-connectivity areas
- **Effort**: High (3-4 weeks)
- **Plan**: Service workers + IndexedDB cache

### Medium Priority

**4. Optimize Bundle Size**
- **Issue**: Initial bundle ~500KB
- **Impact**: Slower initial load
- **Effort**: Low (2-3 days)
- **Plan**: Code splitting, lazy loading

**5. Add Rate Limiting**
- **Issue**: No backend rate limiting
- **Impact**: Potential abuse
- **Effort**: Low (1-2 days)
- **Plan**: Use FastAPI rate limiting middleware

**6. Implement Caching**
- **Issue**: No caching layer
- **Impact**: Higher database load
- **Effort**: Medium (1 week)
- **Plan**: Redis for frequently accessed data

### Low Priority

**7. Add Dark Mode**
- **Issue**: Only light mode available
- **Impact**: User preference
- **Effort**: Low (2-3 days)
- **Plan**: Theme system already supports it

**8. Improve Error Messages**
- **Issue**: Some errors are too technical
- **Impact**: User confusion
- **Effort**: Low (1-2 days)
- **Plan**: Review and improve error messages

**9. Add User Preferences**
- **Issue**: No app-level preferences
- **Impact**: Limited customization
- **Effort**: Low (2-3 days)
- **Plan**: Add preferences table and UI

---

## Future Enhancements

### Planned Features

**1. Recipe Details**
- Detailed cooking instructions
- Ingredient measurements
- Cooking time estimates
- Nutritional information

**2. Meal History**
- Track past meal plans
- Favorite meals
- Meal ratings
- Reuse previous plans

**3. Shopping Integration**
- Export to grocery apps
- Price estimation
- Store availability
- Delivery integration

**4. Social Features**
- Share meal plans publicly
- Browse community plans
- Follow other users
- Recipe collections

**5. Mobile App**
- Native iOS app
- Native Android app
- Offline support
- Push notifications

### Research Needed

**1. Voice Interface**
- Voice commands for meal planning
- Hands-free cooking mode
- Integration with smart speakers

**2. Computer Vision**
- Photo-based meal logging
- Ingredient recognition
- Portion size estimation

**3. Nutritional Analysis**
- Calorie tracking
- Macro/micro nutrients
- Dietary goal tracking
- Health recommendations
