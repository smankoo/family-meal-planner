# Cloud-First Data Persistence Implementation

**Date:** January 29, 2026
**Status:** ✅ Implemented

## Overview

Migrated the Family Meal Planner from localStorage-based persistence to a cloud-first architecture using Supabase as the single source of truth. This enables seamless cross-device synchronization and ensures users never lose their data.

## Architecture Changes

### Before (Dual Persistence)
- Data stored in **both** localStorage and Supabase
- localStorage was the primary storage, cloud was secondary
- Risk of data inconsistency between devices
- No true cross-device sync

### After (Cloud-First)
- Supabase is the **single source of truth**
- Data loads from and saves to cloud only
- Automatic migration from localStorage on first login
- localStorage cleaned up after successful migration
- True cross-device synchronization

## Implementation Details

### 1. Updated `usePersistedState` Hook

**Location:** `hooks/usePersistedState.ts`

**Key Changes:**
- Removed localStorage read/write operations
- Cloud-first data loading for authenticated users
- Automatic migration on first login
- Better error handling and logging
- In-memory state only for unauthenticated users

```typescript
// Load: Cloud-first approach
if (user?.id) {
  const cloudData = await dataService.loadData(dataType, defaultValue);
  setState(validatedData);
} else {
  setState(defaultValue); // No persistence when not logged in
}

// Save: Cloud-only
if (user?.id) {
  await dataService.saveData(dataType, newValue);
}
```

### 2. Enhanced `dataService`

**Location:** `services/dataService.ts`

**Key Changes:**
- Improved migration logic with better logging
- Automatic localStorage cleanup after migration
- Migration only runs once per user
- Better error messages

**Migration Flow:**
1. Check if user has existing cloud data
2. If yes, skip migration and clean up localStorage
3. If no, migrate all localStorage data to cloud
4. Clean up localStorage after successful migration
5. Log migration results

### 3. Data Types Persisted

All user data is stored in Supabase `user_data` table with these types:

| Data Type | Description | Example |
|-----------|-------------|---------|
| `family` | Family members info | Names, ages, preferences |
| `preferences` | Meal preferences | Cuisines, restrictions, effort level |
| `meal_plan` | Current meal plan | 7-day meal schedule |
| `prep_tasks` | Meal prep tasks | Prep instructions by day |
| `grocery_items` | Shopping list | Categorized grocery items |
| `invalidation_state` | Version tracking | Plan version numbers |
| `has_plan` | Plan existence flag | Boolean |
| `current_stage` | UI stage | Planning/Prep/Grocery |

### 4. Database Schema

**Already Implemented** in `supabase/migrations/20260128000001_initial_schema.sql`

```sql
CREATE TABLE public.user_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    data_type TEXT NOT NULL CHECK (data_type IN (...)),
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, data_type)
);
```

**Key Features:**
- Row Level Security (RLS) enabled
- Users can only access their own data
- Automatic timestamps
- JSONB for flexible data storage
- Unique constraint per user per data type

### 5. Backend API

**Location:** `backend/routers/user_data.py`

**Endpoints:**
- `GET /user-data/` - Get all user data
- `GET /user-data/{data_type}` - Get specific data type
- `PUT /user-data/{data_type}` - Upsert data (create or update)
- `DELETE /user-data/{data_type}` - Delete data
- `GET /user-data/export/all` - Export all data
- `POST /user-data/import/all` - Import data

All endpoints use Supabase JWT authentication via `get_current_user_id` dependency.

## Migration Strategy

### Automatic Migration
When a user logs in for the first time after this update:

1. **Check for existing cloud data**
   - If found: Skip migration, clean up localStorage
   - If not found: Proceed with migration

2. **Migrate localStorage data**
   - Read each data type from localStorage
   - Parse and validate JSON
   - Save to Supabase via API
   - Log success/failure for each item

3. **Clean up localStorage**
   - Remove all app-specific keys
   - Remove schema version key
   - Log cleanup completion

4. **User experience**
   - Migration happens in background
   - No user action required
   - Toast notification on error only
   - Seamless transition

### Manual Migration (if needed)
Users can export/import data using the API endpoints:

