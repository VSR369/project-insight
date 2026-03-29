/**
 * curationFormStore — Zustand store for all curation section data.
 *
 * Single source of truth for section form data, AI review state,
 * and suggestions. Persisted to localStorage per challengeId.
 *
 * Key semantics:
 * - accept() → deep merge suggestion into data, clear aiComments/aiSuggestion to null
 * - reject() → clear aiComments/aiSuggestion to null, reviewStatus → 'idle'
 * - acceptAiSuggestion is a no-op if aiSuggestion is null or reviewStatus is not 'reviewed'
 * - hydrate() migrates legacy array items missing `id` fields
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { deepMerge, ensureArrayItemIds } from '@/lib/deepMerge';
import { getTransitiveDependents } from '@/lib/cogniblend/sectionDependencies';
import type { SectionKey, SectionStoreEntry, ReviewStatus, AiActionType } from '@/types/sections';
import type { ValidationResult } from '@/lib/cogniblend/postLlmValidation';
import { createEmptySectionEntry } from '@/types/sections';

/* ── Store shape ── */

interface CurationFormState {
  challengeId: string | null;
  sections: Partial<Record<SectionKey, SectionStoreEntry>>;

  /* Actions */
  setChallengeId: (id: string) => void;
  getSectionEntry: (key: SectionKey) => SectionStoreEntry;
  setSectionData: (key: SectionKey, data: SectionStoreEntry['data']) => void;
  setAiReview: (key: SectionKey, comments: string[], suggestion?: Record<string, unknown> | null) => void;
  setReviewStatus: (key: SectionKey, status: ReviewStatus) => void;
  acceptAiSuggestion: (key: SectionKey) => void;
  rejectAiSuggestion: (key: SectionKey) => void;
  markAddressed: (key: SectionKey) => void;
  /** Mark a section as saved — clears own staleness, propagates to dependents. Returns staled keys. */
  markSectionSaved: (key: SectionKey) => SectionKey[];
  /** Clear staleness for a section (after AI re-review or manual edit+save) */
  clearStaleness: (key: SectionKey) => void;
  /** Store validation results for a section */
  setValidationResult: (key: SectionKey, result: ValidationResult | null) => void;
  /** Record the AI action type from wave execution */
  setAiAction: (key: SectionKey, action: AiActionType) => void;
  hydrate: (sectionsData: Partial<Record<SectionKey, SectionStoreEntry['data']>>) => void;
  reset: () => void;
}

/* ── Selectors ── */

export const selectIsAnyReviewPending = (state: CurationFormState): boolean =>
  Object.values(state.sections).some((s) => s?.reviewStatus === 'pending');

export const selectStaleSections = (state: CurationFormState): Array<{
  key: SectionKey;
  staleBecauseOf: string[];
  staleAt: string | null;
}> =>
  Object.entries(state.sections)
    .filter(([, s]) => s?.isStale)
    .map(([key, s]) => ({
      key: key as SectionKey,
      staleBecauseOf: s!.staleBecauseOf,
      staleAt: s!.staleAt,
    }));

/**
 * Create a curation form store scoped to a specific challenge.
 * Uses localStorage persistence keyed by challengeId.
 */
