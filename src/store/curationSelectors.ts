/**
 * curationSelectors — Zustand selectors extracted from curationFormStore.
 * Re-exported from the store for backward compatibility.
 */

import type { SectionKey, SectionStoreEntry } from '@/types/sections';

interface CurationFormState {
  sections: Partial<Record<SectionKey, SectionStoreEntry>>;
}

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
