# Cloud-First Data Persistence

## Overview

The Family Meal Planner uses a **cloud-first** data persistence strategy with Supabase as the single source of truth. This enables seamless cross-device synchronization and ensures users never lose their data.

## Architecture

### Before (Dual Persistence)
```
User Action → localStorage + Supabase
              ↓              ↓
         Local Storage   Cloud Storage
              ↓              ↓
         Sync conflicts possible
```

### After (Cloud-First)
```
User Action → Supabase (single source of truth)
              ↓
         Cloud Storage
              ↓
         Cross-device sync
```

## Data Types

All user data is stored in the `user_data` table with these types:

| Data Type | Description | Example |
|-----------|-------------|---------|
| `family` | Family members | Names, ages, preferences |
| `preferences` | Meal preferences | Cuisines, restrictions |
| `meal_plan` | Current meal plan | 7-day schedule |
| `prep_tasks` | Meal prep tasks | Prep instructions |
| `grocery_items` | Shopping list | Categorized items |
| `invalidation_state` | Version tracking | Plan versions |
| `has_plan` | Plan existence flag | Boolean |
| `current_stage` | UI stage | Planning/Prep/Grocery |

## Implementation

### usePersistedState Hook

**Location**: `hooks/usePersistedState.ts`

```typescript
export function usePersistedState<T>(
  dataType: DataType,
  defaultValue: T
): [T, (value: T) => void] {
  const { user } = useAuth();
  const [state, setState] = useState<T>(defaultValue);
  const [isLoading, setIsLoading] = useState(true);

  // Load from cloud on mount
  useEffect(() => {
    if (user?.id) {
      loadFromCloud();
    } else {
      setState(defaultValue);
      setIsLoading(false);
    }
  }, [user?.id]);

  // Save to cloud on change
  useEffect(() => {
    if (user?.id && !isLoading) {
      saveToCloud(state);
    }
  }, [state, user?.id, isLoading]);

  return [state, setState];
}
```

**Key Features**:
- Loads from cloud for authenticated users
- Saves to cloud automatically on change
- Uses default value for unauthenticated users
- Handles migration from localStorage

### Data Service

**Location**: `services/dataService.ts`

```typescript
class DataService {
  private userId: string | null = null;
  private requestQueue: QueuedRequest[] = [];
  private readonly MAX_CONCURRENT_REQUESTS = 3;

  async loadData<T>(dataType: DataType, defaultValue: T): Promise<T> {
    if (!this.userId) return defaultValue;

    try {
      const response = await fetch(
        `${this.baseUrl}/user-data/${dataType}`,
        { headers: await this.getAuthHeaders() }
      );

      if (response.status === 404) {
        return defaultValue; // No data yet
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error(`Failed to load ${dataType}:`, error);
      return defaultValue;
    }
  }

  async saveData<T>(dataType: DataType, data: T): Promise<void> {
    if (!this.userId) return;

    try {
      await fetch(
        `${this.baseUrl}/user-data/${dataType}`,
        {
          method: 'PUT',
          headers: await this.getAuthHeaders(),
          body: JSON.stringify({ data })
        }
      );
    } catch (error) {
      console.error(`Failed to save ${dataType}:`, error);
      throw error;
    }
  }
}
```

**Key Features**:
- Request batching (max 3 concurrent)
- Automatic migration from localStorage
- Error handling with fallbacks
- Authentication header management

### Backend API

**Location**: `backend/routers/user_data.py`

```python
@router.get("/user-data/{data_type}")
async def get_user_data(
    data_type: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Get specific data type for authenticated user."""
    user_data = db.query(UserData).filter(
        UserData.user_id == user_id,
        UserData.data_type == data_type
    ).first()

    if not user_data:
        raise HTTPException(status_code=404, detail="Data not found")

    return user_data

@router.put("/user-data/{data_type}")
async def upsert_user_data(
    data_type: str,
    request: UserDataUpdate,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Create or update data for authenticated user."""
    user_data = db.query(UserData).filter(
        UserData.user_id == user_id,
        UserData.data_type == data_type
    ).first()

    if user_data:
        # Update existing
        user_data.data = request.data
        user_data.updated_at = func.now()
    else:
        # Create new
        user_data = UserData(
            user_id=user_id,
            data_type=data_type,
            data=request.data
        )
        db.add(user_data)

    db.commit()
    db.refresh(user_data)

    return user_data
```

