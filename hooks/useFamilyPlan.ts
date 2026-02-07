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
  modified_by?: string; // From broadcast payload
}

interface UseFamilyPlanOptions {
  onRemoteUpdate: (data: FamilyPlanState) => void;
  userId?: string;
}

/**
 * Hook for managing family plan real-time sync.
 *
 * Architecture (3-layer reliability):
 *
 * 1. Supabase Broadcast (primary) — The backend broadcasts changes via
 *    Supabase's REST API after every write. The frontend subscribes to
 *    the broadcast channel for instant push updates. This is the fast path.
 *
 * 2. Periodic poll (safety net) — Every 30s, fetches the plan from the API
 *    and compares `updated_at`. If the broadcast was missed (network blip,
 *    tab backgrounded, etc.), the poll catches it. Like Apple's background
 *    fetch — invisible to the user, always there.
 *
 * 3. Debounced save (outbound) — Local changes are debounced and sent to
 *    the backend via PUT. The backend then broadcasts to other clients.
 *
 * The broadcast is fire-and-forget from the backend's perspective.
 * The poll is the guarantee. Together they give instant + reliable.
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
  const [isConnected, setIsConnected] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdateRef = useRef<Partial<FamilyPlanState> | null>(null);
  const lastKnownUpdatedAtRef = useRef<string | null>(null);

  // Stable refs for callbacks to avoid re-subscribing on every render
  const onRemoteUpdateRef = useRef(onRemoteUpdate);
  onRemoteUpdateRef.current = onRemoteUpdate;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  // --- Cleanup ---
  const cleanup = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setIsConnected(false);
  }, []);

  // --- Handle incoming remote data (shared by broadcast + poll) ---
  const handleRemoteData = useCallback((data: FamilyPlanState, source: string) => {
    const modifiedBy = data.last_modified_by || data.modified_by;

    // Skip if this update was from the current user
    if (modifiedBy === userIdRef.current) {
      console.log(`[FamilyPlan] Skipping own update via ${source}`);
      return;
    }

    // Skip if we've already seen this version
    if (data.updated_at && data.updated_at === lastKnownUpdatedAtRef.current) {
      return;
    }

    console.log(`[FamilyPlan] Applying remote update via ${source}`);
    lastKnownUpdatedAtRef.current = data.updated_at || null;

    onRemoteUpdateRef.current({
      plan_data: data.plan_data,
      family_data: data.family_data,
      preferences_data: data.preferences_data,
      prep_tasks: data.prep_tasks || [],
      grocery_items: data.grocery_items || [],
      invalidation_state: data.invalidation_state,
      has_plan: String(data.has_plan),
      current_stage: String(data.current_stage),
      updated_at: data.updated_at,
      last_modified_by: modifiedBy,
    });

    showToast('Plan updated by family member', 'info', 3000);
  }, [showToast]);

  // --- Poll for updates (safety net) ---
  const pollForUpdates = useCallback(async () => {
    if (!activePlanId) return;

    try {
      const plan = await apiService.getFamilyPlan(activePlanId);
      if (!plan) return;

      const remoteUpdatedAt = plan.updated_at;
      const remoteModifiedBy = plan.last_modified_by;

      // Only apply if newer than what we know and not from us
      if (
        remoteUpdatedAt &&
        remoteUpdatedAt !== lastKnownUpdatedAtRef.current &&
        remoteModifiedBy !== userIdRef.current
      ) {
        console.log('[FamilyPlan] Poll detected newer version');
        handleRemoteData({
          plan_data: plan.plan_data,
          family_data: plan.family_data,
          preferences_data: plan.preferences_data,
          prep_tasks: plan.prep_tasks || [],
          grocery_items: plan.grocery_items || [],
          invalidation_state: plan.invalidation_state,
          has_plan: String(plan.has_plan),
          current_stage: String(plan.current_stage),
          updated_at: remoteUpdatedAt,
          last_modified_by: remoteModifiedBy,
        }, 'poll');
      }
    } catch (error) {
      // Silent — poll failures are expected (offline, etc.)
      console.debug('[FamilyPlan] Poll failed:', error);
    }
  }, [activePlanId, handleRemoteData]);

  // --- Subscribe to Supabase Broadcast + start poll ---
  useEffect(() => {
    if (!activePlanId) {
      cleanup();
      return;
    }

    const topic = `family_plan:${activePlanId}`;
    console.log(`[FamilyPlan] Subscribing to broadcast: ${topic}`);

    const channel = supabase
      .channel(topic)
      .on(
        'broadcast',
        { event: 'plan_updated' },
        (payload) => {
          console.log('[FamilyPlan] Received broadcast:', payload);
          const data = payload.payload as any;
          if (data) {
            handleRemoteData(data, 'broadcast');
          }
        }
      )
      .subscribe((status) => {
        console.log(`[FamilyPlan] Channel status: ${status}`);
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setSyncError(null);
          console.log('[FamilyPlan] ✓ Connected to broadcast channel');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setIsConnected(false);
          setSyncError('Connection lost — using polling');
          console.warn(`[FamilyPlan] Channel ${status}, falling back to poll`);
        }
      });

    channelRef.current = channel;

    // Start polling as safety net (every 30s)
    pollIntervalRef.current = setInterval(pollForUpdates, 30_000);

    return cleanup;
  }, [activePlanId, handleRemoteData, pollForUpdates, cleanup]);

  // --- Save to family plan with debouncing (outbound) ---
  const saveToFamilyPlan = useCallback(async (
    updates: Partial<FamilyPlanState>,
    immediate: boolean = false
  ) => {
    if (!activePlanId) return;

    // Merge with any pending update
    pendingUpdateRef.current = {
      ...pendingUpdateRef.current,
      ...updates,
    };

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
        const response = await apiService.updateFamilyPlan(activePlanId, dataToSave);
        setLastSyncTime(new Date());

        // Track the version we just saved so we don't re-apply our own broadcast
        if (response?.updated_at) {
          lastKnownUpdatedAtRef.current = response.updated_at;
        }

        console.log('[FamilyPlan] ✓ Synced to family plan');
      } catch (error) {
        console.error('[FamilyPlan] Failed to sync:', error);
        setSyncError('Failed to sync changes');
      } finally {
        setIsSyncing(false);
      }
    };

    if (immediate) {
      await performSave();
    } else {
      // 1s debounce — fast enough to feel instant, slow enough to batch rapid changes
      saveTimeoutRef.current = setTimeout(performSave, 1000);
    }
  }, [activePlanId]);

  // --- Flush pending saves (before navigation, tab close, etc.) ---
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
        const response = await apiService.updateFamilyPlan(activePlanId, dataToSave);
        setLastSyncTime(new Date());
        if (response?.updated_at) {
          lastKnownUpdatedAtRef.current = response.updated_at;
        }
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
    isConnected,
  };
}
