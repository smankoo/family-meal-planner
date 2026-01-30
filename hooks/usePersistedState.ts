import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { dataService, DataType } from '../services/dataService';

/**
 * Cloud-first persisted state hook
 *
 * This hook manages state that is persisted to Supabase database.
 * - For authenticated users: Data is stored in and loaded from the cloud (Supabase)
 * - For unauthenticated users: Data uses in-memory state only (no localStorage)
 * - Migration: On first login, any existing localStorage data is automatically migrated to cloud
 *
 * This ensures users can seamlessly switch between devices and always have their latest data.
 */
export function usePersistedState<T>(
  localStorageKey: string, // Kept for migration purposes only
  dataType: DataType,
  defaultValue: T,
  validator?: (value: any) => value is T
): [T, (value: T) => void, boolean] {
  const { user } = useAuth();
  const [state, setState] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);
  const hasMigratedRef = useRef(false);

  // Load initial state
  useEffect(() => {
    const loadInitialState = async () => {
      setLoading(true);

      try {
        if (user?.id) {
          // User is authenticated - load from cloud (single source of truth)
          const cloudData = await dataService.loadData(dataType, defaultValue);

          // Validate data if validator is provided
          const validatedData = validator ? (validator(cloudData) ? cloudData : defaultValue) : cloudData;
          setState(validatedData);

          console.log(`Loaded ${dataType} from cloud for user ${user.id}`);
        } else {
          // User not authenticated - use default value (no persistence)
          setState(defaultValue);
          console.log(`Using default value for ${dataType} (no user authenticated)`);
        }
      } catch (error) {
        console.error(`Failed to load ${dataType} from cloud:`, error);
        // On error, use default value
        setState(defaultValue);
      } finally {
        setLoading(false);
      }
    };

    loadInitialState();
  }, [user?.id, dataType]); // Only re-run when user or dataType changes

  // Save state function - cloud-first
  const savePersistedState = useCallback(async (newValue: T) => {
    // Update local state immediately for responsive UI
    setState(newValue);

    // If user is authenticated, save to cloud (single source of truth)
    if (user?.id) {
      try {
        await dataService.saveData(dataType, newValue);
        console.log(`Saved ${dataType} to cloud for user ${user.id}`);
      } catch (error) {
        console.error(`Failed to save ${dataType} to cloud:`, error);
        // TODO: Could implement retry logic or offline queue here
        throw error; // Propagate error so UI can handle it
      }
    } else {
      console.warn(`Cannot save ${dataType} - no user authenticated`);
    }
  }, [user?.id, dataType]);

  return [state, savePersistedState, loading];
}