## Migration from localStorage

### Automatic Migration

When a user logs in for the first time after the cloud-first update:

```typescript
async function migrateFromLocalStorage(userId: string) {
  console.log('Starting migration from localStorage to cloud...');

  // Check if user already has cloud data
  const hasCloudData = await checkForCloudData(userId);
  if (hasCloudData) {
    console.log('User already has cloud data, skipping migration');
    cleanupLocalStorage();
    return;
  }

  // Migrate each data type
  const dataTypes: DataType[] = [
    'family', 'preferences', 'meal_plan',
    'prep_tasks', 'grocery_items', 'invalidation_state',
    'has_plan', 'current_stage'
  ];

  for (const dataType of dataTypes) {
    try {
      const localData = localStorage.getItem(`fmp_${dataType}`);
      if (localData) {
        const parsed = JSON.parse(localData);
        await dataService.saveData(dataType, parsed);
        console.log(`✓ Migrated ${dataType} from localStorage`);
      }
    } catch (error) {
      console.warn(`Failed to migrate ${dataType}:`, error);
    }
  }

  // Clean up localStorage
  cleanupLocalStorage();
  console.log('Migration completed');
}

function cleanupLocalStorage() {
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith('fmp_')) {
      localStorage.removeItem(key);
    }
  });
  console.log('localStorage cleanup completed');
}
```

### Migration Flow

```
1. User logs in
   ↓
2. Check for existing cloud data
   ↓
3a. If cloud data exists:
    - Skip migration
    - Clean up localStorage
    - Load from cloud
   ↓
3b. If no cloud data:
    - Read from localStorage
    - Save to cloud
    - Clean up localStorage
    - Load from cloud
```

## Cross-Device Synchronization

### Scenario: Desktop → Mobile

```
Desktop:
1. User logs in
2. Creates meal plan
3. Data saved to Supabase
   ↓
Mobile:
4. User logs in (same account)
5. Data loaded from Supabase
6. Same meal plan appears
```

### Scenario: Simultaneous Editing

```
Device A:
1. User makes changes
2. Saves to Supabase
   ↓
Device B:
3. User refreshes page
4. Loads latest data from Supabase
5. Sees changes from Device A
```

**Note**: Real-time sync (without refresh) is a future enhancement using Supabase Realtime.

## Request Batching

To prevent overwhelming the backend, the data service batches concurrent requests:

```typescript
private async processQueue() {
  if (this.isProcessingQueue || this.requestQueue.length === 0) {
    return;
  }

  this.isProcessingQueue = true;

  while (this.requestQueue.length > 0) {
    // Process max 3 requests at a time
    const batch = this.requestQueue.splice(0, this.MAX_CONCURRENT_REQUESTS);

    const promises = batch.map(async (request) => {
      try {
        const result = await this.loadDataDirect(
          request.dataType,
          request.defaultValue
        );
        request.resolve(result);
      } catch (error) {
        request.reject(error);
      }
    });

    await Promise.all(promises);

    // Small delay between batches
    if (this.requestQueue.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  this.isProcessingQueue = false;
}
```

**Benefits**:
- Prevents backend overload
- Improves perceived performance
- Reduces database connections
- Better error handling

## Error Handling

### Network Errors

```typescript
try {
  await dataService.saveData('meal_plan', plan);
} catch (error) {
  // Show user-friendly error
  showToast('Failed to save. Please try again.', 'error');

  // Data remains in memory
  // User can retry when online
}
```

### Authentication Errors

