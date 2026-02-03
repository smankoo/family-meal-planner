# Collaborative Meal Plan Sharing Implementation

## Overview
This document outlines the implementation of live collaborative meal plan sharing. Multiple users can share and edit the same meal plan in real-time, enabling true collaboration.

## Architecture

### Database Schema
- **collaborative_plans**: Stores the actual plan data with a unique share_id
- **plan_members**: Tracks which users have access to which plans (with roles: owner/member)
- All changes by any member are reflected for all members instantly

### Key Features
1. **Live Collaboration**: Changes made by any user reflect for all users
2. **Share via URL**: Simple URL sharing with short, readable share IDs (12-character hex)
3. **Role-based Access**: Owners can delete plans, all members can edit
4. **Seamless Auth**: Users must be logged in to access shared plans
5. **Automatic Ownership Transfer**: If the last owner leaves, ownership transfers to another member

## Backend Implementation

### Files Created/Modified

#### 1. Database Migration
**File**: `supabase/migrations/20260203000001_add_shared_plans.sql`
- Creates `collaborative_plans` table
- Creates `plan_members` table
- Sets up RLS policies for secure access
- Indexes for performance

#### 2. Models
**File**: `backend/models.py`
- Added `CollaborativePlan` model
- Added `PlanMember` model
- Relationships between plans, members, and profiles

#### 3. Schemas
**File**: `backend/schemas.py`
- Added `CollaborativePlanCreate`
- Added `CollaborativePlanUpdate`
- Added `CollaborativePlanResponse`
- Added `PlanMemberResponse`
- Added `JoinPlanRequest`

#### 4. Router
**File**: `backend/routers/collaborative_plans.py`
- `POST /collaborative-plans/`: Create a new shared plan
- `GET /collaborative-plans/my-plans`: Get all plans user is a member of
- `GET /collaborative-plans/by-share-id/{share_id}`: Get plan by share ID (for joining)
- `POST /collaborative-plans/join`: Join a plan by share ID
- `PUT /collaborative-plans/{plan_id}`: Update a plan (any member can edit)
- `POST /collaborative-plans/{plan_id}/leave`: Leave a plan
- `DELETE /collaborative-plans/{plan_id}`: Delete a plan (owners only)

#### 5. Main App
**File**: `backend/main.py`
- Import collaborative_plans router
- Include router in app

## Frontend Implementation

### Files Created/Modified

#### 1. API Service
**File**: `services/apiService.ts`
Added methods:
- `createCollaborativePlan()`: Create a shareable plan
- `getMyCollaborativePlans()`: Get user's collaborative plans
- `getPlanByShareId()`: Get plan details by share ID
- `joinCollaborativePlan()`: Join a plan
- `updateCollaborativePlan()`: Update plan data
- `leaveCollaborativePlan()`: Leave a plan
- `deleteCollaborativePlan()`: Delete a plan

#### 2. Share Modal Component
**File**: `components/ShareModal.tsx`
- Elegant modal following design language
- Two states: pre-share (create link) and post-share (show link)
- One-click copy to clipboard
- Clear collaboration messaging
- Warning about sharing with trusted people

### App.tsx Modifications Needed

Add the following state and functions to `App.tsx`:

```typescript
// Add to state declarations
const [shareModalOpen, setShareModalOpen] = useState(false);
const [shareUrl, setShareUrl] = useState('');
const [isSharing, setIsSharing] = useState(false);
const [activePlanId, setActivePlanId] = useState<string | null>(null);

// Add share handler
const handleSharePlan = async () => {
  if (activePlanId) {
    // Already shared, just show the modal
    setShareModalOpen(true);
    return;
  }

  setIsSharing(true);
  try {
    const response = await apiService.createCollaborativePlan({
      plan_data: planHistory.present,
      family_data: family,
      preferences_data: preferences,
      prep_tasks: prepTasks,
      grocery_items: groceryItems,
      invalidation_state: invalidationState,
      has_plan: hasPlanGenerated ? 'true' : 'false',
      current_stage: currentStage.toString(),
      title: `${family[0]?.name || 'Family'}'s Meal Plan`
    });

    setActivePlanId(response.id);
    const url = `${window.location.origin}/plan/${response.share_id}`;
    setShareUrl(url);
    setShareModalOpen(true);

    showToast('Share link created!', 'success');
  } catch (error) {
    console.error('Failed to create share link:', error);
    showToast('Failed to create share link', 'error');
  } finally {
    setIsSharing(false);
  }
};

