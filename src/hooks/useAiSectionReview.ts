/**
 * useAiSectionReview — Unified AI review lifecycle hook for all sections.
 *
 * Provides: review(), accept(), reject(), reReview()
 * Routes to the correct edge function via SECTION_REVIEW_ROUTES.
 * Never mutates section data during review — only on explicit accept().
 *
 * Phase 4: Passes full ChallengeContext to edge function + runs post-LLM validation.
 */

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getCurationFormStore, selectIsAnyReviewPending } from '@/store/curationFormStore';
import { getReviewRoute } from '@/lib/sectionRoutes';
import { validateAIOutput } from '@/lib/cogniblend/postLlmValidation';
import { parseSuggestionForSection } from '@/lib/cogniblend/parseSuggestion';
import type { ChallengeContext } from '@/lib/cogniblend/challengeContextAssembler';
import type { SectionKey } from '@/types/sections';

interface UseAiSectionReviewOptions {
  challengeId: string;
  roleContext?: 'intake' | 'spec' | 'curation';
  challengeContext?: ChallengeContext | {
    title?: string;
    maturity_level?: string | null;
    domain_tags?: string[];
  };
}

interface AiSectionReviewReturn {
  /** Run AI review for a single section */
  review: (sectionKey: SectionKey, currentContent: string | null) => Promise<void>;
  /** Accept AI suggestion — deep merges into section data */
  accept: (sectionKey: SectionKey) => void;
  /** Reject AI suggestion — clears suggestion and comments */
  reject: (sectionKey: SectionKey) => void;
  /** Re-review a section with current data */
  reReview: (sectionKey: SectionKey, currentContent: string | null) => Promise<void>;
  /** Run AI review for all sections via Promise.allSettled */
  reviewAll: (sections: Array<{ key: SectionKey; content: string | null }>) => Promise<void>;
  /** Whether any section review is currently pending */
  isAnyPending: boolean;
}

export function useAiSectionReview({
  challengeId,
  roleContext = 'curation',
  challengeContext,
}: UseAiSectionReviewOptions): AiSectionReviewReturn {
  const store = getCurationFormStore(challengeId);
  const isAnyPending = store(selectIsAnyReviewPending);

  const reviewSingle = useCallback(async (sectionKey: SectionKey, currentContent: string | null) => {
    const edgeFn = getReviewRoute(sectionKey);

    store.getState().setReviewStatus(sectionKey, 'pending');

    try {
      const { data, error } = await supabase.functions.invoke(edgeFn, {
        body: {
          challenge_id: challengeId,
          section_key: sectionKey,
          role_context: roleContext,
          current_content: currentContent,
          context: challengeContext,
          wave_action: 'review',
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.success && data.data?.sections) {
        const reviewResult = (data.data.sections as any[])[0];
        if (reviewResult) {
          store.getState().setAiReview(
            sectionKey,
            reviewResult.comments ?? [],
            reviewResult.suggestion ?? null,
          );
          // Clear staleness after successful review
          store.getState().clearStaleness(sectionKey);

          // Post-LLM validation (Phase 4)
          if (challengeContext && 'todaysDate' in challengeContext) {
            const validationResult = validateAIOutput(
              sectionKey,
              reviewResult.suggestion ?? reviewResult,
              challengeContext as ChallengeContext,
            );
            store.getState().setValidationResult(sectionKey, validationResult);
          }
        }
      } else if (data?.success && data.data) {
        // Handle assess-complexity and other non-standard response shapes
        store.getState().setAiReview(
          sectionKey,
          data.data.comments ?? [],
          data.data.suggestion ?? data.data,
        );
        store.getState().clearStaleness(sectionKey);

        // Post-LLM validation (Phase 4)
        if (challengeContext && 'todaysDate' in challengeContext) {
          const validationResult = validateAIOutput(
            sectionKey,
            data.data.suggestion ?? data.data,
            challengeContext as ChallengeContext,
          );
          store.getState().setValidationResult(sectionKey, validationResult);
        }
      } else {
        throw new Error(data?.error?.message ?? 'Unexpected response from AI review');
      }
    } catch (err: any) {
      store.getState().setReviewStatus(sectionKey, 'error');
      toast.error(`Review failed for ${sectionKey}: ${err.message}`);
    }
  }, [challengeId, roleContext, challengeContext, store]);

  const review = useCallback(async (sectionKey: SectionKey, currentContent: string | null) => {
    await reviewSingle(sectionKey, currentContent);
  }, [reviewSingle]);

  const accept = useCallback((sectionKey: SectionKey) => {
    store.getState().acceptAiSuggestion(sectionKey);
    store.getState().clearStaleness(sectionKey);
  }, [store]);

  const reject = useCallback((sectionKey: SectionKey) => {
    store.getState().rejectAiSuggestion(sectionKey);
  }, [store]);

  const reReview = useCallback(async (sectionKey: SectionKey, currentContent: string | null) => {
    await reviewSingle(sectionKey, currentContent);
  }, [reviewSingle]);

  const reviewAll = useCallback(async (sections: Array<{ key: SectionKey; content: string | null }>) => {
    // Check if any review is already pending — prevent double-click
    if (store.getState().sections && selectIsAnyReviewPending(store.getState())) {
      toast.warning('A review is already in progress. Please wait.');
      return;
    }

    const results = await Promise.allSettled(
      sections.map(({ key, content }) => reviewSingle(key, content)),
    );

    const failed = results.filter((r) => r.status === 'rejected');
    if (failed.length > 0) {
      toast.error(`${failed.length} section review(s) failed.`);
    } else {
      toast.success('All section reviews complete.');
    }
  }, [reviewSingle, store]);

  return {
    review,
    accept,
    reject,
    reReview,
    reviewAll,
    isAnyPending,
  };
}