```typescript
if (response.status === 401) {
  // Token expired or invalid
  showToast('Session expired. Please sign in again.', 'error');
  navigate('/auth');
}
```

### Validation Errors

```typescript
if (response.status === 400) {
  const error = await response.json();
  showToast(`Invalid data: ${error.detail}`, 'error');
}
```

## Data Export/Import

### Export All Data

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/user-data/export/all > backup.json
```

**Response**:
```json
{
  "family": [...],
  "preferences": {...},
  "meal_plan": [...],
  "prep_tasks": [...],
  "grocery_items": [...],
  "invalidation_state": {...},
  "has_plan": "true",
  "current_stage": "0"
}
```

### Import Data

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @backup.json \
  http://localhost:8000/user-data/import/all
```

## Testing

### Test Scenarios

**1. New User**:
```bash
1. Sign up with new account
2. Create meal plan
3. Verify data in Supabase Dashboard
4. Refresh page
5. Verify data persists
```

**2. Existing User Migration**:
```bash
1. Add data to localStorage manually
2. Sign in
3. Verify migration logs in console
4. Verify data in Supabase Dashboard
5. Verify localStorage cleaned up
```

**3. Cross-Device Sync**:
```bash
1. Sign in on desktop
2. Create meal plan
3. Sign in on mobile (same account)
4. Verify same meal plan appears
5. Make changes on mobile
6. Refresh desktop
7. Verify changes appear
```

**4. Offline Behavior**:
```bash
1. Sign in and load data
2. Go offline (DevTools Network tab)
3. Try to make changes
4. Verify error message
5. Go online
6. Retry save
7. Verify success
```

## Performance Optimization

### Caching Strategy

```typescript
// In-memory cache
private cache = new Map<string, any>();

async loadData<T>(dataType: DataType, defaultValue: T): Promise<T> {
  // Check cache first
  if (this.cache.has(dataType)) {
    return this.cache.get(dataType);
  }

  // Load from cloud
  const data = await this.loadFromCloud(dataType, defaultValue);

  // Cache result
  this.cache.set(dataType, data);

  return data;
}
```

### Debounced Saves

```typescript
// Debounce saves to reduce API calls
const debouncedSave = debounce(async (dataType, data) => {
  await dataService.saveData(dataType, data);
}, 1000); // Wait 1 second after last change
```

## Security

### Row Level Security

```sql
-- Users can only access their own data
CREATE POLICY "Users can view own data"
    ON user_data FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data"
    ON user_data FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data"
    ON user_data FOR UPDATE
    USING (auth.uid() = user_id);
```

### Data Validation

```python
# Backend validation
class UserDataUpdate(BaseModel):
    data: dict

    @validator('data')
    def validate_data(cls, v):
        if not isinstance(v, dict):
            raise ValueError('Data must be a dictionary')
        return v
```

## Monitoring

### Key Metrics

- Migration success rate: > 95%
- Average load time: < 2 seconds
- Save operation failures: < 1%
- API error rates: < 0.5%

### Logging

```typescript
// Frontend logging
console.log('Saved family data to cloud for user:', userId);
console.log('Loaded meal plan from cloud');
console.error('Failed to save data:', error);
```

```python
# Backend logging
logger.info(f"User {user_id} loaded {data_type}")
logger.error(f"Failed to save {data_type}: {error}")
```

## Troubleshooting

### Data Not Loading

**Check**:
1. User is authenticated
2. Network connection is working
3. Backend is running
4. Supabase is accessible
5. Console for error messages

### Data Not Saving

**Check**:
1. User is authenticated
2. Network connection is working
3. Backend API is responding
4. Console for error messages
5. Backend logs for validation errors

### Migration Not Happening

**Check**:
1. User has localStorage data
2. User doesn't already have cloud data
3. Console for migration logs
4. Network connection during migration

## Related Documentation

- [Authentication System](./authentication.md)
- [Database Schema](../architecture/04-building-blocks.md#database-container)
- [API Documentation](../architecture/04-building-blocks.md#api-endpoints)
