# Streaming LLM Integration

## Overview

The Family Meal Planner uses **Server-Sent Events (SSE)** for streaming LLM responses from Google Gemini. This provides progressive rendering of meal plans, reducing perceived latency from 15-20 seconds to 2-3 seconds.

## Architecture

### Batch vs Streaming

**Batch (Before)**:
```
User clicks "Generate" → Wait 15-20s → All 28 meals appear at once
```

**Streaming (After)**:
```
User clicks "Generate" → 2-3s → First meal appears → Meals stream in one by one
```

### Flow Diagram

```
┌──────┐         ┌──────────┐         ┌──────────┐         ┌─────────┐
│ User │         │ Frontend │         │  Backend │         │ Gemini  │
└──┬───┘         └────┬─────┘         └────┬─────┘         └────┬────┘
   │                  │                     │                     │
   │ 1. Generate Plan │                     │                     │
   ├─────────────────>│                     │                     │
   │                  │                     │                     │
   │                  │ 2. POST /generate-plan-stream             │
   │                  ├────────────────────>│                     │
   │                  │                     │                     │
   │                  │                     │ 3. Stream request   │
   │                  │                     ├────────────────────>│
   │                  │                     │                     │
   │                  │ 4. SSE: Meal 1      │ 5. Chunk 1          │
   │                  │<────────────────────┤<────────────────────┤
   │                  │                     │                     │
   │ 6. Show Meal 1   │                     │                     │
   │<─────────────────┤                     │                     │
   │                  │                     │                     │
   │                  │ 7. SSE: Meal 2      │ 8. Chunk 2          │
   │                  │<────────────────────┤<────────────────────┤
   │                  │                     │                     │
   │ 9. Show Meal 2   │                     │                     │
   │<─────────────────┤                     │                     │
   │                  │                     │                     │
   │                  │ ... (28 meals total)│                     │
   │                  │                     │                     │
   │                  │ 10. SSE: Complete   │                     │
   │                  │<────────────────────┤                     │
   │                  │                     │                     │
   │ 11. Plan Complete│                     │                     │
   │<─────────────────┤                     │                     │
```

## Implementation

### Backend (FastAPI)

**Location**: `backend/main.py`

```python
@app.post("/api/generate-plan-stream")
async def generate_plan_stream(request: MealPlanRequest):
    """Stream meal plan generation meal-by-meal."""

    async def event_generator():
        try:
            # Configure Gemini for streaming
            model = genai.GenerativeModel("gemini-2.0-flash-exp")

            # Build prompt
            prompt = build_meal_plan_prompt(
                request.family,
                request.preferences
            )

            # Stream response
            response = model.generate_content(
                prompt,
                stream=True
            )

            buffer = ""
            for chunk in response:
                if chunk.text:
                    buffer += chunk.text

                    # Try to parse complete meals
                    meals = extract_meals_from_buffer(buffer)

                    for meal in meals:
                        # Send each meal as SSE event
                        yield f"data: {json.dumps(meal)}\n\n"

            # Send completion event
            yield "data: {\"status\": \"complete\"}\n\n"

        except Exception as e:
            logger.error(f"Streaming error: {e}")
            yield f"data: {{\"error\": \"{str(e)}\"}}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream"
    )
```

**Key Features**:
- Async generator for streaming
- Progressive JSON parsing
- Error handling with fallback
- Completion event

### Frontend (React)

**Location**: `frontend/services/geminiService.ts`