```bash
# Export data
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/user-data/export/all > backup.json

# Import data
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @backup.json \
  http://localhost:8000/user-data/import/all
```

## Benefits

### For Users
✅ **Cross-device sync** - Start on phone, continue on desktop
✅ **No data loss** - Cloud backup of all data
✅ **Seamless experience** - Automatic migration
✅ **Privacy** - RLS ensures data isolation
✅ **Reliability** - Supabase handles backups and scaling

### For Developers
✅ **Single source of truth** - No sync conflicts
✅ **Simpler code** - No dual persistence logic
✅ **Better debugging** - All data in database
✅ **Schema evolution** - Database migrations
✅ **Analytics** - Query user data patterns

## Testing Checklist

- [x] New user signup - data saves to cloud
- [x] Existing user login - data loads from cloud
- [x] Migration from localStorage - automatic on first login
- [x] Cross-device sync - changes reflect on other devices
- [x] Offline behavior - graceful degradation
- [x] Error handling - clear user feedback
- [x] RLS policies - users can't access others' data
- [x] Data validation - invalid data rejected
- [x] Performance - fast load times with request batching

## Error Handling

### Network Errors
- User sees toast notification
- App continues with last known state
- Retry logic in dataService

### Authentication Errors
- User redirected to login
- Data not saved until authenticated
- Clear error messages

### Validation Errors
- Invalid data rejected by backend
- User notified of specific issue
- Fallback to default values

## Performance Optimizations

### Request Batching
`dataService` batches concurrent requests to avoid overwhelming the backend:
- Max 3 concurrent requests
- 100ms delay between batches
- Queue-based processing

### Caching Strategy
- In-memory state cache in React
- No localStorage caching
- Fresh data on every login

### Loading States
- Individual loading states per data type
- Global loading screen on initial load
- Skeleton screens during data fetch

## Future Enhancements

### Offline Support
- Service worker for offline caching
- Queue failed requests for retry
- Sync when connection restored

### Real-time Sync
- Supabase Realtime subscriptions
- Live updates across devices
- Conflict resolution strategy

### Data Versioning
- Track data version history
- Allow rollback to previous versions
- Audit log of changes

### Optimistic Updates
- Update UI immediately
- Sync to cloud in background
- Rollback on failure

## Security Considerations

### Authentication
- Supabase JWT tokens (ES256)
- Automatic token refresh
- Secure token storage

### Authorization
- Row Level Security (RLS)
- User can only access own data
- Enforced at database level

### Data Privacy
- No PII in logs
- Encrypted at rest (Supabase)
- Encrypted in transit (HTTPS)

### API Security
- CORS configured for known domains
- Rate limiting on backend
- Input validation on all endpoints

## Rollback Plan

If issues arise, rollback is straightforward:

1. **Revert code changes**
   ```bash
   git revert <commit-hash>
   ```

2. **Database remains unchanged**
   - Schema is backward compatible
   - Data already in cloud is preserved

3. **Re-enable localStorage**
   - Uncomment localStorage operations
   - Users continue with local data

4. **No data loss**
   - Cloud data remains intact
   - Can re-attempt migration later

## Monitoring

### Metrics to Track
- Migration success rate
- Data load times
- Save operation failures
- API error rates
- User adoption of cloud sync

### Logging
- Migration events logged to console
- API errors logged to backend
- User actions tracked in analytics

## Documentation Updates

### User-Facing
- No documentation needed (transparent to users)
- Works automatically on login

### Developer-Facing
- This implementation document
- Code comments in key files
- API documentation in backend

## Conclusion

The cloud-first data persistence implementation provides a robust, scalable foundation for the Family Meal Planner. Users can now seamlessly use the app across multiple devices without worrying about data loss or sync issues. The automatic migration ensures a smooth transition for existing users, while new users benefit from cloud storage from day one.

## Related Files

- `hooks/usePersistedState.ts` - Cloud-first state hook
- `services/dataService.ts` - API client with migration
- `backend/routers/user_data.py` - Backend API endpoints
- `backend/models.py` - Database models
- `supabase/migrations/20260128000001_initial_schema.sql` - Database schema
- `App.tsx` - Main app with data initialization
