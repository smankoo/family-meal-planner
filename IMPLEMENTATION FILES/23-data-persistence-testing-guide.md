# Data Persistence Testing Guide

**Date:** January 29, 2026
**Related:** 22-cloud-first-data-persistence.md

## Testing Overview

This guide provides step-by-step instructions for testing the cloud-first data persistence implementation.

## Prerequisites

- App running locally (`npm run dev` or `./scripts/dev.sh`)
- Supabase instance running (local or cloud)
- Test user account(s)
- Browser DevTools open (Console tab)

## Test Scenarios

### 1. New User Experience

**Objective:** Verify new users get cloud storage from the start

**Steps:**
1. Open app in incognito/private window
2. Sign up with a new email
3. Complete family setup
4. Generate a meal plan
5. Open browser DevTools Console
6. Look for logs: "Saved [data_type] to cloud for user [user_id]"

**Expected Results:**
- ✅ All data saves show cloud save logs
- ✅ No localStorage operations in logs
- ✅ Data persists after page refresh
- ✅ No migration messages (new user has no localStorage data)

**Verification:**
```javascript
// In browser console
console.log('localStorage keys:', Object.keys(localStorage).filter(k => k.startsWith('fmp_')));
// Should return: [] (empty array)
```

---

### 2. Existing User Migration

**Objective:** Verify automatic migration from localStorage to cloud

**Setup:**
1. Stop the app
2. Manually add localStorage data:
```javascript
// In browser console (before logging in)
localStorage.setItem('fmp_family', JSON.stringify([
  {id: '1', name: 'Test User', age: 30, role: 'Adult', likes: 'Pizza', dislikes: 'Olives'}
]));
localStorage.setItem('fmp_has_plan', 'false');
```

**Steps:**
1. Start the app
2. Log in with existing account
3. Watch Console for migration logs
4. Verify data appears in UI
5. Check localStorage is cleaned up

**Expected Results:**
- ✅ Console shows: "Starting migration from localStorage to cloud..."
- ✅ Console shows: "✓ Migrated [data_type] from localStorage"
- ✅ Console shows: "localStorage cleanup completed"
- ✅ Family data appears in UI
- ✅ localStorage keys are removed

**Verification:**
```javascript
// After migration
console.log('localStorage keys:', Object.keys(localStorage).filter(k => k.startsWith('fmp_')));
// Should return: [] (empty array)
```

---

### 3. Cross-Device Synchronization

**Objective:** Verify data syncs across devices

**Steps:**
1. **Device 1 (Desktop):**
   - Log in
   - Create family setup
   - Generate meal plan
   - Note specific meal names

2. **Device 2 (Mobile/Another Browser):**
   - Log in with same account
   - Wait for data to load
   - Verify same family and meal plan appear

3. **Device 1:**
   - Make changes to meal plan
   - Wait for save to complete

4. **Device 2:**
   - Refresh page
   - Verify changes appear

**Expected Results:**
- ✅ Same data appears on both devices
- ✅ Changes on one device appear on other after refresh
- ✅ No data conflicts or overwrites

---

### 4. Offline Behavior

**Objective:** Verify graceful degradation when offline

**Steps:**
1. Log in and load data
2. Open DevTools Network tab
3. Set to "Offline" mode
4. Try to make changes (add family member, update plan)
5. Check Console for error messages
6. Go back online
7. Refresh page

