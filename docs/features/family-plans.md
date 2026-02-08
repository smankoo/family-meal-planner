# Family Plans - Real-Time Collaboration

## Overview

Family Plans enable multiple family members to collaborate on meal planning in real-time. When one family member makes changes to the meal plan, prep tasks, or grocery list, all other family members see those changes instantly via Supabase Broadcast.

## Architecture

### Optimistic Updates + Instant Sync Model

Real-time sync uses optimistic updates with immediate synchronization:

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: Optimistic Updates (instant UI)                   │
│  Local changes applied immediately to UI for instant feel.  │
│  Changes sent to backend without debouncing.                │
├─────────────────────────────────────────────────────────────┤
│  Layer 2: Supabase Broadcast (instant, primary)             │
│  Backend awaits broadcast before returning API response.    │
│  Frontend subscribes with ack:true for reliability.         │
│  Broadcast includes last_modified_by for filtering.         │
├─────────────────────────────────────────────────────────────┤
│  Layer 3: Periodic Poll (safety net, every 10s)             │
│  Frontend fetches plan via GET /family-plans/{id} and       │
│  compares updated_at. Catches missed broadcasts.            │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow: User A replaces a meal → User B sees it

```
User A: Replace meal → setPlanHistory() updates state
  ↓
Sync effect fires (planHistory.present changed)
  ↓
saveToFamilyPlan() immediately calls PUT /family-plans/{id}
  ↓
Backend saves to DB, awaits broadcast completion
  ↓
broadcast_service POSTs to Supabase /realtime/v1/api/broadcast
  ↓
Backend returns response after broadcast sent
  ↓
User B's useFamilyPlan hook receives broadcast on channel
  ↓
handleRemoteData() checks modified_by !== userId (not own update)
  ↓
isApplyingRemoteUpdateRef prevents feedback loop
  ↓
onRemoteUpdate callback updates all state with skipSave=true
  ↓
User B sees updated meal + toast "Plan updated by family member"
```

### Frontend Components

1. **FamilyInviteModal** (`components/FamilyInviteModal.tsx`)
   - Modal for creating and sharing family invite links
   - Shows invite URL with copy functionality
   - Displays current family members with roles
   - Allows owners to remove non-owner members

2. **FamilyMemberList** (`components/FamilyMemberList.tsx`)
   - Reusable component for displaying family members
   - Supports compact (avatars) and full (detailed) modes
   - Shows owner crown badge and role indicators
   - Remove button appears on hover for removable members (owner-only feature)
   - Handles loading states during member removal

3. **useFamilyPlan Hook** (`hooks/useFamilyPlan.ts`)
   - Subscribes to Supabase Broadcast channel with `ack: true` for reliability
   - Runs 10s poll as safety net (faster recovery than 30s)
   - Immediate saves (no debouncing) for instant sync
   - Deduplicates via `lastKnownUpdatedAtRef` (skips already-seen versions)
   - Filters own updates via `modified_by` check
   - Prevents save loops via `isSavingRef` guard

3. **Broadcast Service** (`backend/realtime_broadcast.py`)
   - Singleton `broadcast_service` using `httpx.AsyncClient`
   - POSTs to Supabase `/realtime/v1/api/broadcast` REST API
   - Awaited in request handler (not background task) for reliability
   - Failures are logged but don't fail the request (poll catches it)
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
| `DELETE` | `/{plan_id}/members/{member_user_id}` | Remove a member from family (owner only) |

The `PUT /{plan_id}` endpoint awaits broadcast completion before returning response, ensuring reliable delivery.

### State Persistence

`activePlanId` is persisted via `usePersistedState` (stored as `active_plan_id` data type in Supabase). This ensures family sync survives page refreshes. On startup, if `activePlanId` exists, the app loads the family plan data from the backend.

### Database

Uses the `collaborative_plans` table in Supabase:
- `share_id` column stores the invite code (full UUID for uniqueness and persistence)
- `plan_members` table tracks family membership with roles (owner/member)
- `last_modified_by` tracks who made the last change (used for broadcast filtering)
- Each user can only own ONE family plan (enforced in `create_family_plan` endpoint)

## User Flow

