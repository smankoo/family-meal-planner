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
 * - Debouncing: Saves are debounced to avoid overwhelming the backend during rapid updates
 * - Streaming support: Can skip persistence during streaming to avoid saving incomplete data
 *
 * This ensures users can seamlessly switch between devices and always have their latest data.
 */
export function usePersistedState<T>(
  localStorageKey: string, // Kept for migration purposes only
  dataType: DataType,
  defaultValue: T,
  validator?: (value: any) => value is T,
  skipPersistence?: boolean // Optional flag to skip persistence (e.g., during streaming)
): [T, (value: T, skipSave?: boolean) => void, boolean] {
  const { user } = useAuth();
  const [state, setState] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSaveRef = useRef<T | null>(null);

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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        // Flush any pending save
        if (pendingSaveRef.current && user?.id) {
          dataService.saveData(dataType, pendingSaveRef.current);
        }
      }
    };
  }, [user?.id, dataType]);

  // Save state function - cloud-first with debouncing
  const savePersistedState = useCallback((newValue: T | ((prev: T) => T), skipSave: boolean = false) => {
    // Handle both direct value and updater function
    const valueToSet = typeof newValue === 'function'
      ? (newValue as (prev: T) => T)(state)
      : newValue;

    // Update local state immediately for responsive UI
    setState(valueToSet);

    // Skip persistence if explicitly requested (e.g., during streaming)
    if (skipSave || skipPersistence) {
      console.log(`Skipping persistence for ${dataType} (skipSave=${skipSave}, skipPersistence=${skipPersistence})`);
      return;
    }

    // If user is authenticated, schedule a debounced save to cloud
    if (user?.id) {
      // Store the pending value
      pendingSaveRef.current = valueToSet;

      // Clear any existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Schedule a new save after debounce delay
      saveTimeoutRef.current = setTimeout(async () => {
        const valueToSave = pendingSaveRef.current;
        pendingSaveRef.current = null;

        if (valueToSave !== null) {
          // Skip saving empty meal plans (skeleton loading state)
          if (dataType === 'meal_plan' && isEmptyMealPlan(valueToSave)) {
            console.log(`Skipping save of empty meal_plan`);
            return;
          }

          try {
            await dataService.saveData(dataType, valueToSave);
            console.log(`✓ Saved ${dataType} to cloud for user ${user.id}`);
          } catch (error) {
            console.error(`Failed to save ${dataType} to cloud:`, error);
            // TODO: Could implement retry logic or offline queue here
          }
        }
      }, 2000); // 2 second debounce - longer to handle streaming better
    } else {
      console.warn(`Cannot save ${dataType} - no user authenticated`);
    }
  }, [user?.id, dataType, skipPersistence, state]);

  return [state, savePersistedState, loading];
}

// Helper function to check if a meal plan is empty
function isEmptyMealPlan(value: any): boolean {
  if (!value || typeof value !== 'object') return false;
  if (!value.present || !Array.isArray(value.present)) return false;

  // Check if all meals in the present plan are empty
  return value.present.every((day: any) => {
    if (!day.meals || typeof day.meals !== 'object') return true;
    return Object.values(day.meals).every((meal: any) => {
      return !meal || !meal.name || meal.name.trim() === '';
    });
  });
}