```typescript
export async function generateInitialMealPlanStream(
  family: FamilyMember[],
  preferences: FamilyPreferences,
  onMealReceived: (meal: DayPlan) => void,
  onComplete: (plan: WeekPlan) => void,
  onError: (error: Error) => void
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/generate-plan-stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(await getAuthHeaders())
    },
    body: JSON.stringify({ family, preferences })
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  let buffer = '';
  const receivedMeals: DayPlan[] = [];

  while (true) {
    const { done, value } = await reader!.read();

    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Process complete SSE events
    const events = buffer.split('\n\n');
    buffer = events.pop() || ''; // Keep incomplete event

    for (const event of events) {
      if (!event.startsWith('data: ')) continue;

      const data = event.slice(6); // Remove 'data: '

      try {
        const parsed = JSON.parse(data);

        if (parsed.status === 'complete') {
          onComplete(receivedMeals);
          return;
        }

        if (parsed.error) {
          onError(new Error(parsed.error));
          return;
        }

        // Valid meal received
        receivedMeals.push(parsed);
        onMealReceived(parsed);

      } catch (e) {
        console.warn('Failed to parse SSE event:', e);
      }
    }
  }
}
```

**Key Features**:
- ReadableStream processing
- Progressive event parsing
- Callback-based updates
- Error handling

### UI Integration

**Location**: `frontend/App.tsx`

```typescript
const handleGenerateInitialPlan = async () => {
  setIsLoading(true);
  setNewlyReceivedCards(new Set());

  try {
    await generateInitialMealPlanStream(
      family,
      preferences,
      // Callback: Meal received
      (meal: DayPlan) => {
        setPlanHistory(prev => {
          const updated = [...prev.present, meal];
          return { ...prev, present: updated };
        });

        // Mark as newly received for animation
        setNewlyReceivedCards(prev => new Set([...prev, meal.day]));
      },
      // Callback: Complete
      (plan: WeekPlan) => {
        setPlanHistory({ past: [], present: plan, future: [] });
        setHasPlanGenerated(true);
        setIsLoading(false);
        showToast('Meal plan generated!', 'success');
      },
      // Callback: Error
      (error: Error) => {
        console.error('Streaming failed:', error);
        setIsLoading(false);
        showToast('Failed to generate plan', 'error');
      }
    );
  } catch (error) {
    // Fallback to batch mode
    console.warn('Streaming failed, falling back to batch');
    await generateInitialPlanBatch();
  }
};
```

## Animation System

### Direct DOM Manipulation

To avoid React re-render stuttering, we use direct DOM manipulation for animations:

```typescript
// Track newly received items
const [newlyReceivedCards, setNewlyReceivedCards] = useState<Set<string>>(new Set());

// Refs for direct DOM access
const itemRefsRef = useRef<Map<string, HTMLElement>>(new Map());

// Apply animations directly to DOM
useLayoutEffect(() => {
  newlyReceivedCards.forEach(itemKey => {
    const element = itemRefsRef.current.get(itemKey);
    if (element) {
      // Add animation class
      element.classList.add('animate-stream-in');

      // Remove after animation completes
      setTimeout(() => {
        element.classList.remove('animate-stream-in');
        setNewlyReceivedCards(prev => {
          const updated = new Set(prev);
          updated.delete(itemKey);
          return updated;
        });
      }, 600); // Match CSS animation duration
    }
  });
}, [newlyReceivedCards]);
```

### CSS Animation

**Location**: `tailwind.config.js`

```javascript
module.exports = {
  theme: {
    extend: {
      keyframes: {
        'stream-in': {
          '0%': {
            opacity: '0',
            transform: 'translateY(10px)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)'
          }
        }
      },
      animation: {
        'stream-in': 'stream-in 0.6s ease-out'
      }
    }
  }
}
```

**Benefits**:
- Smooth 60fps animations
- Only newly received content animates
- No React re-render stuttering
- Minimal performance impact

## Progressive JSON Parsing

### Challenge

Gemini streams partial JSON that may be incomplete:

```json
{"day": "Monday", "meals": {"Breakfast": {"name": "Oatmeal", "desc
```

### Solution

Multiple parsing strategies with fallbacks:

