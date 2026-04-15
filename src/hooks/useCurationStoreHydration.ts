/**
 * useCurationStoreHydration — Bridge between CurationReviewPage's local state
 * and the Zustand curation form store.
 *
 * Responsibilities:
 * - Hydrate store sections from challenge query data on mount
 * - Sync AI review state (aiReviews array ↔ store per-section entries)
 * - Provide helpers to write AI review changes to both local state and store
 *
 * This is the Phase 4 bridge: existing handlers continue working while the store
 * becomes the persistent single source of truth.
 */

import { useEffect, useRef, useCallback } from 'react';
import { getCurationFormStore } from '@/store/curationFormStore';
import { createEmptySectionEntry } from '@/types/sections';
import { EXTENDED_BRIEF_FIELD_MAP } from '@/lib/cogniblend/curationSectionFormats';
import { parseSuggestionForSection } from '@/lib/cogniblend/parseSuggestion';
import type { SectionKey, SectionStoreEntry, ReviewStatus } from '@/types/sections';
import type { SectionReview } from '@/components/cogniblend/shared/AIReviewInline';

interface ChallengeDataSlice {
  problem_statement: string | null;
  scope: string | null;
  hook: string | null;
  deliverables: unknown;
  evaluation_criteria: unknown;
  reward_structure: unknown;
  phase_schedule: unknown;
  ip_model: string | null;
  maturity_level: string | null;
  visibility: string | null;
  eligibility?: string | null;
  description: string | null;
  domain_tags: unknown;
  
  expected_outcomes: unknown;
  extended_brief: unknown;
  solver_expertise_requirements?: unknown;
  complexity_parameters?: unknown;
  submission_guidelines?: unknown;
  solution_types?: unknown;
}

/** Map challenge fields to section keys */
const CHALLENGE_FIELD_TO_SECTION: Array<[keyof ChallengeDataSlice, SectionKey]> = [
  ['problem_statement', 'problem_statement' as SectionKey],
  ['scope', 'scope' as SectionKey],
  ['hook', 'hook' as SectionKey],
  ['deliverables', 'deliverables' as SectionKey],
  ['evaluation_criteria', 'evaluation_criteria' as SectionKey],
  ['reward_structure', 'reward_structure' as SectionKey],
  ['phase_schedule', 'phase_schedule' as SectionKey],
  ['ip_model', 'ip_model' as SectionKey],
  ['maturity_level', 'maturity_level' as SectionKey],
  ['visibility', 'visibility' as SectionKey],
  ['eligibility', 'eligibility' as SectionKey],
  ['description', 'submission_guidelines' as SectionKey],
  ['submission_guidelines', 'submission_guidelines' as SectionKey],
  ['domain_tags', 'domain_tags' as SectionKey],
  
  ['expected_outcomes', 'expected_outcomes' as SectionKey],
  ['extended_brief', 'extended_brief' as SectionKey],
  ['solver_expertise_requirements', 'solver_expertise' as SectionKey],
  ['complexity_parameters', 'complexity' as SectionKey],
  ['solution_types', 'solution_type' as SectionKey],
];

/** Convert SectionReview status to store ReviewStatus */
function toReviewStatus(status: string): ReviewStatus {
  if (status === 'pass' || status === 'warning' || status === 'needs_revision') return 'reviewed';
  return 'idle';
}

interface UseCurationStoreHydrationOptions {
  challengeId: string;
  challenge: ChallengeDataSlice | null | undefined;
  aiReviews: SectionReview[];
}

/**
 * Hydrate the Zustand store from challenge data and sync AI review state.
 * Call this in CurationReviewPage after all hooks but before conditional returns.
 */
export function useCurationStoreHydration({
  challengeId,
  challenge,
  aiReviews,
}: UseCurationStoreHydrationOptions) {
  const store = getCurationFormStore(challengeId);
  const hydratedRef = useRef(false);
  const prevAiReviewsRef = useRef<SectionReview[]>([]);

  // ── Hydrate store from challenge data (once on load) ──
  useEffect(() => {
    if (!challenge || hydratedRef.current) return;
    hydratedRef.current = true;

    const sectionsData: Partial<Record<SectionKey, SectionStoreEntry['data']>> = {};

    for (const [field, sectionKey] of CHALLENGE_FIELD_TO_SECTION) {
      const value = challenge[field];
      if (value != null) {
        sectionsData[sectionKey] = value as SectionStoreEntry['data'];
      }
    }

    // Decompose extended_brief JSONB into individual subsection store entries
    const extBrief = challenge.extended_brief;
    if (extBrief && typeof extBrief === 'object' && !Array.isArray(extBrief)) {
      const briefObj = extBrief as Record<string, unknown>;
      // Reverse map: DB field name → store section key
      for (const [sectionKey, dbField] of Object.entries(EXTENDED_BRIEF_FIELD_MAP)) {
        const value = briefObj[dbField];
        if (value != null) {
          sectionsData[sectionKey as SectionKey] = value as SectionStoreEntry['data'];
        }
      }
      // Also check for keys that match directly (e.g. context_background stored as-is)
      for (const [key, value] of Object.entries(briefObj)) {
        if (value != null) {
          // Find the section key for this DB field
          const matchedSection = Object.entries(EXTENDED_BRIEF_FIELD_MAP).find(([, dbF]) => dbF === key);
          if (matchedSection) {
            sectionsData[matchedSection[0] as SectionKey] = value as SectionStoreEntry['data'];
          }
        }
      }
    }

    if (Object.keys(sectionsData).length > 0) {
      store.getState().hydrate(sectionsData);
    }
  }, [challenge, store]);

  // ── Sync aiReviews array → store per-section review state ──
  useEffect(() => {
    if (aiReviews === prevAiReviewsRef.current) return;
    prevAiReviewsRef.current = aiReviews;

    if (aiReviews.length === 0) return;

    const storeState = store.getState();

    for (const review of aiReviews) {
      const sectionKey = review.section_key as SectionKey;
      const existing = storeState.sections[sectionKey];

      // Only update if the review state actually differs
      const currentComments = existing?.aiComments;
      const newComments = review.comments ?? [];
      const currentAddressed = existing?.addressed ?? false;
      const newAddressed = review.addressed ?? false;
      const currentStatus = existing?.reviewStatus ?? 'idle';
      const newStatus = toReviewStatus(review.status);

      // Fix 1 & 7: Extract and parse suggestion from review
      const rawSuggestion = (review as Record<string, unknown>).suggestion ?? null;
      const parsedSuggestion = rawSuggestion && typeof rawSuggestion === 'string'
        ? parseSuggestionForSection(sectionKey, rawSuggestion)
        : rawSuggestion as SectionStoreEntry['data'];

      const commentsChanged = JSON.stringify(currentComments) !== JSON.stringify(newComments);
      const statusChanged = currentStatus !== newStatus;
      const addressedChanged = currentAddressed !== newAddressed;
      const suggestionChanged = JSON.stringify(existing?.aiSuggestion) !== JSON.stringify(parsedSuggestion);

      if (commentsChanged || statusChanged || addressedChanged || suggestionChanged) {
        storeState.setAiReview(sectionKey, newComments, parsedSuggestion);
        if (newAddressed) {
          storeState.markAddressed(sectionKey);
        }
      }
    }
  }, [aiReviews, store]);

  // ── Helper: sync a section's data to the store after a save ──
  const syncSectionToStore = useCallback((sectionKey: SectionKey, data: SectionStoreEntry['data']) => {
    store.getState().setSectionData(sectionKey, data);
  }, [store]);

  return { syncSectionToStore };
}
