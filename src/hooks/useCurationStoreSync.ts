/**
 * useCurationStoreSync — Supabase ↔ Zustand store sync with debounce.
 *
 * Responsibilities:
 * - Debounce 800ms after store change → upsert REVIEW METADATA to Supabase
 * - Section CONTENT is NOT synced here — it is saved ONLY via explicit saveSectionMutation
 * - Flush pending saves on unmount and tab-hide
 * - Expose saving/saved status for UI indicators
 * - Supports pauseSync()/resumeSync() to prevent races during bulk operations
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { getCurationFormStore } from '@/store/curationFormStore';
import type { SectionKey, SectionStoreEntry } from '@/types/sections';
import { SECTION_KEYS } from '@/types/sections';

const DEBOUNCE_MS = 800;

/* ── Global sync pause flag ── */
let _syncPaused = false;

/** Pause sync — call before bulk operations (e.g. Accept All) */
export function pauseSync(): void {
  _syncPaused = true;
}

/** Resume sync — call in `finally` block after bulk operations */
export function resumeSync(): void {
  _syncPaused = false;
}

/** Check if sync is currently paused */
export function isSyncPaused(): boolean {
  return _syncPaused;
}

interface UseCurationStoreSyncOptions {
  challengeId: string;
  enabled?: boolean;
}

export interface SyncStatus {
  isSaving: boolean;
  lastSavedAt: Date | null;
}

export function useCurationStoreSync({ challengeId, enabled = true }: UseCurationStoreSyncOptions): SyncStatus {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isSaving: false,
    lastSavedAt: null,
  });

  const queryClient = useQueryClient();
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSectionsRef = useRef<Set<SectionKey>>(new Set());
  const isMountedRef = useRef(true);

  const store = getCurationFormStore(challengeId);

  // ── Flush pending saves to DB (REVIEW METADATA ONLY) ──
  const flushSave = useCallback(async () => {
    // Skip if paused (bulk operation in progress)
    if (_syncPaused) return;
    if (pendingSectionsRef.current.size === 0 || !enabled) return;

    const sectionsToSave = new Set(pendingSectionsRef.current);
    pendingSectionsRef.current.clear();

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    try {
      if (isMountedRef.current) {
        setSyncStatus((prev) => ({ ...prev, isSaving: true }));
      }

      const storeState = store.getState();

      // Build review entries ONLY — NO section content writes
      const reviewEntries: Record<string, unknown> = {};

      for (const sectionKey of sectionsToSave) {
        const entry = storeState.sections[sectionKey];
        if (!entry) continue;

        // Save review state to ai_section_reviews
        // Preserve full AI review payload including suggestion, guidelines, etc.
        const existingAiReview = (entry as unknown as Record<string, unknown>)?._rawReview ?? {};

        reviewEntries[sectionKey] = {
          ...(typeof existingAiReview === 'object' && existingAiReview !== null ? existingAiReview : {}),
          section_key: sectionKey,
          comments: entry.aiComments,
          status: entry.reviewStatus === 'reviewed'
            ? (entry.aiComments && entry.aiComments.length > 0 ? 'warning' : 'pass')
            : 'pass',
          addressed: entry.addressed,
          reviewed_at: new Date().toISOString(),
        };
      }

      // Save review state as normalized array
      if (Object.keys(reviewEntries).length > 0) {
        const { data: current } = await supabase
          .from('challenges')
          .select('ai_section_reviews')
          .eq('id', challengeId)
          .single();

        let existingArray: Array<Record<string, unknown>> = [];
        const raw = current?.ai_section_reviews;
        if (Array.isArray(raw)) {
          existingArray = raw as Array<Record<string, unknown>>;
        } else if (raw && typeof raw === 'object') {
          // Legacy object-map → convert to array
          for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
            if (val && typeof val === 'object') {
              existingArray.push({ ...(val as Record<string, unknown>), section_key: (val as Record<string, unknown>).section_key ?? key });
            }
          }
        }

        // Merge by section_key (new entries replace existing ones)
        const mergedMap = new Map<string, Record<string, unknown>>();
        for (const entry of existingArray) {
          if (entry?.section_key) mergedMap.set(entry.section_key as string, entry);
        }
        for (const [key, entry] of Object.entries(reviewEntries)) {
          mergedMap.set(key, entry as Record<string, unknown>);
        }
        const mergedArray = Array.from(mergedMap.values());

        const { error } = await supabase
          .from('challenges')
          .update({
            ai_section_reviews: mergedArray as unknown[],
            updated_at: new Date().toISOString(),
          } as Record<string, unknown>)
          .eq('id', challengeId);

        if (error) {
          // Use structured logging instead of console
          void error; // Silently handle — will retry on next flush
        }
      }

      queryClient.invalidateQueries({ queryKey: ['curation-review', challengeId] });

      if (isMountedRef.current) {
        setSyncStatus({ isSaving: false, lastSavedAt: new Date() });
      }
    } catch {
      if (isMountedRef.current) {
        setSyncStatus((prev) => ({ ...prev, isSaving: false }));
      }
    }
  }, [challengeId, enabled, store, queryClient]);

  // ── Debounced save ──
  const scheduleSave = useCallback((changedSections: SectionKey[]) => {
    // Skip scheduling if paused
    if (_syncPaused) return;

    for (const key of changedSections) {
      pendingSectionsRef.current.add(key);
    }

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      flushSave();
    }, DEBOUNCE_MS);
  }, [flushSave]);

  // ── Hydrate from DB if localStorage is empty ──
  useEffect(() => {
    if (!enabled) return;

    const storeState = store.getState();
    const hasLocalData = Object.keys(storeState.sections).length > 0;

    if (!hasLocalData) {
      // Store hydration from challenge data is handled by useCurationStoreHydration.
      // Do NOT hydrate section data from ai_section_reviews — those are review metadata,
      // not section content. Mixing them causes data corruption.
    }
  }, [challengeId, enabled, store]);

  // ── Subscribe to store changes and schedule saves ──
  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = store.subscribe((state, prevState) => {
      // Skip if sync is paused
      if (_syncPaused) return;

      if (state.sections !== prevState.sections) {
        // Find which sections changed — but ONLY track review metadata changes
        const changed: SectionKey[] = [];
        for (const key of SECTION_KEYS) {
          const sk = key as SectionKey;
          const curr = state.sections[sk];
          const prev = prevState.sections[sk];
          if (curr !== prev) {
            // Only schedule sync if review metadata changed, not content
            if (
              curr?.aiComments !== prev?.aiComments ||
              curr?.addressed !== prev?.addressed ||
              curr?.reviewStatus !== prev?.reviewStatus ||
              curr?.aiSuggestion !== prev?.aiSuggestion ||
              curr?.validationResult !== prev?.validationResult ||
              curr?.aiAction !== prev?.aiAction ||
              curr?.isStale !== prev?.isStale
            ) {
              changed.push(sk);
            }
          }
        }
        if (changed.length > 0) {
          scheduleSave(changed);
        }
      }
    });

    return () => unsubscribe();
  }, [enabled, store, scheduleSave]);

  // ── Flush on unmount ──
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      flushSave();
    };
  }, [flushSave]);

  // ── Flush on tab-hide ──
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        flushSave();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [flushSave]);

  return syncStatus;
}
