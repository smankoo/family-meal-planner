# Family Plans - Real-Time Collaboration

## Overview

Family Plans enable multiple family members to collaborate on meal planning in real-time. When one family member makes changes to the meal plan, prep tasks, or grocery list, all other family members see those changes instantly.

## Architecture

### Frontend Components

1. **FamilyInviteModal** (`components/FamilyInviteModal.tsx`)
   - Modal for creating and sharing family invite links
   - Uses Users icon to represent family collaboration
   - Shows invite URL with copy functionality

2. **useFamilyPlan Hook** (`hooks/useFamilyPlan.ts`)
   - Manages Supabase Realtime subscription for instant sync
   - Debounces local changes (1 second) before syncing to server
   - Handles conflict detection and sync status

### Backend Endpoints

All endpoints are under `/family-plans/`:

- `POST /` - Create a new family plan
- `GET /my-plans` - Get all family plans user is a member of
- `GET /by-invite-code/{invite_code}` - Get plan by invite code
- `POST /join` - Join a family using invite code
- `PUT /{plan_id}` - Update family plan (any member)
- `DELETE /{plan_id}` - Delete family plan (owner only)
- `POST /{plan_id}/leave` - Leave a family

### Database

Uses the existing `collaborative_plans` table in Supabase with Realtime enabled:
- `share_id` column stores the invite code
- `plan_members` table tracks family membership
- Realtime broadcasts UPDATE events to all subscribers

## User Flow

### Creating a Family

1. User clicks "Invite to Family" button
2. Frontend calls `POST /family-plans/` with current plan data
3. Backend generates unique invite code and creates plan
4. User receives shareable URL with invite code

### Joining a Family

1. User opens invite URL (`?invite=<code>`)
2. Frontend detects invite parameter and calls `GET /by-invite-code/{code}`
3. If not already a member, calls `POST /join`
4. Plan data is loaded and persisted to user's local storage
5. Real-time subscription is established

### Real-Time Sync

1. `useFamilyPlan` hook subscribes to Supabase Realtime channel
2. Any state change triggers debounced save to server
3. Server broadcasts UPDATE to all subscribers
4. Other family members receive update via `onRemoteUpdate` callback
5. Toast notification shows "Plan updated by family member"

## Key Features

- **Instant Sync**: Changes appear within ~1 second for all family members
- **Conflict Handling**: Updates from current user are ignored to prevent loops
- **Offline Resilience**: Pending changes are queued and synced when connection restores
- **Data Adoption**: When joining, the family's data becomes the user's data

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
