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
 * Architecture (optimistic updates + instant sync):
 *
 * 1. Optimistic Updates — Local changes are applied immediately to the UI,
 *    then sent to the server. This makes the app feel instant.
 *
 * 2. Supabase Broadcast (primary) — The backend broadcasts changes via
 *    Supabase's REST API after every write. The frontend subscribes to
 *    the broadcast channel for instant push updates from other users.
 *
 * 3. Periodic poll (safety net) — Every 10s, fetches the plan from the API
 *    and compares `updated_at`. If the broadcast was missed, the poll catches it.
 *
 * 4. Immediate save (no debounce) — Changes are sent immediately to the backend
 *    to ensure other users see updates as fast as possible.
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
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdateRef = useRef<Partial<FamilyPlanState> | null>(null);
  const lastKnownUpdatedAtRef = useRef<string | null>(null);
  const isSavingRef = useRef<boolean>(false);

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
      .channel(topic, {
        config: {
          broadcast: { ack: true }, // Enable acknowledgment for reliability
        },
      })
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

    // Start polling as safety net (every 10s for faster recovery)
    pollIntervalRef.current = setInterval(pollForUpdates, 10_000);

    return cleanup;
  }, [activePlanId, handleRemoteData, pollForUpdates, cleanup]);

  // --- Save to family plan with immediate sync (no debounce) ---
  const saveToFamilyPlan = useCallback(async (
    updates: Partial<FamilyPlanState>
  ) => {
    if (!activePlanId || isSavingRef.current) return;

    isSavingRef.current = true;
    setIsSyncing(true);
    setSyncError(null);

    try {
      const response = await apiService.updateFamilyPlan(activePlanId, updates);
      setLastSyncTime(new Date());

      // Track the version we just saved so we don't re-apply our own broadcast
      if (response?.updated_at) {
        lastKnownUpdatedAtRef.current = response.updated_at;
      }

      console.log('[FamilyPlan] ✓ Synced to family plan');
    } catch (error) {
      console.error('[FamilyPlan] Failed to sync:', error);
      setSyncError('Failed to sync changes');
      showToast('Failed to sync changes', 'error');
    } finally {
      setIsSyncing(false);
      isSavingRef.current = false;
    }
  }, [activePlanId, showToast]);

  // --- Flush pending saves (no-op now since we don't debounce) ---
  const flushSync = useCallback(async () => {
    // No-op since we save immediately
  }, []);

  return {
    saveToFamilyPlan,
    flushSync,
    isSyncing,
    lastSyncTime,
    syncError,
    isConnected,
  };
}
