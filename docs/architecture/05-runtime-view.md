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
```

**Key Points**:
- Streaming provides progressive rendering (meals appear one by one)
- Each meal animates in smoothly (no stuttering)
- User sees first meal within 2-3 seconds
- Total time: ~15-20 seconds, but perceived as much faster

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
   │ 10. Show invalidation   │                         │                         │
   │     banner              │                         │                         │
   │<────────────────────────┤                         │                         │
```

**Key Points**:
- Natural language modification
- Invalidation tracking ensures downstream data stays consistent
- User prompted to regenerate prep tasks and grocery list

### Scenario 3: Sharing a Plan

```
┌──────┐                ┌──────────┐              ┌──────────┐              ┌─────────┐
│User A│                │ Frontend │              │  Backend │              │Supabase │
└──┬───┘                └────┬─────┘              └────┬─────┘              └────┬────┘
   │                         │                         │                         │
   │ 1. Click "Share Plan"   │                         │                         │
   ├────────────────────────>│                         │                         │
   │                         │                         │                         │
   │                         │ 2. POST /collaborative-plans/                     │
   │                         ├────────────────────────>│                         │
   │                         │                         │                         │
   │                         │                         │ 3. Generate share_id    │
   │                         │                         ├──────────────────┐      │
   │                         │                         │                  │      │
   │                         │                         │<─────────────────┘      │
   │                         │                         │                         │
   │                         │                         │ 4. INSERT collaborative_plan
   │                         │                         ├────────────────────────>│
   │                         │                         │                         │
   │                         │                         │ 5. INSERT plan_member   │
   │                         │                         │    (User A as owner)    │
   │                         │                         ├────────────────────────>│
   │                         │                         │                         │
   │                         │ 6. Share URL            │                         │
   │                         │<────────────────────────┤                         │
   │                         │                         │                         │
   │ 7. Show share modal     │                         │                         │
   │ with copy button        │                         │                         │
   │<────────────────────────┤                         │                         │
   │                         │                         │                         │
   │ 8. Copy URL             │                         │                         │
   ├────────────────────────>│                         │                         │
   │                         │                         │                         │
   │ 9. Send URL to User B   │                         │                         │
   │ (via text/email)        │                         │                         │
   ├──────────────────────────────────────────────────────────────────────────────>
   │                         │                         │                         │

┌──────┐                ┌──────────┐              ┌──────────┐              ┌─────────┐
│User B│                │ Frontend │              │  Backend │              │Supabase │
└──┬───┘                └────┬─────┘              └────┬─────┘              └────┬────┘
   │                         │                         │                         │
   │ 10. Open share URL      │                         │                         │
   ├────────────────────────>│                         │                         │
   │                         │                         │                         │
   │                         │ 11. GET /by-share-id/{id}                         │
   │                         ├────────────────────────>│                         │
   │                         │                         │                         │
   │                         │                         │ 12. SELECT plan         │
   │                         │                         ├────────────────────────>│
   │                         │                         │                         │
   │                         │                         │ 13. Plan data           │
   │                         │                         │<────────────────────────┤
   │                         │                         │                         │
   │                         │ 14. Plan data           │                         │
   │                         │<────────────────────────┤                         │
   │                         │                         │                         │
   │                         │ 15. POST /join          │                         │
   │                         ├────────────────────────>│                         │
   │                         │                         │                         │
   │                         │                         │ 16. INSERT plan_member  │
   │                         │                         │     (User B as member)  │
   │                         │                         ├────────────────────────>│
   │                         │                         │                         │
   │ 17. Show plan           │                         │                         │
   │<────────────────────────┤                         │                         │
   │                         │                         │                         │
   │ 18. Make changes        │                         │                         │
   ├────────────────────────>│                         │                         │
   │                         │                         │                         │
   │                         │ 19. PUT /collaborative-plans/{id}                 │
   │                         ├────────────────────────>│                         │
   │                         │                         │                         │
   │                         │                         │ 20. UPDATE plan         │
   │                         │                         ├────────────────────────>│
   │                         │                         │                         │
   │                         │                         │ 21. Success             │
   │                         │                         │<────────────────────────┤
   │                         │                         │                         │
   │ 22. Changes saved       │                         │                         │
   │<────────────────────────┤                         │                         │
```

**Key Points**:
- Share ID is short and readable (12-char hex)
- User B must be authenticated to access
- Both users can edit the same plan
- Changes sync on page refresh (real-time in future)

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

### Invalidation Cascade

```
User modifies meal plan
  ↓
planVersion++
  ↓
Check: prepVersion === planVersion?
  ↓ (no)
Mark: prepInvalidated = true
  ↓
Check: groceryVersion === planVersion?
  ↓ (no)
Mark: groceryInvalidated = true
  ↓
Show: Invalidation banner
  ↓
User clicks "Regenerate Prep"
  ↓
Generate new prep tasks
  ↓
prepVersion = planVersion
prepInvalidated = false
  ↓
Update: Invalidation banner
```

**Benefits**:
- Ensures data consistency
- Clear user feedback
- Prevents stale data