// Add URL parameter handling on mount
useEffect(() => {
  const handleSharedPlanAccess = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const shareId = urlParams.get('share');

    if (shareId && user) {
      try {
        // Get the plan details
        const plan = await apiService.getPlanByShareId(shareId);

        // Check if already a member
        const isMember = plan.members?.some((m: any) => m.user_id === user.id);

        if (!isMember) {
          // Join the plan
          await apiService.joinCollaborativePlan(shareId);
          showToast('Joined collaborative plan!', 'success');
        }

        // Load the plan data
        setPlanHistory({
          past: [],
          present: plan.plan_data,
          future: []
        });
        setFamily(plan.family_data || INITIAL_FAMILY);
        setPreferences(plan.preferences_data || INITIAL_PREFERENCES);
        setPrepTasks(plan.prep_tasks || []);
        setGroceryItems(plan.grocery_items || []);
        setInvalidationState(plan.invalidation_state || DEFAULT_INVALIDATION_STATE);
        setHasPlanGenerated(plan.has_plan === 'true');
        setCurrentStage(parseInt(plan.current_stage) || Stage.MEAL_PLANNING);
        setActivePlanId(plan.id);
        setViewMode('planning');

        // Clear the URL parameter
        window.history.replaceState({}, '', window.location.pathname);

      } catch (error) {
        console.error('Failed to load shared plan:', error);
        showToast('Failed to load shared plan', 'error');
      }
    }
  };

  if (!isDataLoading && user) {
    handleSharedPlanAccess();
  }
}, [isDataLoading, user]);

// Modify save functions to update collaborative plan if active
const saveToCollaborativePlan = async () => {
  if (!activePlanId) return;

  try {
    await apiService.updateCollaborativePlan(activePlanId, {
      plan_data: planHistory.present,
      family_data: family,
      preferences_data: preferences,
      prep_tasks: prepTasks,
      grocery_items: groceryItems,
      invalidation_state: invalidationState,
      has_plan: hasPlanGenerated ? 'true' : 'false',
      current_stage: currentStage.toString()
    });
  } catch (error) {
    console.error('Failed to sync collaborative plan:', error);
  }
};

// Call saveToCollaborativePlan after any plan changes
// Add to handleGenerateInitialPlan, handlePlanUpdate, handleReplaceMeal, etc.
```

### Add Share Button to UI

In the meal planning view header (around line 1500 in App.tsx), add a share button:

```typescript
<div className="flex gap-3">
  {planHistory.past.length > 0 && (
    <button onClick={handleUndo} className="flex items-center gap-2 px-3 md:px-4 py-2 bg-white border border-zinc-200 text-zinc-600 rounded-full text-xs md:text-sm font-semibold hover:bg-zinc-50 transition-colors">
      <Undo2 size={12} className="md:w-[14px] md:h-[14px]" /> Undo
    </button>
  )}
  <button
    onClick={handleSharePlan}
    disabled={isSharing}
    className="flex items-center gap-2 px-3 md:px-4 py-2 bg-white border border-zinc-200 text-zinc-600 rounded-full text-xs md:text-sm font-semibold hover:bg-zinc-50 transition-colors disabled:opacity-50"
  >
    <Share2 size={12} className="md:w-[14px] md:h-[14px]" />
    {isSharing ? 'Creating...' : activePlanId ? 'Share' : 'Share Plan'}
  </button>
  <button onClick={handleRegeneratePlan} className="flex items-center gap-2 px-3 md:px-4 py-2 bg-zinc-100 text-zinc-600 rounded-full text-xs md:text-sm font-semibold hover:bg-zinc-200 transition-colors">
    <RotateCcw size={12} className="md:w-[14px] md:h-[14px]" /> Regenerate
  </button>
