# Runtime View

## Key Scenarios

### Scenario 1: User Sign-Up and First Meal Plan

```
┌──────┐                ┌──────────┐              ┌──────────┐              ┌─────────┐
│ User │                │ Frontend │              │  Backend │              │Supabase │
└──┬───┘                └────┬─────┘              └────┬─────┘              └────┬────┘
   │                         │                         │                         │
   │ 1. Click "Sign Up"      │                         │                         │
   ├────────────────────────>│                         │                         │
   │                         │                         │                         │
   │                         │ 2. signUpWithEmail()    │                         │
   │                         ├────────────────────────────────────────────────────>│
   │                         │                         │                         │
   │                         │ 3. JWT token            │                         │
   │                         │<────────────────────────────────────────────────────┤
   │                         │                         │                         │
   │ 4. Show family setup    │                         │                         │
   │<────────────────────────┤                         │                         │
   │                         │                         │                         │
   │ 5. Enter family info    │                         │                         │
   ├────────────────────────>│                         │                         │
   │                         │                         │                         │
   │                         │ 6. Save family data     │                         │
   │                         ├────────────────────────>│                         │
   │                         │                         │                         │
   │                         │                         │ 7. INSERT user_data     │
   │                         │                         ├────────────────────────>│
   │                         │                         │                         │
   │                         │                         │ 8. Success              │
   │                         │                         │<────────────────────────┤
   │                         │                         │                         │
   │                         │ 9. Success              │                         │
   │                         │<────────────────────────┤                         │
   │                         │                         │                         │
   │ 10. Click "Generate"    │                         │                         │
   ├────────────────────────>│                         │                         │
   │                         │                         │                         │
   │                         │ 11. POST /generate-plan-stream                    │
   │                         ├────────────────────────>│                         │
   │                         │                         │                         │
   │                         │                         │ 12. Call Gemini API     │
   │                         │                         ├──────────────────┐      │
   │                         │                         │                  │      │
   │                         │ 13. SSE: Meal 1         │<─────────────────┘      │
   │                         │<────────────────────────┤                         │
   │                         │                         │                         │
   │ 14. Show Meal 1         │                         │                         │
   │<────────────────────────┤                         │                         │
   │                         │                         │                         │
   │                         │ 15. SSE: Meal 2         │                         │
   │                         │<────────────────────────┤                         │
   │                         │                         │                         │
   │ 16. Show Meal 2         │                         │                         │
   │<────────────────────────┤                         │                         │
   │                         │                         │                         │
   │                         │ ... (28 meals total)    │                         │
   │                         │                         │                         │
   │                         │ 17. SSE: Complete       │                         │
   │                         │<────────────────────────┤                         │
   │                         │                         │                         │
   │                         │ 18. Save meal plan      │                         │
   │                         ├────────────────────────>│                         │
   │                         │                         │                         │
   │                         │                         │ 19. INSERT user_data    │
   │                         │                         ├────────────────────────>│
   │                         │                         │                         │
   │ 20. Show complete plan  │                         │                         │
   │<────────────────────────┤                         │                         │
   │                         │                         │                         │
   │                         │ 21. Auto-start prep     │                         │
   │                         │     generation (bg)     │                         │
   │                         ├────────────────────────>│                         │
   │                         │                         │                         │
   │                         │ 22. SSE: Prep tasks     │                         │
   │                         │<────────────────────────┤                         │
   │                         │                         │                         │
   │                         │ 23. Auto-start grocery  │                         │
   │                         │     generation (bg)     │                         │
   │                         ├────────────────────────>│                         │
   │                         │                         │                         │
   │                         │ 24. SSE: Grocery items  │                         │
   │                         │<────────────────────────┤                         │
```

**Key Points**:
- Streaming provides progressive rendering (meals appear one by one)
- Each meal animates in smoothly (no stuttering)
- User sees first meal within 2-3 seconds
- Total time: ~15-20 seconds, but perceived as much faster
- **Prep and grocery generation happen automatically in background**
- **User can navigate to any tab immediately - no forced progression**
- **Background generation is transparent and non-blocking**

### Scenario 2: Modifying Plan via Chat