```typescript
function extractMealsFromBuffer(buffer: string): DayPlan[] {
  const meals: DayPlan[] = [];

  // Strategy 1: Try complete JSON
  try {
    const parsed = JSON.parse(buffer);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (e) {
    // Continue to next strategy
  }

  // Strategy 2: Extract array elements
  const arrayMatch = buffer.match(/\[([^\]]+)\]/);
  if (arrayMatch) {
    try {
      const parsed = JSON.parse(`[${arrayMatch[1]}]`);
      return parsed;
    } catch (e) {
      // Continue to next strategy
    }
  }

  // Strategy 3: Extract individual objects
  const objectRegex = /\{[^{}]*"day"[^{}]*\}/g;
  const matches = buffer.match(objectRegex);

  if (matches) {
    for (const match of matches) {
      try {
        const parsed = JSON.parse(match);
        if (parsed.day && parsed.meals) {
          meals.push(parsed);
        }
      } catch (e) {
        // Skip invalid objects
      }
    }
  }

  return meals;
}
```

**Benefits**:
- Handles incomplete JSON
- Multiple fallback strategies
- Robust error handling
- Progressive rendering

## Error Handling

### Streaming Failures

```typescript
try {
  await generateInitialMealPlanStream(/* ... */);
} catch (error) {
  console.warn('Streaming failed, falling back to batch:', error);

  // Graceful fallback to batch mode
  await generateInitialMealPlan(/* ... */);
}
```

### Rate Limiting

```python
# Backend handles rate limits
if isinstance(exc, google_exceptions.ResourceExhausted):
    return 429, ErrorResponse(
        error="Rate Limit Exceeded",
        message="API rate limit exceeded. Please try again in a few minutes.",
        code="RATE_LIMIT_EXCEEDED",
        retry_after=300
    )
```

### Network Errors

```typescript
// Frontend shows user-friendly error
if (response.status === 429) {
  showToast(
    'Rate limit exceeded. Please try again in a few minutes.',
    'error'
  );
}
```

## Performance Metrics

### Before Streaming

- Time-to-first-content: 15-20 seconds
- User experience: Long loading screen
- Perceived performance: Poor

### After Streaming

- Time-to-first-content: 2-3 seconds
- User experience: Progressive rendering
- Perceived performance: 70-80% improvement

### Measurements

```typescript
// Track performance
const startTime = performance.now();

await generateInitialMealPlanStream(
  family,
  preferences,
  (meal) => {
    const timeToFirstMeal = performance.now() - startTime;
    console.log(`First meal in ${timeToFirstMeal}ms`);

    // Track in analytics
    analyticsService.trackEvent({
      action: 'first_meal_received',
      category: 'performance',
      custom_parameters: {
        time_ms: timeToFirstMeal
      }
    });
  },
  // ...
);
```

## Streaming Endpoints

### Meal Plan Streaming

```python
POST /api/generate-plan-stream
```

**Request**:
```json
{
  "family": [...],
  "preferences": {...}
}
```

**Response** (SSE):
```
data: {"day": "Monday", "meals": {...}}

data: {"day": "Tuesday", "meals": {...}}

data: {"status": "complete"}
```

### Prep Tasks Streaming

```python
POST /api/generate-prep-stream
```

**Response** (SSE):
```
data: {"id": "1", "day": "Sunday", "task": "..."}

data: {"id": "2", "day": "Monday", "task": "..."}

data: {"status": "complete"}
```

### Grocery List Streaming

```python
POST /api/generate-grocery-stream
```

**Response** (SSE):
```
data: {"id": "1", "name": "Milk", "category": "Dairy", "quantity": "1 gallon", "relatedMeals": ["Monday Breakfast", "Tuesday Breakfast"]}

data: {"id": "2", "name": "Bread", "category": "Bakery", "quantity": "1 loaf", "relatedMeals": ["Monday Lunch", "Wednesday Lunch"]}

data: {"status": "complete"}
```

### Incremental Prep Update

Used when only a few meals change (single meal replace, chat updates). Patches only affected tasks instead of regenerating everything.

```python
PATCH /api/update-prep-stream
```

