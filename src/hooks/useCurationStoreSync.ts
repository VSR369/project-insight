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

      // Save review state as normalized array (never object-map)
      if (Object.keys(reviewEntries).length > 0) {
        // Fetch existing reviews and normalize to array
        const { data: current } = await supabase
          .from('challenges')
          .select('ai_section_reviews')
          .eq('id', challengeId)
          .single();

        let existingArray: any[] = [];
        const raw = current?.ai_section_reviews;
        if (Array.isArray(raw)) {
          existingArray = raw;
        } else if (raw && typeof raw === 'object') {
          // Legacy object-map → convert to array
          for (const [key, val] of Object.entries(raw as Record<string, any>)) {
            if (val && typeof val === 'object') {
              existingArray.push({ ...val, section_key: val.section_key ?? key });
            }
          }
        }

        // Merge by section_key (new entries replace existing ones)
        const mergedMap = new Map<string, any>();
        for (const entry of existingArray) {
          if (entry?.section_key) mergedMap.set(entry.section_key, entry);
        }
        for (const [key, entry] of Object.entries(reviewEntries)) {
          mergedMap.set(key, entry);
        }
        const mergedArray = Array.from(mergedMap.values());

        const { error } = await supabase
          .from('challenges')
          .update({
            ai_section_reviews: mergedArray as any,
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
      // Store hydration from challenge data is handled by useCurationStoreHydration.
      // Do NOT hydrate section data from ai_section_reviews — those are review metadata,
      // not section content. Mixing them causes data corruption.
      console.info('[CurationStoreSync] No local data — hydration deferred to useCurationStoreHydration.');
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