</div>
```

### Add Share Modal to Render

Near the end of App.tsx, before the closing div:

```typescript
{/* Share Modal */}
<ShareModal
  isOpen={shareModalOpen}
  onClose={() => setShareModalOpen(false)}
  shareUrl={shareUrl}
  onShare={handleSharePlan}
  isSharing={isSharing}
/>
```

### Add Import

At the top of App.tsx:

```typescript
import ShareModal from './components/ShareModal';
import { Share2 } from 'lucide-react';
```

## URL Structure

Shared plans are accessed via:
```
https://yourapp.com/?share=abc123def456
```

The share ID is a 12-character hex string (e.g., `abc123def456`)

## User Flow

### Sharing a Plan
1. User clicks "Share Plan" button
2. Modal opens explaining collaborative editing
3. User clicks "Create Share Link"
4. Backend creates collaborative_plan and adds user as owner
5. Share URL is displayed with copy button
6. User copies and shares URL

### Joining a Plan
1. User receives share URL
2. Opens URL (redirected to login if not authenticated)
3. After login, automatically joins the plan
4. Plan data loads into their app
5. Any changes they make sync to all members

### Editing a Shared Plan
1. Any member makes changes (edit meal, regenerate, etc.)
2. Changes automatically save to collaborative_plan
3. Other members see changes in real-time (on next load/refresh)

## Real-time Sync Strategy

For MVP, changes sync on:
- Page load/refresh
- Explicit save actions
- Stage changes

For future enhancement, consider:
- WebSocket connections for true real-time updates
- Supabase Realtime subscriptions
- Optimistic UI updates with conflict resolution

## Security Considerations

1. **Authentication Required**: All endpoints require valid JWT
2. **RLS Policies**: Database-level security ensures users can only access plans they're members of
3. **Share ID Entropy**: 12-character hex provides 2^48 possible combinations
4. **No Public Access**: Plans are never publicly accessible, users must be authenticated
5. **Ownership Transfer**: Prevents orphaned plans when last owner leaves

## Testing Checklist

- [ ] Create a new collaborative plan
- [ ] Copy share URL
- [ ] Open share URL in incognito (should prompt login)
- [ ] Join plan as second user
- [ ] Edit plan as second user
- [ ] Verify changes visible to first user
- [ ] Leave plan as member
- [ ] Delete plan as owner
- [ ] Test ownership transfer when last owner leaves
- [ ] Test with invalid share IDs
- [ ] Test with unauthenticated users

## Migration Steps

1. Run Supabase migration: `supabase db push`
2. Restart backend to load new models and routes
3. Deploy frontend with new components
4. Test in development environment
5. Deploy to production

## Future Enhancements

1. **Real-time Sync**: WebSocket or Supabase Realtime for instant updates
2. **Conflict Resolution**: Handle simultaneous edits gracefully
3. **Activity Feed**: Show who made what changes
4. **Permissions**: More granular roles (viewer, editor, admin)
5. **Plan Templates**: Share plans as templates (read-only copies)
6. **Expiring Links**: Time-limited share URLs
7. **Invite by Email**: Send invitations directly
8. **Plan History**: Track all changes with rollback capability

## Notes

- The implementation follows the app's design language (Apple-inspired, elegant)
- All animations and transitions match existing patterns
- Error handling is consistent with the rest of the app
- Mobile-first responsive design
- Accessibility considerations (keyboard navigation, ARIA labels)
