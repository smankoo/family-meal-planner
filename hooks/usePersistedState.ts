import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { dataService, DataType } from '../services/dataService';
import { loadState, saveState } from '../utils/localStorage';

export function usePersistedState<T>(
  localStorageKey: string,
  dataType: DataType,
  defaultValue: T,
  validator?: (value: any) => value is T
): [T, (value: T) => void, boolean] {
  const { user } = useAuth();
  const [state, setState] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);

  // Load initial state
  useEffect(() => {
    const loadInitialState = async () => {
      setLoading(true);

      try {
        if (user?.id) {
          // User is authenticated, try to load from cloud first
          const cloudData = await dataService.loadData(dataType, defaultValue);
          setState(validator ? (validator(cloudData) ? cloudData : defaultValue) : cloudData);
        } else {
          // User not authenticated, load from localStorage
          const localData = loadState(localStorageKey, defaultValue, validator);
          setState(localData);
        }
      } catch (error) {
        console.error(`Failed to load ${dataType}:`, error);
        // Fallback to localStorage
        const localData = loadState(localStorageKey, defaultValue, validator);
        setState(localData);
      } finally {
        setLoading(false);
      }
    };

    loadInitialState();
  }, [user?.id, localStorageKey, dataType]); // Removed defaultValue and validator from deps

  // Save state function
  const savePersistedState = useCallback(async (newValue: T) => {
    setState(newValue);

    // Always save to localStorage for offline access
    saveState(localStorageKey, newValue);

    // If user is authenticated, also save to cloud
    if (user?.id) {
      try {
        await dataService.saveData(dataType, newValue);
      } catch (error) {
        console.error(`Failed to save ${dataType} to cloud:`, error);
        // Continue - localStorage save already succeeded
      }
    }
  }, [user?.id, localStorageKey, dataType]);

  return [state, savePersistedState, loading];
}
