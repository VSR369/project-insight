/**
 * useCurationEffects — Side-effect hooks extracted from useCurationPageOrchestrator.
 * Handles AI review hydration and content migration on mount.
 */

import { useEffect, useRef } from 'react';
import { normalizeSectionReviews } from '@/lib/cogniblend/normalizeSectionReview';
import { findCorruptedFields } from '@/utils/migrateCorruptedContent';
import type { SectionReview } from '@/components/cogniblend/curation/CurationAIReviewPanel';
import type { UseMutationResult } from '@tanstack/react-query';

interface UseCurationEffectsOptions {
  challenge: Record<string, unknown> | null;
  aiReviewsLoaded: boolean;
  setAiReviews: React.Dispatch<React.SetStateAction<SectionReview[]>>;
  setAiReviewsLoaded: React.Dispatch<React.SetStateAction<boolean>>;
  setPass1DoneSession?: React.Dispatch<React.SetStateAction<boolean>>;
  saveSectionMutation: UseMutationResult<void, Error, { field: string; value: unknown }>;
}

export function useCurationEffects({
  challenge,
  aiReviewsLoaded,
  setAiReviews,
  setAiReviewsLoaded,
  setPass1DoneSession,
  saveSectionMutation,
}: UseCurationEffectsOptions) {
  const saveSectionMutationRef = useRef(saveSectionMutation);
  saveSectionMutationRef.current = saveSectionMutation;

  // ── AI review hydration effect ──
  useEffect(() => {
    if (challenge?.ai_section_reviews && !aiReviewsLoaded) {
      let stored: SectionReview[] = [];
      if (Array.isArray(challenge.ai_section_reviews)) {
        stored = normalizeSectionReviews(challenge.ai_section_reviews as unknown as SectionReview[]);
      } else if (challenge.ai_section_reviews && typeof challenge.ai_section_reviews === 'object') {
        const objMap = challenge.ai_section_reviews as Record<string, any>;
        const converted: SectionReview[] = [];
        for (const [key, val] of Object.entries(objMap)) {
          if (val && typeof val === 'object' && 'section_key' in val) {
            converted.push({
              section_key: val.section_key ?? key,
              status: val.status ?? 'pass',
              comments: Array.isArray(val.comments) ? val.comments : [],
              reviewed_at: val.reviewed_at,
              addressed: val.addressed ?? false,
            });
          }
        }
        if (converted.length > 0) {
          stored = normalizeSectionReviews(converted);
          saveSectionMutationRef.current.mutate({ field: 'ai_section_reviews', value: stored });
        }
      }
      if (stored.length > 0) {
        setAiReviews(stored);
        // Seed pass1DoneSession so "Re-analyse" button persists across reloads
        setPass1DoneSession?.(true);
      }
      setAiReviewsLoaded(true);
    }
  }, [challenge?.ai_section_reviews, aiReviewsLoaded]);

  // ── Content migration effect ──
  const contentMigrationRanRef = useRef(false);
  useEffect(() => {
    if (!challenge || contentMigrationRanRef.current) return;
    contentMigrationRanRef.current = true;
    const targets = [
      { dbField: 'problem_statement', content: challenge.problem_statement as string | null },
      { dbField: 'scope', content: challenge.scope as string | null },
      { dbField: 'hook', content: challenge.hook as string | null },
      { dbField: 'description', content: challenge.description as string | null },
    ];
    const corrupted = findCorruptedFields(targets);
    corrupted.forEach(({ dbField, fixed }) => {
      saveSectionMutationRef.current.mutate({ field: dbField, value: fixed });
    });
  }, [challenge]);
}
