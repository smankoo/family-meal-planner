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
| `GET` | `/my-membership` | Get user's current family membership (source of truth for startup) |
| `GET` | `/by-invite-code/{invite_code}` | Get plan by invite code |
| `POST` | `/join` | Join a family (persists `active_plan_id` in user_data) |
| `GET` | `/{plan_id}` | Get a specific family plan (member only) |
| `PUT` | `/{plan_id}` | Update family plan + broadcast (any member) |
| `DELETE` | `/{plan_id}` | Delete family plan (owner only) |
| `POST` | `/{plan_id}/leave` | Leave a family (clears `active_plan_id` + individual plan data) |
| `DELETE` | `/{plan_id}/members/{member_user_id}` | Remove a member from family (owner only) |

The `PUT /{plan_id}` endpoint awaits broadcast completion before returning response, ensuring reliable delivery.

### State Persistence & Startup

On startup, the frontend calls `GET /family-plans/my-membership` to check the backend for family membership — this is the single source of truth. If the user is in a family, the response includes the full plan data and members, which are loaded into state with `skipSave=true` to avoid circular writes. If the user is not in a family, any stale `activePlanId` is cleared.

This replaces the previous approach of relying on a locally-persisted `activePlanId`, which could become stale or out of sync after deployments or edge cases. The backend `join` endpoint also persists `active_plan_id` in `user_data` as a secondary reference.

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
4. Backend adds user as member and persists `active_plan_id` in `user_data`
5. Plan data is loaded into state with `skipSave=true` (avoids duplicating family data into individual `user_data`)
6. `activePlanId` is set — broadcast subscription starts
7. 10s poll begins as safety net

### Leaving a Family

1. User clicks "Leave Family" button in the family members section
2. Confirmation modal warns about losing access to the shared plan
3. On confirmation, frontend calls `POST /family-plans/{plan_id}/leave`
4. Backend removes the membership, clears `active_plan_id`, and deletes individual plan data (`meal_plan`, `prep_tasks`, `grocery_items`, `invalidation_state`, `has_plan`, `current_stage`) so the user starts fresh
5. If the user was the last owner, ownership transfers to another member (or the plan is deleted if no members remain)
6. Frontend resets all state to individual mode (empty plan, initial family, etc.)
7. User is returned to the household setup view to create their own plan

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
  is_meals_locked: boolean;    // Per-tab lock: Meals
  is_prep_locked: boolean;     // Per-tab lock: Prep
  is_grocery_locked: boolean;  // Per-tab lock: Grocery
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

Plan locking prevents accidental changes to finalized content on a per-tab basis. Each tab (Meals, Prep, Grocery) has its own independent lock, allowing users to finalize one section while continuing to edit others.

### Features

- **Per-tab independence**: Each tab (Meals, Prep, Grocery) can be locked/unlocked independently
- **Apple-style toggle**: Visual slider toggle positioned inline with the Regenerate button on each tab
- **Collaborative**: Lock states sync across all family members in real-time
- **Scoped protection**: When a tab is locked, only that tab's mutations are prevented:
  - Meals locked: prevents meal replacements, plan regeneration, manual edits
  - Prep locked: prevents task completion toggling, prep regeneration
  - Grocery locked: prevents item check-off, grocery list regeneration

### Implementation

**Backend** (`backend/models.py`, `backend/schemas.py`, `backend/routers/family_plans.py`):
- Three boolean columns in `CollaborativePlan`: `is_meals_locked`, `is_prep_locked`, `is_grocery_locked` (all default `false`)
- Migration: `replace_is_locked_with_per_tab_locks.py` (replaces the old single `is_locked` column)
- `PUT /family-plans/{id}` returns HTTP 423 (Locked) with tab-specific messaging if a locked tab's content is modified
- Lock state changes (toggling any lock field) are always permitted regardless of other lock states
- All three lock states included in broadcast payload for real-time sync

**Frontend** (`App.tsx`, `components/PlanLockToggle.tsx`, `components/MealPrepView.tsx`, `components/GroceryListView.tsx`):
- `PlanLockToggle` component: reusable Apple-style slider with lock/unlock icons
- Lock toggle rendered inline with the Regenerate button on each tab via `lockToggle` prop (Prep, Grocery) or directly in the action bar (Meals)
- `handleToggleTabLock(tab)` handles toggling for any of the three tabs
- `MealGrid`, `MealPrepView`, `GroceryListView` each accept `isLocked` prop scoped to their tab
- Replace buttons hidden, checkboxes dimmed when the respective tab is locked
- Optimistic updates with error handling and revert on failure

**Sync Behavior**:
- Lock state changes handled directly by `handleToggleTabLock` (not sync effect)
- `isTogglingLockRef` prevents sync effect interference during toggle
- All three lock states synced via real-time broadcast to all family members

### User Experience

1. User clicks lock toggle on a specific tab (e.g., Meals)
2. Toggle animates to locked state (amber background)
3. Only that tab's mutation buttons/actions become disabled
4. Other tabs remain editable unless independently locked
5. Other family members see lock state update instantly
6. User clicks toggle again to unlock that tab

**Design**: Lock toggle uses centralized CSS classes (`plan-lock-slider`, `plan-lock-slider-locked`, `plan-lock-slider-unlocked`) with gray background when unlocked and amber when locked. Toggle is consistently positioned to the left of the Regenerate button on all tabs.