export function createCurationFormStore(challengeId: string) {
  return create<CurationFormState>()(
    persist(
      (set, get) => ({
        challengeId,
        sections: {},

        setChallengeId: (id) => set({ challengeId: id }),

        getSectionEntry: (key) => {
          return get().sections[key] ?? createEmptySectionEntry();
        },

        setSectionData: (key, data) =>
          set((state) => ({
            sections: {
              ...state.sections,
              [key]: {
                ...(state.sections[key] ?? createEmptySectionEntry()),
                data,
              },
            },
          })),

        setAiReview: (key, comments, suggestion = null) =>
          set((state) => ({
            sections: {
              ...state.sections,
              [key]: {
                ...(state.sections[key] ?? createEmptySectionEntry()),
                aiComments: comments,
                aiSuggestion: suggestion,
                reviewStatus: 'reviewed' as ReviewStatus,
                addressed: false,
              },
            },
          })),

        setReviewStatus: (key, status) =>
          set((state) => ({
            sections: {
              ...state.sections,
              [key]: {
                ...(state.sections[key] ?? createEmptySectionEntry()),
                reviewStatus: status,
              },
            },
          })),

        acceptAiSuggestion: (key) =>
          set((state) => {
            const entry = state.sections[key];
            // No-op guard: prevent crash from double-click or stale state
            if (!entry?.aiSuggestion || entry.reviewStatus !== 'reviewed') {
              return state;
            }

            const currentData = (entry.data && typeof entry.data === 'object' && !Array.isArray(entry.data))
              ? entry.data as Record<string, unknown>
              : {};

            const mergedData = deepMerge(currentData, entry.aiSuggestion);

            return {
              sections: {
                ...state.sections,
                [key]: {
                  ...entry,
                  data: mergedData,
                  aiComments: null,
                  aiSuggestion: null,
                  reviewStatus: 'reviewed' as ReviewStatus,
                  addressed: true,
                },
              },
            };
          }),

        rejectAiSuggestion: (key) =>
          set((state) => ({
            sections: {
              ...state.sections,
              [key]: {
                ...(state.sections[key] ?? createEmptySectionEntry()),
                aiComments: null,
                aiSuggestion: null,
                reviewStatus: 'idle' as ReviewStatus,
                addressed: false,
              },
            },
          })),

        markAddressed: (key) =>
          set((state) => ({
            sections: {
              ...state.sections,
              [key]: {
                ...(state.sections[key] ?? createEmptySectionEntry()),
                addressed: true,
                aiComments: null,
              },
            },
          })),

        markSectionSaved: (key) => {
          const state = get();
          const now = new Date().toISOString();
          const updatedSections = { ...state.sections };

          // Clear own staleness and update lastEditedAt
          const existing = updatedSections[key] ?? createEmptySectionEntry();
          updatedSections[key] = {
            ...existing,
            lastEditedAt: now,
            isStale: false,
            staleBecauseOf: [],
            staleAt: null,
          };

          // Compute transitive dependents
          const affectedKeys = getTransitiveDependents(key);

          // Mark each dependent as stale (accumulate causes)
          for (const depKey of affectedKeys) {
            const depEntry = updatedSections[depKey as SectionKey] ?? createEmptySectionEntry();
            const existingCauses = depEntry.staleBecauseOf ?? [];
            const updatedCauses = [...new Set([...existingCauses, key])];
            updatedSections[depKey as SectionKey] = {
              ...depEntry,
              isStale: true,
              staleBecauseOf: updatedCauses,
              staleAt: depEntry.staleAt ?? now,
            };
          }

          set({ sections: updatedSections });
          return affectedKeys as SectionKey[];
        },

        clearStaleness: (key) =>
          set((state) => ({
            sections: {
              ...state.sections,
              [key]: {
                ...(state.sections[key] ?? createEmptySectionEntry()),
                isStale: false,
                staleBecauseOf: [],
                staleAt: null,
                lastReviewedAt: new Date().toISOString(),
              },
            },
          })),

        setValidationResult: (key, result) =>
          set((state) => ({
            sections: {
              ...state.sections,
              [key]: {
                ...(state.sections[key] ?? createEmptySectionEntry()),
                validationResult: result,
              },
            },
          })),

        hydrate: (sectionsData) =>
          set((state) => {
            const hydrated: Partial<Record<SectionKey, SectionStoreEntry>> = { ...state.sections };

            for (const [key, data] of Object.entries(sectionsData)) {
              const sectionKey = key as SectionKey;
              const existing = hydrated[sectionKey];

              // Migrate legacy data: ensure array items have IDs
              const migratedData = (data && typeof data === 'object' && !Array.isArray(data))
                ? ensureArrayItemIds(data as Record<string, unknown>)
                : data;

              if (existing) {
                // Preserve existing review state, just update data
                hydrated[sectionKey] = { ...existing, data: migratedData as SectionStoreEntry['data'] };
              } else {
                hydrated[sectionKey] = {
                  ...createEmptySectionEntry(),
                  data: migratedData as SectionStoreEntry['data'],
                };
              }
            }

            return { sections: hydrated };
          }),

        reset: () => set({ sections: {}, challengeId: null }),
      }),
      {
        name: `curation-form-${challengeId}`,
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          challengeId: state.challengeId,
          sections: state.sections,
        }),
      },
    ),
  );
}

/* ── Singleton store map (one per challengeId) ── */

const storeCache = new Map<string, ReturnType<typeof createCurationFormStore>>();

/**
 * Get or create the curation form store for a specific challenge.
 * Returns the same store instance for the same challengeId.
 */
export function getCurationFormStore(challengeId: string) {
  let store = storeCache.get(challengeId);
  if (!store) {
    store = createCurationFormStore(challengeId);
    storeCache.set(challengeId, store);
  }
  return store;
}

/**
 * React hook to use the curation form store for a specific challenge.
 * Returns the bound store hook.
 */
export function useCurationFormStore(challengeId: string) {
  return getCurationFormStore(challengeId);
}