**Request**:
```json
{
  "mealPlan": [...],
  "changedMeals": [
    { "day": "Monday", "mealType": "Dinner", "newMeal": {...} }
  ],
  "existingTasks": [...]
}
```

**Response** (SSE):
```
data: {"day": "Weekend", "task": "Chop vegetables...", "relatedMeals": ["Monday Dinner"]}

data: {"type": "complete"}
```

If the LLM returns no tasks, a `fallback_to_full` signal is sent and the frontend retries with full regeneration.

### Incremental Grocery Update

Same pattern as incremental prep — patches only items affected by changed meals.

```python
PATCH /api/update-grocery-stream
```

**Request**:
```json
{
  "mealPlan": [...],
  "changedMeals": [...],
  "existingItems": [...],
  "prepTasks": [...]
}
```

**Response** (SSE):
```
data: {"name": "Chicken Breast", "category": "Meat", "quantity": "2 lbs", "relatedMeals": ["Monday Dinner"]}

data: {"type": "complete"}
```

## Testing

### Manual Testing

```bash
1. Start app: ./scripts/dev.sh
2. Complete family setup
3. Click "Generate Plan"
4. Start timer
5. Note when first meal appears
6. Verify: < 3 seconds
7. Watch meals stream in
8. Verify: Smooth animations
9. Verify: No stuttering
```

### Performance Testing

```typescript
// Measure streaming performance
const metrics = {
  startTime: 0,
  firstMealTime: 0,
  completionTime: 0,
  mealCount: 0
};

metrics.startTime = performance.now();

await generateInitialMealPlanStream(
  family,
  preferences,
  (meal) => {
    metrics.mealCount++;
    if (metrics.mealCount === 1) {
      metrics.firstMealTime = performance.now() - metrics.startTime;
    }
  },
  (plan) => {
    metrics.completionTime = performance.now() - metrics.startTime;

    console.log('Performance Metrics:', {
      timeToFirstMeal: `${metrics.firstMealTime}ms`,
      totalTime: `${metrics.completionTime}ms`,
      mealsReceived: metrics.mealCount
    });
  },
  // ...
);
```

## Troubleshooting

### Streaming Not Working

**Check**:
1. Backend is running
2. Network connection is stable
3. Console for errors
4. Backend logs for exceptions

**Fallback**:
- App automatically falls back to batch mode
- User experience degraded but functional

### Animations Stuttering

**Check**:
1. Using direct DOM manipulation (not React state)
2. Animation duration matches timeout
3. CSS animation defined correctly

**Fix**:
```typescript
// Ensure using useLayoutEffect, not useEffect
useLayoutEffect(() => {
  // Animation code
}, [newlyReceivedCards]);
```

### Incomplete Meals

**Check**:
1. JSON parsing strategies
2. Buffer management
3. Backend streaming logic

**Debug**:
```typescript
// Log raw SSE events
console.log('Raw SSE event:', data);

// Log parsed meals
console.log('Parsed meal:', parsed);
```

## Future Enhancements

### WebSocket Support

For true bidirectional streaming:

```typescript
const ws = new WebSocket('wss://api.example.com/stream');

ws.onmessage = (event) => {
  const meal = JSON.parse(event.data);
  onMealReceived(meal);
};
```

### Optimistic Updates

Show placeholder content immediately:

```typescript
// Show skeleton immediately
setIsLoading(true);

// Stream real content
await generateInitialMealPlanStream(/* ... */);
```

### Retry Logic

Automatic retry on streaming failure:

```typescript
async function generateWithRetry(maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await generateInitialMealPlanStream(/* ... */);
      return;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(Math.pow(2, i) * 1000); // Exponential backoff
    }
  }
}
```

## Related Documentation

- [Backend API](../architecture/04-building-blocks.md#api-endpoints)
- [Performance Optimization](../architecture/07-cross-cutting-concerns.md#performance)
- [Error Handling](../architecture/07-cross-cutting-concerns.md#reliability)
