/**
 * curationFormStore — Zustand store for all curation section data.
 *
 * Single source of truth for section form data, AI review state,
 * and suggestions. Persisted to localStorage per challengeId.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { deepMerge, ensureArrayItemIds } from '@/lib/deepMerge';
import { getTransitiveDependents } from '@/lib/cogniblend/sectionDependencies';
import type { SectionKey, SectionStoreEntry, ReviewStatus, AiActionType } from '@/types/sections';
import type { ValidationResult } from '@/lib/cogniblend/postLlmValidation';
import { createEmptySectionEntry } from '@/types/sections';

// Re-export selectors for backward compatibility
export { selectIsAnyReviewPending, selectStaleSections } from './curationSelectors';

/* ── Store shape ── */

interface CurationFormState {
  challengeId: string | null;
  sections: Partial<Record<SectionKey, SectionStoreEntry>>;

  setChallengeId: (id: string) => void;
  getSectionEntry: (key: SectionKey) => SectionStoreEntry;
  setSectionData: (key: SectionKey, data: SectionStoreEntry['data']) => void;
  setAiReview: (key: SectionKey, comments: any[], suggestion?: Record<string, unknown> | string | string[] | null) => void;
  setReviewStatus: (key: SectionKey, status: ReviewStatus) => void;
  acceptAiSuggestion: (key: SectionKey) => void;
  rejectAiSuggestion: (key: SectionKey) => void;
  markAddressed: (key: SectionKey) => void;
  markSectionSaved: (key: SectionKey) => SectionKey[];
  clearStaleness: (key: SectionKey) => void;
  setValidationResult: (key: SectionKey, result: ValidationResult | null) => void;
  setAiAction: (key: SectionKey, action: AiActionType) => void;
  hydrate: (sectionsData: Partial<Record<SectionKey, SectionStoreEntry['data']>>) => void;
  reset: () => void;
}

/**
 * Create a curation form store scoped to a specific challenge.
 */
export function createCurationFormStore(challengeId: string) {
  return create<CurationFormState>()(
    persist(
      (set, get) => ({
        challengeId,
        sections: {},

        setChallengeId: (id) => set({ challengeId: id }),

        getSectionEntry: (key) => get().sections[key] ?? createEmptySectionEntry(),

        setSectionData: (key, data) =>
          set((state) => ({
            sections: {
              ...state.sections,
              [key]: { ...(state.sections[key] ?? createEmptySectionEntry()), data },
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
              [key]: { ...(state.sections[key] ?? createEmptySectionEntry()), reviewStatus: status },
            },
          })),

        acceptAiSuggestion: (key) =>
          set((state) => {
            const entry = state.sections[key];
            if (!entry?.aiSuggestion || entry.reviewStatus !== 'reviewed') return state;

            const suggestion = entry.aiSuggestion;
            let finalData: SectionStoreEntry['data'];

            const currentIsObject = entry.data !== null && typeof entry.data === 'object' && !Array.isArray(entry.data);
            const suggestionIsObject = suggestion !== null && typeof suggestion === 'object' && !Array.isArray(suggestion);

            if (currentIsObject && suggestionIsObject) {
              finalData = deepMerge(
                entry.data as Record<string, unknown>,
                suggestion as Record<string, unknown>,
              );
            } else {
              finalData = suggestion;
            }

            return {
              sections: {
                ...state.sections,
                [key]: {
                  ...entry,
                  data: finalData,
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

          const existing = updatedSections[key] ?? createEmptySectionEntry();
          updatedSections[key] = {
            ...existing,
            lastEditedAt: now,
            isStale: false,
            staleBecauseOf: [],
            staleAt: null,
          };

          const affectedKeys = getTransitiveDependents(key);

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

        setAiAction: (key, action) =>
          set((state) => ({
            sections: {
              ...state.sections,
              [key]: {
                ...(state.sections[key] ?? createEmptySectionEntry()),
                aiAction: action,
              },
            },
          })),

        hydrate: (sectionsData) =>
          set((state) => {
            const hydrated: Partial<Record<SectionKey, SectionStoreEntry>> = { ...state.sections };

            for (const [key, data] of Object.entries(sectionsData)) {
              const sectionKey = key as SectionKey;
              const existing = hydrated[sectionKey];

              const migratedData = (data && typeof data === 'object' && !Array.isArray(data))
                ? ensureArrayItemIds(data as Record<string, unknown>)
                : data;

              if (existing) {
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

export function getCurationFormStore(challengeId: string) {
  let store = storeCache.get(challengeId);
  if (!store) {
    store = createCurationFormStore(challengeId);
    storeCache.set(challengeId, store);
  }
  return store;
}

export function useCurationFormStore(challengeId: string) {
  return getCurationFormStore(challengeId);
}