```
┌──────┐                ┌──────────┐              ┌──────────┐              ┌─────────┐
│ User │                │ Frontend │              │  Backend │              │ Gemini  │
└──┬───┘                └────┬─────┘              └────┬─────┘              └────┬────┘
   │                         │                         │                         │
   │ 1. Open chat            │                         │                         │
   ├────────────────────────>│                         │                         │
   │                         │                         │                         │
   │ 2. Type message         │                         │                         │
   │ "Make Monday vegetarian"│                         │                         │
   ├────────────────────────>│                         │                         │
   │                         │                         │                         │
   │                         │ 3. POST /update-plan    │                         │
   │                         ├────────────────────────>│                         │
   │                         │                         │                         │
   │                         │                         │ 4. Call Gemini          │
   │                         │                         ├────────────────────────>│
   │                         │                         │                         │
   │                         │                         │ 5. Updated plan JSON    │
   │                         │                         │<────────────────────────┤
   │                         │                         │                         │
   │                         │ 6. Updated plan         │                         │
   │                         │<────────────────────────┤                         │
   │                         │                         │                         │
   │ 7. Show updated meals   │                         │                         │
   │ (with animation)        │                         │                         │
   │<────────────────────────┤                         │                         │
   │                         │                         │                         │
   │                         │ 8. Save updated plan    │                         │
   │                         ├────────────────────────>│                         │
   │                         │                         │                         │
   │                         │ 9. Mark prep/grocery    │                         │
   │                         │    as invalidated       │                         │
   │                         ├────────────────────────>│                         │
   │                         │                         │                         │
   │                         │ 10. Auto-regenerate     │                         │
   │                         │     prep/grocery (bg)   │                         │
   │                         ├────────────────────────>│                         │
   │                         │                         │                         │
   │ 11. Show updated meals  │                         │                         │
   │ (prep/grocery updating  │                         │                         │
   │  transparently in bg)   │                         │                         │
   │<────────────────────────┤                         │                         │
```

**Key Points**:
- Natural language modification
- Invalidation tracking ensures downstream data stays consistent
- **Prep and grocery automatically regenerate in background**
- **No user action required - seamless experience**

### Scenario 3: Family Plan Sharing with Real-Time Sync

```
┌──────┐                ┌──────────┐              ┌──────────┐              ┌─────────┐
│User A│                │ Frontend │              │  Backend │              │Supabase │
└──┬───┘                └────┬─────┘              └────┬─────┘              └────┬────┘
   │                         │                         │                         │
   │ 1. Click "Invite"       │                         │                         │
   ├────────────────────────>│                         │                         │
   │                         │                         │                         │
   │                         │ 2. POST /family-plans/  │                         │
   │                         ├────────────────────────>│                         │
   │                         │                         │                         │
   │                         │                         │ 3. Generate invite code │
   │                         │                         ├──────────────────┐      │
   │                         │                         │<─────────────────┘      │
   │                         │                         │                         │
   │                         │                         │ 4. INSERT plan + member │
   │                         │                         ├────────────────────────>│
   │                         │                         │                         │
   │                         │ 5. Plan + invite URL    │                         │
   │                         │<────────────────────────┤                         │
   │                         │                         │                         │
   │ 6. Show invite modal    │                         │                         │
   │<────────────────────────┤                         │                         │
   │                         │                         │                         │
   │                         │ 7. Subscribe broadcast  │                         │
   │                         │    channel: family_plan:{id}                      │
   │                         ├────────────────────────────────────────────────────>│
   │                         │                         │                         │

┌──────┐                ┌──────────┐              ┌──────────┐              ┌─────────┐
│User B│                │ Frontend │              │  Backend │              │Supabase │
└──┬───┘                └────┬─────┘              └────┬─────┘              └────┬────┘
   │                         │                         │                         │
   │ 8. Open invite URL      │                         │                         │
   ├────────────────────────>│                         │                         │
   │                         │                         │                         │
   │                         │ 9. GET /by-invite-code/{code}                     │
   │                         ├────────────────────────>│                         │
   │                         │                         │                         │
   │                         │ 10. POST /join          │                         │
   │                         ├────────────────────────>│                         │
   │                         │                         │                         │
   │ 11. Show plan           │                         │                         │
   │<────────────────────────┤                         │                         │
   │                         │                         │                         │
   │                         │ 12. Subscribe broadcast │                         │
   │                         │     channel: family_plan:{id}                     │
   │                         ├────────────────────────────────────────────────────>│
   │                         │                         │                         │
   │ 13. Replace a meal      │                         │                         │
   ├────────────────────────>│                         │                         │
   │                         │                         │                         │
   │                         │ 14. PUT /family-plans/{id}                        │
   │                         ├────────────────────────>│                         │
   │                         │                         │                         │
   │                         │                         │ 15. UPDATE plan in DB   │
   │                         │                         ├────────────────────────>│
   │                         │                         │                         │
   │                         │                         │ 16. POST /realtime/     │
   │                         │                         │     broadcast (async)   │
   │                         │                         ├────────────────────────>│
   │                         │                         │                         │
   │                         │                         │ 17. Broadcast to        │
   │                         │                         │     all subscribers     │
   │                         │                         │         ┌───────────────┤
   │                         │                         │         │               │
   │                         │                         │         ▼               │
   │                         │                         │   User A's Frontend     │
   │                         │                         │   receives broadcast    │
   │                         │                         │                         │
```

