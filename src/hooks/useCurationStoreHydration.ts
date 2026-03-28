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
  eligibility: string | null;
  description: string | null;
  domain_tags: unknown;
  submission_deadline: string | null;
  challenge_visibility: string | null;
  
  expected_outcomes: unknown;
  extended_brief: unknown;
  solver_expertise_requirements: unknown;
  complexity_parameters: unknown;
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
  ['domain_tags', 'domain_tags' as SectionKey],
  ['submission_deadline', 'submission_deadline' as SectionKey],
  ['challenge_visibility', 'challenge_visibility' as SectionKey],
  ['effort_level', 'effort_level' as SectionKey],
  ['expected_outcomes', 'expected_outcomes' as SectionKey],
  ['extended_brief', 'extended_brief' as SectionKey],
  ['solver_expertise_requirements', 'solver_expertise' as SectionKey],
  ['complexity_parameters', 'complexity' as SectionKey],
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

      const commentsChanged = JSON.stringify(currentComments) !== JSON.stringify(newComments);
      const statusChanged = currentStatus !== newStatus;
      const addressedChanged = currentAddressed !== newAddressed;

      if (commentsChanged || statusChanged || addressedChanged) {
        // Update store entry without triggering a full re-render cascade
        storeState.setAiReview(sectionKey, newComments);
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
