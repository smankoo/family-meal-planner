# Collaborative Meal Plan Sharing

## Overview

Collaborative plans enable multiple users to share and edit the same meal plan in real-time. Users can share plans via simple URLs with short, readable share IDs.

## Features

- ✅ Share plans via URL
- ✅ Role-based access (owner/member)
- ✅ Real-time collaboration (on refresh)
- ✅ Automatic ownership transfer
- ✅ Simple 12-character share IDs

## Architecture

### Database Schema

```sql
-- Collaborative plans table
CREATE TABLE collaborative_plans (
    id UUID PRIMARY KEY,
    share_id TEXT UNIQUE NOT NULL,  -- 12-char hex
    plan_data JSONB,
    family_data JSONB,
    preferences_data JSONB,
    prep_tasks JSONB,
    grocery_items JSONB,
    invalidation_state JSONB,
    has_plan TEXT,
    current_stage TEXT,
    title TEXT,
    created_by UUID REFERENCES profiles(id),
    last_modified_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Plan members table (access control)
CREATE TABLE plan_members (
    id UUID PRIMARY KEY,
    plan_id UUID REFERENCES collaborative_plans(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('owner', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_viewed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(plan_id, user_id)
);
```

### Share ID Generation

```python
import secrets

def generate_share_id() -> str:
    """Generate a short, readable share ID."""
    return secrets.token_hex(6).lower()  # 12 characters
```

**Properties**:
- Length: 12 characters
- Format: Lowercase hex
- Entropy: 2^48 combinations (~281 trillion)
- Collision probability: Negligible

## User Flows

### Creating a Shared Plan

```
1. User has meal plan
2. User clicks "Share Plan"
3. Modal opens with explanation
4. User clicks "Create Share Link"
5. Backend creates collaborative_plan
6. Backend adds user as owner
7. Share URL displayed with copy button
8. User copies and shares URL
```

**Implementation** (`App.tsx`):

```typescript
const handleSharePlan = async () => {
  if (activePlanId) {
    // Already shared, just show modal
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
    const url = `${window.location.origin}/?share=${response.share_id}`;
    setShareUrl(url);
    setShareModalOpen(true);

    showToast('Share link created!', 'success');
  } catch (error) {
    showToast('Failed to create share link', 'error');
  } finally {
    setIsSharing(false);
  }
};
```

### Joining a Shared Plan

```
1. User receives share URL
2. User opens URL (redirected to login if not authenticated)
3. After login, app detects ?share=<id> parameter
4. App fetches plan details
5. App checks if user is already a member
6. If not, app adds user as member
7. Plan data loads into app
8. User can now view and edit
```

**Implementation** (`App.tsx`):

```typescript
useEffect(() => {
  const handleSharedPlanAccess = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const shareId = urlParams.get('share');

    if (shareId && user) {
      try {
        // Get plan details
        const plan = await apiService.getPlanByShareId(shareId);

        // Check if already a member
        const isMember = plan.members?.some((m: any) => m.user_id === user.id);

        if (!isMember) {
          // Join the plan
          await apiService.joinCollaborativePlan(shareId);
          showToast('Joined collaborative plan!', 'success');
        }

        // Load plan data
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

        // Clear URL parameter
        window.history.replaceState({}, '', window.location.pathname);

      } catch (error) {
        showToast('Failed to load shared plan', 'error');
      }
    }
  };

  if (!isDataLoading && user) {
    handleSharedPlanAccess();
  }
}, [isDataLoading, user]);
```

### Editing a Shared Plan

```
1. Member makes changes to plan
2. Changes saved to collaborative_plan
3. Other members see changes on refresh
```

**Implementation**:

```typescript
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

// Call after any plan changes
useEffect(() => {
  if (activePlanId && !isLoading) {
    saveToCollaborativePlan();
  }
}, [planHistory.present, prepTasks, groceryItems]);
```

## API Endpoints

### Create Collaborative Plan

```python
POST /collaborative-plans/
```

**Request**:
```json
{
  "plan_data": [...],
  "family_data": [...],
  "preferences_data": {...},
  "prep_tasks": [...],
  "grocery_items": [...],
  "invalidation_state": {...},
  "has_plan": "true",
  "current_stage": "0",
  "title": "Family's Meal Plan"
}
```

**Response**:
```json
{
  "id": "uuid",
  "share_id": "abc123def456",
  "plan_data": [...],
  "created_by": "user-uuid",
  "created_at": "2026-02-03T12:00:00Z",
  "members": [
    {
      "user_id": "user-uuid",
      "role": "owner"
    }
  ]
}
```

### Get Plan by Share ID

```python
GET /collaborative-plans/by-share-id/{share_id}
```

**Response**:
```json
{
  "id": "uuid",
  "share_id": "abc123def456",
  "plan_data": [...],
  "family_data": [...],
  "members": [...]
}
```

### Join Plan

```python
POST /collaborative-plans/join
```

**Request**:
```json
{
  "share_id": "abc123def456"
}
```

**Response**:
```json
{
  "message": "Successfully joined plan",
  "plan_id": "uuid"
}
```

### Update Plan

```python
PUT /collaborative-plans/{plan_id}
```

**Request**:
```json
{
  "plan_data": [...],
  "family_data": [...],
  "prep_tasks": [...]
}
```

### Leave Plan

```python
POST /collaborative-plans/{plan_id}/leave
```