### Creating a Family

1. User clicks "Invite to Family" button
2. Frontend calls `POST /family-plans/` with current plan data
3. Backend checks if user already owns a plan:
   - If yes: Updates existing plan, returns same invite code
   - If no: Generates new UUID invite code and creates plan
4. User receives shareable URL with persistent invite code
5. `activePlanId` is persisted — sync begins

**Key behavior**: Each family has ONE persistent invite code that never changes, even if the user clicks "Invite" multiple times.

### Joining a Family

1. User opens invite URL (`?invite=<code>`)
2. Frontend detects invite parameter and calls `GET /by-invite-code/{code}`
3. If not already a member, calls `POST /join`
4. Plan data is loaded and persisted to user's data
5. `activePlanId` is set — broadcast subscription starts
6. 30s poll begins as safety net

### Removing Family Members

1. Owner opens "Invite to Family" modal to view members
2. Hover over non-owner member reveals remove button (red trash icon)
3. Click remove button triggers confirmation modal
4. On confirmation, frontend calls `DELETE /family-plans/{plan_id}/members/{user_id}`
5. Backend validates requester is owner and target is not an owner
6. Member is removed from `plan_members` table
7. Broadcast sent to notify all family members of removal
8. Removed member loses access to the family plan

**Authorization Rules**:
- Only owners can remove members
- Cannot remove other owners
- Cannot remove yourself (use leave endpoint instead)
- Confirmation modal prevents accidental removals

### Real-Time Sync

1. `useFamilyPlan` hook subscribes to Supabase Broadcast channel with acknowledgment
2. Any state change triggers immediate save to backend (no debounce)
3. Backend saves to DB, awaits broadcast via Supabase REST API
4. Other family members receive broadcast instantly (typically <100ms)
5. Poll every 10s catches any missed broadcasts
6. `isApplyingRemoteUpdateRef` prevents feedback loops
7. Toast notification shows "Plan updated by family member"

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
  is_locked: boolean;  // Plan lock state
  title: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_modified_by: string;
  members: PlanMember[];
}
```

## Plan Locking

### Overview

Plan locking prevents accidental changes to finalized meal plans. Once a family has completed their planning and shopping list, they can lock the plan to prevent any modifications until explicitly unlocked.

### Features

- **Apple-style toggle**: Visual slider toggle in the app header shows lock state
- **Collaborative**: Lock state syncs across all family members in real-time
- **Comprehensive protection**: When locked, prevents:
  - Meal replacements
  - Plan regeneration
  - Prep plan regeneration
  - Grocery list regeneration
  - Manual edits to any plan component

### Implementation

**Backend** (`backend/models.py`, `backend/schemas.py`, `backend/routers/family_plans.py`):
- `is_locked` boolean column in `CollaborativePlan` model (default `false`)
- Migration: `add_is_locked_to_collaborative_plans.py`
- `PUT /family-plans/{id}` returns HTTP 423 (Locked) if plan is locked and request isn't a lock toggle
- Lock state included in broadcast payload for real-time sync

**Frontend** (`App.tsx`, `components/PlanLockToggle.tsx`):
- `PlanLockToggle` component: Apple-style slider with lock/unlock icons
- Lock guards in mutation handlers prevent changes when locked
- `MealGrid`, `MealPrepView`, `GroceryListView` accept `isLocked` prop
- Replace buttons hidden, checkboxes dimmed when locked
- Optimistic updates with error handling and revert on failure

**Sync Behavior**:
- Lock state changes handled directly by `handleTogglePlanLock` (not sync effect)
- `isTogglingLockRef` prevents sync effect interference during toggle
- When locked, sync effect skips all content syncs (lock state only)
- Lock state synced via real-time broadcast to all family members

### User Experience

1. User clicks lock toggle in header
2. Toggle animates to locked state (amber background)
3. All mutation buttons/actions become disabled
4. Other family members see lock state update instantly
5. User clicks toggle again to unlock
6. All mutation actions become available again

**Design**: Lock toggle uses centralized CSS classes (`plan-lock-slider`, `plan-lock-slider-locked`, `plan-lock-slider-unlocked`) with gray background when unlocked and amber when locked.
