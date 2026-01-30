import { FamilyMember, FamilyPreferences, WeekPlan, PrepTask, GroceryItem, PlanHistory, InvalidationState } from '../types';
import { supabase } from '../config/supabase';

// Backend API URL - use environment variable in production
// Empty string from build means env var wasn't set, so fall back to localhost
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export type DataType = 'family' | 'preferences' | 'meal_plan' | 'prep_tasks' | 'grocery_items' | 'invalidation_state' | 'has_plan' | 'current_stage';

interface UserData {
  id?: string;
  user_id: string;
  data_type: DataType;
  data: any;
  created_at?: string;
  updated_at?: string;
}

interface QueuedRequest {
  dataType: DataType;
  defaultValue: any;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

class DataService {
  private userId: string | null = null;
  private baseUrl = API_BASE_URL;
  private requestQueue: QueuedRequest[] = [];
  private isProcessingQueue = false;
  private readonly MAX_CONCURRENT_REQUESTS = 3;
  private readonly REQUEST_DELAY = 100; // ms between requests

  setUserId(userId: string | null) {
    this.userId = userId;
  }

  private async getAuthHeaders(): Promise<HeadersInit> {
    // Get Supabase session token
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  private async processQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      // Process requests in batches
      const batch = this.requestQueue.splice(0, this.MAX_CONCURRENT_REQUESTS);

      const promises = batch.map(async (request) => {
        try {
          const result = await this.loadDataDirect(request.dataType, request.defaultValue);
          request.resolve(result);
        } catch (error) {
          request.reject(error);
        }
      });

      await Promise.all(promises);

      // Small delay between batches to prevent overwhelming the backend
      if (this.requestQueue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, this.REQUEST_DELAY));
      }
    }

    this.isProcessingQueue = false;
  }

  private async loadDataDirect<T>(dataType: DataType, defaultValue: T): Promise<T> {
    if (!this.userId) {
      return defaultValue;
    }

    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/user-data/${dataType}`, {
        method: 'GET',
        headers
      });

      if (response.status === 404) {
        // No data found, return default
        return defaultValue;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('Error loading data from cloud:', errorData);
        return defaultValue;
      }

      const result = await response.json();
      return result.data || defaultValue;
    } catch (error) {
      console.error('Failed to load data from cloud:', error);
      return defaultValue;
    }
  }

  async saveData(dataType: DataType, data: any): Promise<void> {
    if (!this.userId) {
      console.warn('No user ID set, skipping cloud save');
      return;
    }

    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/user-data/${dataType}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ data })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error(`Error saving ${dataType} to cloud (${response.status}):`, errorData);
        throw new Error(errorData.message || 'Failed to save data');
      }
    } catch (error) {
      console.error(`Failed to save ${dataType} to cloud:`, error);
      // Don't throw - allow app to continue with local storage
    }
  }

  async loadData<T>(dataType: DataType, defaultValue: T): Promise<T> {
    if (!this.userId) {
      console.warn('No user ID set, using default value');
      return defaultValue;
    }

    // Add request to queue instead of making immediate request
    return new Promise<T>((resolve, reject) => {
      this.requestQueue.push({
        dataType,
        defaultValue,
        resolve,
        reject
      });

      // Start processing queue
      this.processQueue();
    });
  }

  async loadAllUserData(): Promise<Record<DataType, any>> {
    if (!this.userId) {
      return {} as Record<DataType, any>;
    }

    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/user-data/`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('Error loading all user data:', errorData);
        return {} as Record<DataType, any>;
      }

      const data = await response.json();
      const result = {} as Record<DataType, any>;

      if (Array.isArray(data)) {
        data.forEach(item => {
          result[item.data_type as DataType] = item.data;
        });
      }

      return result;
    } catch (error) {
      console.error('Failed to load all user data:', error);
      return {} as Record<DataType, any>;
    }
  }

  async migrateFromLocalStorage(): Promise<void> {
    if (!this.userId) {
      console.warn('No user ID set, cannot migrate');
      return;
    }

    try {
      // Check if user already has data in cloud
      const existingData = await this.loadAllUserData();
      const hasExistingData = Object.keys(existingData).length > 0;

      if (hasExistingData) {
        console.log('User already has cloud data, skipping migration');
        // Clean up localStorage after successful migration verification
        this.cleanupLocalStorage();
        return;
      }

      console.log('Starting migration from localStorage to cloud...');

      // Migrate data from localStorage
      const migrations: Array<{ key: string; dataType: DataType }> = [
        { key: 'fmp_family', dataType: 'family' },
        { key: 'fmp_preferences', dataType: 'preferences' },
        { key: 'fmp_plan_history', dataType: 'meal_plan' },
        { key: 'fmp_prep_tasks', dataType: 'prep_tasks' },
        { key: 'fmp_grocery_items', dataType: 'grocery_items' },
        { key: 'fmp_invalidation_state', dataType: 'invalidation_state' },
        { key: 'fmp_has_plan', dataType: 'has_plan' },
        { key: 'fmp_current_stage', dataType: 'current_stage' }
      ];

      let migratedCount = 0;
      const migrationPromises = migrations.map(async ({ key, dataType }) => {
        const localData = localStorage.getItem(key);
        if (localData) {
          try {
            const parsedData = JSON.parse(localData);
            await this.saveData(dataType, parsedData);
            migratedCount++;
            console.log(`✓ Migrated ${dataType} from localStorage`);
          } catch (error) {
            console.error(`✗ Failed to migrate ${dataType}:`, error);
          }
        }
      });

      await Promise.all(migrationPromises);

      if (migratedCount > 0) {
        console.log(`Migration completed: ${migratedCount} items migrated to cloud`);
        // Clean up localStorage after successful migration
        this.cleanupLocalStorage();
      } else {
        console.log('No localStorage data found to migrate');
      }
    } catch (error) {
      console.error('Migration failed:', error);
    }
  }

  private cleanupLocalStorage(): void {
    const keysToRemove = [
      'fmp_family',
      'fmp_preferences',
      'fmp_plan_history',
      'fmp_prep_tasks',
      'fmp_grocery_items',
      'fmp_invalidation_state',
      'fmp_has_plan',
      'fmp_current_stage',
      'fmp_schema_version'
    ];

    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn(`Failed to remove ${key} from localStorage:`, error);
      }
    });

    console.log('localStorage cleanup completed');
  }

  async clearAllUserData(): Promise<void> {
    if (!this.userId) {
      return;
    }

    try {
      const headers = await this.getAuthHeaders();

      // Get all user data types first
      const allData = await this.loadAllUserData();

      // Delete each data type individually
      const deletePromises = Object.keys(allData).map(async (dataType) => {
        const response = await fetch(`${this.baseUrl}/user-data/${dataType}`, {
          method: 'DELETE',
          headers
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
          console.error(`Error deleting ${dataType}:`, errorData);
        }
      });

      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Failed to clear user data:', error);
      throw error;
    }
  }
}

export const dataService = new DataService();