**Response**:
```json
{
  "message": "Successfully left plan"
}
```

**Note**: If last owner leaves, ownership transfers to another member.

### Delete Plan

```python
DELETE /collaborative-plans/{plan_id}
```

**Authorization**: Owner only

## Row Level Security

```sql
-- Members can view plans they belong to
CREATE POLICY "Members can view plans"
    ON collaborative_plans FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM plan_members
            WHERE plan_id = collaborative_plans.id
            AND user_id = auth.uid()
        )
    );

-- Members can update plans
CREATE POLICY "Members can update plans"
    ON collaborative_plans FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM plan_members
            WHERE plan_id = collaborative_plans.id
            AND user_id = auth.uid()
        )
    );

-- Only owners can delete plans
CREATE POLICY "Owners can delete plans"
    ON collaborative_plans FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM plan_members
            WHERE plan_id = collaborative_plans.id
            AND user_id = auth.uid()
            AND role = 'owner'
        )
    );
```

## Share Modal UI

**Location**: `components/ShareModal.tsx`

```typescript
interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
  onShare: () => void;
  isSharing: boolean;
}

export default function ShareModal({
  isOpen,
  onClose,
  shareUrl,
  onShare,
  isSharing
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-container">
        <div className="modal-header">
          <h2>Share Meal Plan</h2>
          <button onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          {!shareUrl ? (
            // Pre-share state
            <>
              <p>Share this meal plan with family members.</p>
              <p className="text-secondary">
                Anyone with the link can view and edit this plan.
              </p>
              <button
                onClick={onShare}
                disabled={isSharing}
                className="btn-primary"
              >
                {isSharing ? 'Creating...' : 'Create Share Link'}
              </button>
            </>
          ) : (
            // Post-share state
            <>
              <p>Share this link with family members:</p>
              <div className="share-url-container">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="input"
                />
                <button onClick={handleCopy} className="btn-secondary">
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className="text-secondary">
                Anyone with this link can view and edit the plan.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
```

## Security Considerations

### Share ID Security

**Entropy**: 2^48 combinations
- Guessing probability: ~1 in 281 trillion
- Brute force: Impractical

**Mitigation**:
- Rate limiting (future)
- Expiring links (future)
- Access revocation (future)

### Authentication Required

- All endpoints require valid JWT
- Unauthenticated users redirected to login
- No public access to plans

### Authorization

- RLS enforced at database level
- Users can only access plans they're members of
- Only owners can delete plans

## Real-Time Sync (Future)

### Current: Refresh-Based

```
User A makes changes → Saves to database
User B refreshes page → Loads latest data
```

### Future: Real-Time

```
User A makes changes → Saves to database → Supabase Realtime
                                           ↓
User B receives update ← WebSocket ← Supabase Realtime
```

**Implementation** (future):

```typescript
// Subscribe to plan changes
const subscription = supabase
  .channel(`plan:${planId}`)
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'collaborative_plans',
      filter: `id=eq.${planId}`
    },
    (payload) => {
      // Update local state with new data
      setPlanHistory({
        past: [],
        present: payload.new.plan_data,
        future: []
      });
    }
  )
  .subscribe();

// Cleanup
return () => {
  subscription.unsubscribe();
};
```

## Testing

### Manual Testing

**Create and Share**:
```bash
1. Sign in as User A
2. Create meal plan
3. Click "Share Plan"
4. Click "Create Share Link"
5. Copy share URL
6. Verify: URL contains share_id
```

**Join and Edit**:
```bash
1. Sign in as User B (different account)
2. Open share URL
3. Verify: Prompted to join
4. Click "Join"
5. Verify: Plan loads
6. Make changes
7. Save
8. Sign in as User A on different device
9. Refresh
10. Verify: Changes appear
```

**Ownership Transfer**:
```bash
1. Create plan with User A (owner)
2. User B joins (member)
3. User A leaves plan
4. Verify: User B becomes owner
5. Verify: User B can delete plan
```

### Automated Testing (Future)

```typescript
describe('Collaborative Plans', () => {
  it('should create shareable plan', async () => {
    // Test implementation
  });

  it('should allow member to join', async () => {
    // Test implementation
  });

  it('should sync changes across users', async () => {
    // Test implementation
  });

  it('should transfer ownership when last owner leaves', async () => {
    // Test implementation
  });
});
```

## Troubleshooting

### Share Link Not Working

**Check**:
1. User is authenticated
2. Share ID is correct
3. Plan still exists
4. User has network connection

### Changes Not Syncing

**Check**:
1. User is authenticated
2. User is a member of the plan
3. Network connection is working
4. Other user has refreshed page

### Cannot Delete Plan

**Check**:
1. User is the owner (not just member)
2. User is authenticated
3. Plan ID is correct

## Future Enhancements

### Real-Time Sync
- WebSocket connections
- Instant updates without refresh
- Conflict resolution

### Advanced Permissions
- Viewer role (read-only)
- Editor role (can edit but not delete)
- Admin role (full control)

### Activity Feed
- Track who made what changes
- Show recent activity
- Notification system

### Expiring Links
- Time-limited share URLs
- Configurable expiration
- Automatic cleanup

### Email Invitations
- Send invites directly
- Track invitation status
- Resend invitations

## Related Documentation

- [Authentication System](./authentication.md)
- [Data Persistence](./data-persistence.md)
- [API Documentation](../architecture/04-building-blocks.md#api-endpoints)