User A receives the broadcast, `handleRemoteData` filters out self-updates via `modified_by`, applies the change, and shows a toast.

**Key Points**:
- Invite code is a full UUID for uniqueness
- Real-time updates via Supabase Broadcast REST API (not WebSocket from backend)
- Backend broadcasts as fire-and-forget via `BackgroundTasks`
- 30s poll as safety net catches any missed broadcasts
- `activePlanId` persisted so sync survives page refresh
- Self-update filtering prevents echo loops

### Scenario 4: Cross-Device Synchronization

```
┌──────────┐            ┌──────────┐              ┌──────────┐              ┌─────────┐
│ Desktop  │            │ Frontend │              │  Backend │              │Supabase │
└────┬─────┘            └────┬─────┘              └────┬─────┘              └────┬────┘
     │                       │                         │                         │
     │ 1. User logs in       │                         │                         │
     ├──────────────────────>│                         │                         │
     │                       │                         │                         │
     │                       │ 2. Load all data types  │                         │
     │                       ├────────────────────────>│                         │
     │                       │                         │                         │
     │                       │                         │ 3. SELECT user_data     │
     │                       │                         ├────────────────────────>│
     │                       │                         │                         │
     │                       │                         │ 4. All user data        │
     │                       │                         │<────────────────────────┤
     │                       │                         │                         │
     │                       │ 5. All user data        │                         │
     │                       │<────────────────────────┤                         │
     │                       │                         │                         │
     │ 6. Show meal plan     │                         │                         │
     │<──────────────────────┤                         │                         │
     │                       │                         │                         │
     │ 7. Make changes       │                         │                         │
     ├──────────────────────>│                         │                         │
     │                       │                         │                         │
     │                       │ 8. Save changes         │                         │
     │                       ├────────────────────────>│                         │
     │                       │                         │                         │
     │                       │                         │ 9. UPDATE user_data     │
     │                       │                         ├────────────────────────>│
     │                       │                         │                         │

┌──────────┐            ┌──────────┐              ┌──────────┐              ┌─────────┐
│  Mobile  │            │ Frontend │              │  Backend │              │Supabase │
└────┬─────┘            └────┬─────┘              └────┬─────┘              └────┬────┘
     │                       │                         │                         │
     │ 10. User logs in      │                         │                         │
     │ (same account)        │                         │                         │
     ├──────────────────────>│                         │                         │
     │                       │                         │                         │
     │                       │ 11. Load all data types │                         │
     │                       ├────────────────────────>│                         │
     │                       │                         │                         │
     │                       │                         │ 12. SELECT user_data    │
     │                       │                         ├────────────────────────>│
     │                       │                         │                         │
     │                       │                         │ 13. Updated data        │
     │                       │                         │ (includes desktop changes)
     │                       │                         │<────────────────────────┤
     │                       │                         │                         │
     │                       │ 14. Updated data        │                         │
     │                       │<────────────────────────┤                         │
     │                       │                         │                         │
     │ 15. Show updated plan │                         │                         │
     │ (with desktop changes)│                         │                         │
     │<──────────────────────┤                         │                         │
```

**Key Points**:
- Single source of truth in Supabase
- No localStorage dependencies
- Changes sync automatically on login
- Works across any number of devices

