/**
 * useCurationStoreSync — Supabase ↔ Zustand store sync with debounce.
 *
 * Responsibilities:
 * - Hydrate store from DB when localStorage is empty for this challengeId
 * - Debounce 800ms after setSectionData → upsert to Supabase
 * - Flush pending saves on unmount and tab-hide
 * - Expose saving/saved status for UI indicators
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCurationFormStore } from '@/store/curationFormStore';
import type { SectionKey, SectionStoreEntry } from '@/types/sections';
import { SECTION_KEYS } from '@/types/sections';

const DEBOUNCE_MS = 800;

interface UseCurationStoreSyncOptions {
  challengeId: string;
  enabled?: boolean;
}

interface SyncStatus {
  isSaving: boolean;
  lastSavedAt: Date | null;
}

export function useCurationStoreSync({ challengeId, enabled = true }: UseCurationStoreSyncOptions): SyncStatus {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isSaving: false,
    lastSavedAt: null,
  });

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = useRef<Record<string, unknown> | null>(null);
  const isMountedRef = useRef(true);

  const store = getCurationFormStore(challengeId);

  // ── Flush pending save to DB ──
  const flushSave = useCallback(async () => {
    if (!pendingSaveRef.current || !enabled) return;

    const dataToSave = pendingSaveRef.current;
    pendingSaveRef.current = null;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    try {
      setSyncStatus((prev) => ({ ...prev, isSaving: true }));

      // Save section data as part of the challenge's ai_section_reviews JSONB
      // This preserves backward compat with the existing storage model
      const { error } = await supabase
        .from('challenges')
        .update({
          ai_section_reviews: dataToSave as any,
          updated_at: new Date().toISOString(),
        })
        .eq('id', challengeId);

      if (error) {
        console.error('[CurationStoreSync] Save failed:', error.message);
      } else if (isMountedRef.current) {
        setSyncStatus({ isSaving: false, lastSavedAt: new Date() });
      }
    } catch (err) {
      console.error('[CurationStoreSync] Save error:', err);
    } finally {
      if (isMountedRef.current) {
        setSyncStatus((prev) => ({ ...prev, isSaving: false }));
      }
    }
  }, [challengeId, enabled]);

  // ── Debounced save ──
  const scheduleSave = useCallback((data: Record<string, unknown>) => {
    pendingSaveRef.current = data;

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
      // No local data — hydrate from DB
      (async () => {
        try {
          const { data, error } = await supabase
            .from('challenges')
            .select('ai_section_reviews')
            .eq('id', challengeId)
            .single();

          if (error || !data?.ai_section_reviews) return;

          const reviews = data.ai_section_reviews as Record<string, unknown>;
          if (reviews && typeof reviews === 'object') {
            // Transform DB reviews into section data format for hydration
            const sectionsData: Partial<Record<SectionKey, SectionStoreEntry['data']>> = {};
            for (const key of SECTION_KEYS) {
              if (key in reviews) {
                sectionsData[key as SectionKey] = reviews[key] as SectionStoreEntry['data'];
              }
            }
            store.getState().hydrate(sectionsData);
          }
        } catch (err) {
          console.error('[CurationStoreSync] Hydration failed:', err);
        }
      })();
    }
  }, [challengeId, enabled, store]);

  // ── Subscribe to store changes and schedule saves ──
  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = store.subscribe((state, prevState) => {
      // Only save when sections data actually changed
      if (state.sections !== prevState.sections) {
        // Build serializable save payload
        const payload: Record<string, unknown> = {};
        for (const [key, entry] of Object.entries(state.sections)) {
          if (entry) {
            payload[key] = {
              section_key: key,
              comments: entry.aiComments,
              status: entry.reviewStatus === 'reviewed'
                ? (entry.aiComments && entry.aiComments.length > 0 ? 'warning' : 'pass')
                : 'pass',
              addressed: entry.addressed,
              reviewed_at: new Date().toISOString(),
            };
          }
        }
        scheduleSave(payload);
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
