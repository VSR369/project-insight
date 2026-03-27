/**
 * useCurationStoreSync — Supabase ↔ Zustand store sync with debounce.
 *
 * Responsibilities:
 * - Hydrate store from DB when localStorage is empty for this challengeId
 * - Debounce 800ms after setSectionData → upsert to Supabase
 * - Flush pending saves on unmount and tab-hide
 * - Expose saving/saved status for UI indicators
 * - Supports per-section DB field mapping (reward_structure → challenges.reward_structure, etc.)
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { getCurationFormStore } from '@/store/curationFormStore';
import type { SectionKey, SectionStoreEntry } from '@/types/sections';
import { SECTION_KEYS } from '@/types/sections';

const DEBOUNCE_MS = 800;

/**
 * Map section keys to their DB column names in the challenges table.
 * Sections not listed here have their review state saved to ai_section_reviews.
 */
const SECTION_DB_FIELD_MAP: Partial<Record<SectionKey, string>> = {
  problem_statement: 'problem_statement',
  scope: 'scope',
  hook: 'hook',
  deliverables: 'deliverables',
  evaluation_criteria: 'evaluation_criteria',
  reward_structure: 'reward_structure',
  phase_schedule: 'phase_schedule',
  ip_model: 'ip_model',
  maturity_level: 'maturity_level',
  visibility: 'visibility',
  eligibility: 'eligibility',
  domain_tags: 'domain_tags',
  submission_deadline: 'submission_deadline',
  challenge_visibility: 'challenge_visibility',
  effort_level: 'effort_level',
  expected_outcomes: 'expected_outcomes',
  extended_brief: 'extended_brief',
  submission_guidelines: 'description',
  solver_expertise: 'solver_expertise_requirements',
};

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

  // ── Flush pending saves to DB ──
  const flushSave = useCallback(async () => {
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

      // Build update payload — group by DB field
      const challengeUpdate: Record<string, unknown> = {};
      const reviewEntries: Record<string, unknown> = {};

      for (const sectionKey of sectionsToSave) {
        const entry = storeState.sections[sectionKey];
        if (!entry) continue;

        const dbField = SECTION_DB_FIELD_MAP[sectionKey];
        if (dbField && entry.data !== undefined) {
          // Section has its own DB column
          challengeUpdate[dbField] = entry.data;
        }

        // Always save review state to ai_section_reviews
        reviewEntries[sectionKey] = {
          section_key: sectionKey,
          comments: entry.aiComments,
          status: entry.reviewStatus === 'reviewed'
            ? (entry.aiComments && entry.aiComments.length > 0 ? 'warning' : 'pass')
            : 'pass',
          addressed: entry.addressed,
          reviewed_at: new Date().toISOString(),
        };
      }

      // Save section data to their respective columns
      if (Object.keys(challengeUpdate).length > 0) {
        challengeUpdate.updated_at = new Date().toISOString();
        const { error } = await supabase
          .from('challenges')
          .update(challengeUpdate as any)
          .eq('id', challengeId);

        if (error) {
          console.error('[CurationStoreSync] Section data save failed:', error.message);
        }
      }

      // Save review state
      if (Object.keys(reviewEntries).length > 0) {
        // Merge with existing ai_section_reviews
        const { data: current } = await supabase
          .from('challenges')
          .select('ai_section_reviews')
          .eq('id', challengeId)
          .single();

        const existingReviews = (current?.ai_section_reviews as Record<string, unknown>) ?? {};
        const mergedReviews = { ...existingReviews, ...reviewEntries };

        const { error } = await supabase
          .from('challenges')
          .update({
            ai_section_reviews: mergedReviews as any,
            updated_at: new Date().toISOString(),
          })
          .eq('id', challengeId);

        if (error) {
          console.error('[CurationStoreSync] Review state save failed:', error.message);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['curation-review', challengeId] });

      if (isMountedRef.current) {
        setSyncStatus({ isSaving: false, lastSavedAt: new Date() });
      }
    } catch (err) {
      console.error('[CurationStoreSync] Save error:', err);
      if (isMountedRef.current) {
        setSyncStatus((prev) => ({ ...prev, isSaving: false }));
      }
    }
  }, [challengeId, enabled, store, queryClient]);

  // ── Debounced save ──
  const scheduleSave = useCallback((changedSections: SectionKey[]) => {
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
      if (state.sections !== prevState.sections) {
        // Find which sections changed
        const changed: SectionKey[] = [];
        for (const key of SECTION_KEYS) {
          const sk = key as SectionKey;
          if (state.sections[sk] !== prevState.sections[sk]) {
            changed.push(sk);
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