### Scenario 5: Error Handling - Rate Limit

```
┌──────┐                ┌──────────┐              ┌──────────┐              ┌─────────┐
│ User │                │ Frontend │              │  Backend │              │ Gemini  │
└──┬───┘                └────┬─────┘              └────┬─────┘              └────┬────┘
   │                         │                         │                         │
   │ 1. Generate plan        │                         │                         │
   ├────────────────────────>│                         │                         │
   │                         │                         │                         │
   │                         │ 2. POST /generate-plan-stream                     │
   │                         ├────────────────────────>│                         │
   │                         │                         │                         │
   │                         │                         │ 3. Call Gemini          │
   │                         │                         ├────────────────────────>│
   │                         │                         │                         │
   │                         │                         │ 4. 429 Rate Limit       │
   │                         │                         │<────────────────────────┤
   │                         │                         │                         │
   │                         │ 5. 429 with retry_after │                         │
   │                         │<────────────────────────┤                         │
   │                         │                         │                         │
   │ 6. Show error toast     │                         │                         │
   │ "Rate limit exceeded.   │                         │                         │
   │  Retry in 5 minutes"    │                         │                         │
   │<────────────────────────┤                         │                         │
   │                         │                         │                         │
   │ 7. Click "Retry"        │                         │                         │
   │ (after 5 minutes)       │                         │                         │
   ├────────────────────────>│                         │                         │
   │                         │                         │                         │
   │                         │ 8. POST /generate-plan-stream                     │
   │                         ├────────────────────────>│                         │
   │                         │                         │                         │
   │                         │                         │ 9. Call Gemini          │
   │                         │                         ├────────────────────────>│
   │                         │                         │                         │
   │                         │                         │ 10. Success             │
   │                         │                         │<────────────────────────┤
   │                         │                         │                         │
   │ 11. Show meal plan      │                         │                         │
   │<────────────────────────┤                         │                         │
```

**Key Points**:
- Graceful error handling
- Clear user feedback
- Retry mechanism available
- App remains functional

## Data Flow Patterns

### Request Batching (Data Service)

```
Component A: loadData('family')      ─┐
Component B: loadData('preferences') ─┼─> Queue
Component C: loadData('meal_plan')   ─┘
                                      │
                                      ▼
                              Process Queue
                              (max 3 concurrent)
                                      │
                                      ▼
                              Backend API
                              (3 parallel requests)
                                      │
                                      ▼
                              Supabase Database
```

**Benefits**:
- Prevents overwhelming backend
- Improves perceived performance
- Reduces database load

### Streaming Parser

```
SSE Event: {"day": "Monday", "meals": {
  ↓
Parse Attempt 1: Try complete JSON
  ↓ (fails - incomplete)
Parse Attempt 2: Try array extraction
  ↓ (fails - not array yet)
Parse Attempt 3: Try object extraction
  ↓ (success!)
Extract: { day: "Monday", meals: {...} }
  ↓
Update UI: Show Monday's meals
  ↓
Animate: Smooth fade-in
```

**Benefits**:
- Progressive rendering
- Handles partial JSON
- Multiple fallback strategies
- Smooth animations

### Background Generation & Auto-Invalidation

```
User generates/modifies meal plan
  ↓
planVersion++
  ↓
Trigger: generatePrepPlanInBackground()
  ↓
  ├─> Check: Already generating? → Skip
  ├─> Check: Prep current? → Skip
  └─> Start: Background prep generation
        ↓
        Stream prep tasks (non-blocking)
        ↓
        On complete: prepVersion = planVersion
        ↓
        Trigger: generateGroceryListInBackground()
          ↓
          Stream grocery items (non-blocking)
          ↓
          On complete: groceryVersion = planVersion
```

**User Experience**:
```
User on Meal Plan tab
  ↓
Meal plan completes
  ↓
User switches to Prep tab
  ↓
  ├─> If prep ready: Show data immediately
  └─> If prep generating: Show elegant loading state
        ↓
        Tasks stream in progressively
        ↓
        Smooth animations
```

**Benefits**:
- **Zero waiting** - user never blocked
- **Transparent processing** - happens in background
- **Graceful degradation** - errors are silent
- **Free navigation** - all tabs accessible anytime
- **Apple-like UX** - everything just works
