import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FilterMode } from '../components/CompletionFilter';

/**
 * Hook that delays removing items from a filtered list after they are toggled,
 * giving the user a brief window to undo. Items fade out with an animation
 * before being removed.
 *
 * Key design: toggle detection happens synchronously during render (via useMemo)
 * so there is never a frame where the item disappears before being added to the
 * lingering set. This eliminates the "flash" that useEffect-based detection causes.
 */
export function useDelayedFilter<T>(
  items: T[],
  filterMode: FilterMode,
  isChecked: (item: T) => boolean,
  getId: (item: T) => string,
  delay = 1200,
) {
  // Mutable refs for state that must be updated synchronously during render
  const lingeringRef = useRef<Set<string>>(new Set());
  const fadingRef = useRef<Set<string>>(new Set());
  const prevCheckedRef = useRef<Map<string, boolean>>(new Map());
  const prevFilterRef = useRef<FilterMode | null>(null);
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Counter to force re-renders when async timers modify the refs
  const [, setTick] = useState(0);
  const tick = useCallback(() => setTick((t) => t + 1), []);

  // Synchronous toggle detection — runs during render, not after
  useMemo(() => {
    // On filter mode change, clear everything
    if (prevFilterRef.current !== null && prevFilterRef.current !== filterMode) {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
      lingeringRef.current = new Set();
      fadingRef.current = new Set();
      prevCheckedRef.current = new Map();
    }
    prevFilterRef.current = filterMode;

    items.forEach((item) => {
      const id = getId(item);
      const checked = isChecked(item);
      const prev = prevCheckedRef.current.get(id);

      if (prev !== undefined && prev !== checked) {
        const shouldLinger =
          (filterMode === 'incomplete' && checked) ||
          (filterMode === 'complete' && !checked);

        if (shouldLinger) {
          // Clear any existing timer
          const existing = timersRef.current.get(id);
          if (existing) clearTimeout(existing);

          // Add to lingering set SYNCHRONOUSLY (before render completes)
          lingeringRef.current = new Set(lingeringRef.current).add(id);

          // Schedule fade-out after delay
          const timer = setTimeout(() => {
            lingeringRef.current = new Set(lingeringRef.current);
            lingeringRef.current.delete(id);

            fadingRef.current = new Set(fadingRef.current).add(id);
            tick();

            // After CSS animation completes (400ms), remove from fading
            setTimeout(() => {
              fadingRef.current = new Set(fadingRef.current);
              fadingRef.current.delete(id);
              tick();
            }, 400);

            timersRef.current.delete(id);
          }, delay);

          timersRef.current.set(id, timer);
        } else {
          // Toggled back — cancel pending removal
          const existing = timersRef.current.get(id);
          if (existing) {
            clearTimeout(existing);
            timersRef.current.delete(id);
          }
          lingeringRef.current = new Set(lingeringRef.current);
          lingeringRef.current.delete(id);
          fadingRef.current = new Set(fadingRef.current);
          fadingRef.current.delete(id);
        }
      }

      prevCheckedRef.current.set(id, checked);
    });
  }, [items, filterMode, isChecked, getId, delay, tick]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  // Build the visible list
  const getFilteredItems = useCallback(() => {
    if (filterMode === 'all') return items;

    const keepIds = new Set([...lingeringRef.current, ...fadingRef.current]);

    return items.filter((item) => {
      const id = getId(item);
      if (keepIds.has(id)) return true;
      if (filterMode === 'complete') return isChecked(item);
      return !isChecked(item);
    });
  }, [items, filterMode, isChecked, getId]);

  const isFadingOut = useCallback(
    (id: string) => fadingRef.current.has(id),
    [],
  );

  const isLingering = useCallback(
    (id: string) => lingeringRef.current.has(id),
    [],
  );

  return { getFilteredItems, isFadingOut, isLingering };
}
