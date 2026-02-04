import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../config/supabase';
import { apiService } from '../services/apiService';
import { useToast } from '../contexts/ToastContext';
import { RealtimeChannel } from '@supabase/supabase-js';

interface FamilyPlanState {
  plan_data: any;
  family_data: any;
  preferences_data: any;
  prep_tasks: any[];
  grocery_items: any[];
  invalidation_state: any;
  has_plan: string;
  current_stage: string;
  updated_at?: string;
  last_modified_by?: string;
}

interface UseFamilyPlanOptions {
  onRemoteUpdate: (data: FamilyPlanState) => void;
  userId?: string;
}

/**
 * Hook for managing family plan real-time sync
 *
 * Features:
 * - Subscribes to Supabase Realtime for instant updates
 * - Debounces local changes before syncing to server
 * - Handles conflict detection (warns if remote update while editing)
 * - Provides sync status for UI feedback
 */
export function useFamilyPlan(
  activePlanId: string | null,
  options: UseFamilyPlanOptions
) {
  const { showToast } = useToast();
  const { onRemoteUpdate, userId } = options;

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdateRef = useRef<Partial<FamilyPlanState> | null>(null);
  const lastKnownVersionRef = useRef<string | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!activePlanId) {
      cleanup();
      return;
    }

    console.log(`[FamilyPlan] Subscribing to plan: ${activePlanId}`);

    // Create a channel for this specific plan
    // Note: Table is still 'collaborative_plans' in DB, but we use family terminology in code
    const channel = supabase
      .channel(`family_plan:${activePlanId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'collaborative_plans',
          filter: `id=eq.${activePlanId}`
        },
        (payload) => {
          console.log('[FamilyPlan] Received real-time update:', payload);

          const newData = payload.new as any;

          // Skip if this update was from the current user
          if (newData.last_modified_by === userId) {
            console.log('[FamilyPlan] Skipping own update');
            return;
          }

          // Update last known version
          lastKnownVersionRef.current = newData.updated_at;

          // Notify parent component of remote update
          onRemoteUpdate({
            plan_data: newData.plan_data,
            family_data: newData.family_data,
            preferences_data: newData.preferences_data,
            prep_tasks: newData.prep_tasks || [],
            grocery_items: newData.grocery_items || [],
            invalidation_state: newData.invalidation_state,
            has_plan: String(newData.has_plan),
            current_stage: String(newData.current_stage),
            updated_at: newData.updated_at,
            last_modified_by: newData.last_modified_by
          });

          showToast('Plan updated by family member', 'info', 3000);
        }
      )
      .subscribe((status) => {
        console.log(`[FamilyPlan] Subscription status: ${status}`);
        if (status === 'SUBSCRIBED') {
          console.log('[FamilyPlan] Successfully subscribed to real-time updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[FamilyPlan] Failed to subscribe to real-time updates');
          setSyncError('Failed to connect to real-time updates');
        }
      });

    channelRef.current = channel;

    return cleanup;
  }, [activePlanId, userId, onRemoteUpdate, showToast, cleanup]);

  // Save to family plan with debouncing
  const saveToFamilyPlan = useCallback(async (
    updates: Partial<FamilyPlanState>,
    immediate: boolean = false
  ) => {
    if (!activePlanId) return;

    // Store pending update
    pendingUpdateRef.current = {
      ...pendingUpdateRef.current,
      ...updates
    };

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    const performSave = async () => {
      const dataToSave = pendingUpdateRef.current;
      pendingUpdateRef.current = null;

      if (!dataToSave) return;

      setIsSyncing(true);
      setSyncError(null);

      try {
        await apiService.updateFamilyPlan(activePlanId, dataToSave);
        setLastSyncTime(new Date());
        console.log('[FamilyPlan] ✓ Synced to family plan');
      } catch (error) {
        console.error('[FamilyPlan] Failed to sync:', error);
        setSyncError('Failed to sync changes');
        // Don't show toast for background sync failures
      } finally {
        setIsSyncing(false);
      }
    };

    if (immediate) {
      await performSave();
    } else {
      // Debounce saves to avoid overwhelming the server
      saveTimeoutRef.current = setTimeout(performSave, 1000);
    }
  }, [activePlanId]);

  // Force immediate sync (useful before navigation)
  const flushSync = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    if (pendingUpdateRef.current && activePlanId) {
      const dataToSave = pendingUpdateRef.current;
      pendingUpdateRef.current = null;

      setIsSyncing(true);
      try {
        await apiService.updateFamilyPlan(activePlanId, dataToSave);
        setLastSyncTime(new Date());
      } catch (error) {
        console.error('[FamilyPlan] Flush sync failed:', error);
      } finally {
        setIsSyncing(false);
      }
    }
  }, [activePlanId]);

  return {
    saveToFamilyPlan,
    flushSync,
    isSyncing,
    lastSyncTime,
    syncError,
    isConnected: !!channelRef.current
  };
}
