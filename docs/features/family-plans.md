# Family Plans - Real-Time Collaboration

## Overview

Family Plans enable multiple family members to collaborate on meal planning in real-time. When one family member makes changes to the meal plan, prep tasks, or grocery list, all other family members see those changes instantly via Supabase Broadcast.

## Architecture

### 3-Layer Reliability Model

Real-time sync uses a layered approach for instant + reliable updates:

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: Supabase Broadcast (instant, primary)             │
│  Backend POSTs to Supabase REST API after every DB write.   │
│  Frontend subscribes to broadcast channel.                  │
│  Fire-and-forget — if it fails, Layer 2 catches it.         │
├─────────────────────────────────────────────────────────────┤
│  Layer 2: Periodic Poll (safety net, every 30s)             │
│  Frontend fetches plan via GET /family-plans/{id} and       │
│  compares updated_at. Catches missed broadcasts.            │
├─────────────────────────────────────────────────────────────┤
│  Layer 3: Debounced Save (outbound, 1s debounce)            │
│  Local changes are batched and sent via PUT to backend.     │
│  Backend saves to DB, then broadcasts to other clients.     │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow: User A replaces a meal → User B sees it

```
User A: Replace meal → setPlanHistory() updates state
  ↓
Sync effect fires (planHistory.present changed)
  ↓
saveToFamilyPlan() debounces 1s, calls PUT /family-plans/{id}
  ↓
Backend saves to DB, broadcasts via BackgroundTasks
  ↓
broadcast_service POSTs to Supabase /realtime/v1/api/broadcast
  ↓
User B's useFamilyPlan hook receives broadcast on channel
  ↓
handleRemoteData() checks modified_by !== userId (not own update)
  ↓
onRemoteUpdate callback updates all state with skipSave=true
  ↓
User B sees updated meal + toast "Plan updated by family member"
```

### Frontend Components

1. **FamilyInviteModal** (`components/FamilyInviteModal.tsx`)
   - Modal for creating and sharing family invite links
   - Shows invite URL with copy functionality

2. **useFamilyPlan Hook** (`hooks/useFamilyPlan.ts`)
   - Subscribes to Supabase Broadcast channel (`family_plan:{planId}`)
   - Runs 30s poll as safety net
   - Debounces outbound saves (1s)
   - Deduplicates via `lastKnownUpdatedAtRef` (skips already-seen versions)
   - Filters own updates via `modified_by` check
   - Exposes `flushSync()` for tab-close scenarios

3. **Broadcast Service** (`backend/realtime_broadcast.py`)
   - Singleton `broadcast_service` using `httpx.AsyncClient`
   - POSTs to Supabase `/realtime/v1/api/broadcast` REST API
   - Fire-and-forget — failures are logged, not thrown
   - Requires `SUPABASE_URL` and `SUPABASE_ANON_KEY` env vars
   - Client closed on app shutdown via FastAPI `on_event("shutdown")`

### Backend Endpoints

All endpoints are under `/family-plans/`:

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/` | Create a new family plan |
| `GET` | `/my-plans` | Get all family plans user is a member of |
| `GET` | `/by-invite-code/{invite_code}` | Get plan by invite code |
| `POST` | `/join` | Join a family using invite code |
| `GET` | `/{plan_id}` | Get a specific family plan (member only) |
| `PUT` | `/{plan_id}` | Update family plan + broadcast (any member) |
| `DELETE` | `/{plan_id}` | Delete family plan (owner only) |
| `POST` | `/{plan_id}/leave` | Leave a family |

The `PUT /{plan_id}` endpoint broadcasts changes via `BackgroundTasks` after DB commit.

### State Persistence

`activePlanId` is persisted via `usePersistedState` (stored as `active_plan_id` data type in Supabase). This ensures family sync survives page refreshes. On startup, if `activePlanId` exists, the app loads the family plan data from the backend.

### Database

Uses the `collaborative_plans` table in Supabase:
- `share_id` column stores the invite code (full UUID for uniqueness)
- `plan_members` table tracks family membership
- `last_modified_by` tracks who made the last change (used for broadcast filtering)

## User Flow

### Creating a Family

1. User clicks "Invite to Family" button
2. Frontend calls `POST /family-plans/` with current plan data
3. Backend generates UUID invite code and creates plan
4. User receives shareable URL with invite code
5. `activePlanId` is persisted — sync begins

### Joining a Family

1. User opens invite URL (`?invite=<code>`)
2. Frontend detects invite parameter and calls `GET /by-invite-code/{code}`
3. If not already a member, calls `POST /join`
4. Plan data is loaded and persisted to user's data
5. `activePlanId` is set — broadcast subscription starts
6. 30s poll begins as safety net

### Real-Time Sync

1. `useFamilyPlan` hook subscribes to Supabase Broadcast channel
2. Any state change triggers debounced save (1s) to backend
3. Backend saves to DB, broadcasts via Supabase REST API
4. Other family members receive broadcast instantly
5. Poll every 30s catches any missed broadcasts
6. Toast notification shows "Plan updated by family member"

## Environment Configuration

The broadcast service requires these env vars in `backend/.env`:

```
SUPABASE_URL=http://127.0.0.1:54321        # Local dev
SUPABASE_ANON_KEY=<your-anon-key>           # From: supabase status
```

For production, set these in Render dashboard environment variables.

## Terminology

| Old Term | New Term |
|----------|----------|
| Share | Invite to Family |
| Collaborative Plan | Family Plan |
| Share ID | Invite Code |
| Collaborator | Family Member |

## API Response Format

```typescript
interface FamilyPlanResponse {
  id: string;
  invite_code: string;
  plan_data: WeekPlan;
  family_data: FamilyMember[];
  preferences_data: FamilyPreferences;
  prep_tasks: PrepTask[];
  grocery_items: GroceryItem[];
  invalidation_state: InvalidationState;
  has_plan: string;
  current_stage: string;
  title: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_modified_by: string;
  members: PlanMember[];
}
```