**Expected Results:**
- ✅ App shows error toast when save fails
- ✅ Console logs: "Failed to save [data_type] to cloud"
- ✅ UI remains functional (doesn't crash)
- ✅ After going online and refreshing, last saved state loads

---

### 5. Data Validation

**Objective:** Verify invalid data is rejected

**Steps:**
1. Open browser DevTools Console
2. Try to save invalid data directly:
```javascript
// This should fail validation
fetch('http://localhost:8000/user-data/invalid_type', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + 'YOUR_TOKEN'
  },
  body: JSON.stringify({ data: { test: 'data' } })
});
```

**Expected Results:**
- ✅ Backend returns 400 Bad Request
- ✅ Error message: "Invalid data_type"
- ✅ Data not saved to database

---

### 6. Row Level Security (RLS)

**Objective:** Verify users can't access other users' data

**Setup:**
1. Create two test accounts (User A, User B)
2. User A creates meal plan
3. Note User A's user_id from Console logs

**Steps:**
1. Log in as User B
2. Try to access User A's data via API:
```javascript
// In browser console as User B
fetch('http://localhost:8000/user-data/meal_plan', {
  headers: {
    'Authorization': 'Bearer ' + 'USER_B_TOKEN'
  }
});
```

**Expected Results:**
- ✅ User B only sees their own data
- ✅ User B cannot access User A's data
- ✅ RLS policies enforced at database level

---

### 7. Performance Testing

**Objective:** Verify fast load times with request batching

**Steps:**
1. Clear all data
2. Log in
3. Open DevTools Network tab
4. Watch initial data load
5. Count number of API requests
6. Note load time

**Expected Results:**
- ✅ Multiple data types loaded in batches (max 3 concurrent)
- ✅ Total load time < 2 seconds
- ✅ No request flooding
- ✅ Smooth UI experience

---

### 8. Error Recovery

**Objective:** Verify app recovers from errors gracefully

**Test 8a: Network Error During Save**
1. Start making changes
2. Disconnect network mid-save
3. Observe error handling

**Expected Results:**
- ✅ Error toast appears
- ✅ User can retry
- ✅ App doesn't crash

**Test 8b: Invalid Token**
1. Manually expire auth token
2. Try to save data

**Expected Results:**
- ✅ User redirected to login
- ✅ Clear error message
- ✅ Data not lost (can retry after login)

---

### 9. Data Export/Import

**Objective:** Verify backup and restore functionality

**Steps:**
1. Create meal plan with data
2. Export data:
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/user-data/export/all > backup.json
```
3. Delete all data from UI
4. Import data:
```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @backup.json \
  http://localhost:8000/user-data/import/all
```
5. Refresh page

**Expected Results:**
- ✅ Export creates valid JSON file
- ✅ Import restores all data
- ✅ Data appears correctly in UI

---

### 10. Migration Edge Cases

**Test 10a: Partial localStorage Data**
1. Add only some localStorage keys
2. Log in
3. Verify partial migration works

**Test 10b: Corrupted localStorage Data**
1. Add invalid JSON to localStorage
2. Log in
3. Verify migration skips corrupted data

**Test 10c: Already Migrated User**
1. Log in (migration happens)
2. Log out
3. Log in again
4. Verify migration doesn't run twice

**Expected Results:**
- ✅ Partial data migrates successfully
- ✅ Corrupted data skipped with warning
- ✅ Migration only runs once per user
- ✅ Console shows: "User already has cloud data, skipping migration"

---

## Automated Testing

### Unit Tests (Future)
```typescript
// Example test structure
describe('usePersistedState', () => {
  it('loads data from cloud for authenticated users', async () => {
    // Test implementation
  });

  it('uses default value for unauthenticated users', () => {
    // Test implementation
  });

  it('saves data to cloud only', async () => {
    // Test implementation
  });
});
```

### Integration Tests (Future)
```typescript
describe('Data Persistence Flow', () => {
  it('migrates localStorage data on first login', async () => {
    // Test implementation
  });

  it('syncs data across devices', async () => {
    // Test implementation
  });
});
```

---

## Monitoring Checklist

After deployment, monitor these metrics:

- [ ] Migration success rate (should be >95%)
- [ ] Average data load time (should be <2s)
- [ ] Save operation failures (should be <1%)
- [ ] API error rates (should be <0.5%)
- [ ] User complaints about data loss (should be 0)

---

## Troubleshooting

### Issue: Data not loading
**Check:**
1. User is authenticated (check auth token)
2. Network connection is working
3. Backend is running
4. Supabase is accessible
5. Console for error messages

### Issue: Migration not happening
**Check:**
1. User has localStorage data
2. User doesn't already have cloud data
3. Console for migration logs
4. Network connection during migration

### Issue: Data not saving
**Check:**
1. User is authenticated
2. Network connection is working
3. Backend API is responding
4. Console for error messages
5. Check backend logs for validation errors

### Issue: Cross-device sync not working
**Check:**
1. Same user account on both devices
2. Both devices have network connection
3. Page refreshed on second device
4. No caching issues (hard refresh)

---

## Success Criteria

The implementation is successful if:

✅ New users get cloud storage automatically
✅ Existing users migrate seamlessly
✅ Data syncs across devices
✅ No localStorage dependencies remain
✅ Error handling is graceful
✅ Performance is acceptable (<2s load)
✅ Security (RLS) is enforced
✅ No data loss reported

---

## Rollback Procedure

If critical issues are found:

1. **Immediate:** Revert code changes
   ```bash
   git revert <commit-hash>
   git push
   ```

2. **Database:** No changes needed (schema is compatible)

3. **Communication:** Notify users of temporary localStorage fallback

4. **Investigation:** Debug issues in staging environment

5. **Re-deployment:** Fix issues and redeploy when ready

---

## Sign-off

- [ ] All test scenarios passed
- [ ] No critical bugs found
- [ ] Performance acceptable
- [ ] Security verified
- [ ] Documentation complete
- [ ] Team reviewed and approved

**Tested by:** _________________
**Date:** _________________
**Approved by:** _________________
**Date:** _________________
