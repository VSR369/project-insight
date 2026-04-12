/**
 * useWaveReviewSection — Extracted single-section review logic from useWaveExecutor.
 * Handles invoking the edge function, normalizing results, and updating the store.
 */

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCurationFormStore } from '@/store/curationFormStore';
import { normalizeSectionReview } from '@/lib/cogniblend/normalizeSectionReview';
import { parseSuggestionForSection } from '@/lib/cogniblend/parseSuggestion';
import { validateAIOutput } from '@/lib/cogniblend/postLlmValidation';
import type { ChallengeContext } from '@/lib/cogniblend/challengeContextAssembler';
import type { SectionKey } from '@/types/sections';
import type { SectionReview } from '@/components/cogniblend/curation/CurationAIReviewPanel';
import type { SectionAction } from '@/lib/cogniblend/waveConfig';

interface UseWaveReviewSectionOptions {
  challengeId: string;
  onSectionReviewed: (sectionKey: string, review: SectionReview) => void;
  onComplexitySuggestion?: (suggestion: Record<string, any>) => void;
  pass1Only?: boolean;
  skipAnalysis?: boolean;
  providedCommentsBySectionKey?: Record<string, unknown[]>;
}

export function useWaveReviewSection({
  challengeId,
  onSectionReviewed,
  onComplexitySuggestion,
  pass1Only = false,
  skipAnalysis = false,
  providedCommentsBySectionKey,
}: UseWaveReviewSectionOptions) {
  return useCallback(async (
    sectionKey: SectionKey,
    action: SectionAction,
    context: ChallengeContext,
  ): Promise<'success' | 'error' | 'skipped'> => {
    if (action === 'skip') return 'skipped';

    const store = getCurationFormStore(challengeId);
    store.getState().setReviewStatus(sectionKey, 'pending');

    try {
      const currentContent = context.sections[sectionKey] ?? null;
      const body: Record<string, unknown> = {
        challenge_id: challengeId,
        section_key: sectionKey,
        role_context: 'curation',
        current_content: currentContent,
        context,
        wave_action: action,
      };

      if (pass1Only) body.pass1_only = true;

      if (skipAnalysis && providedCommentsBySectionKey) {
        const existingComments = providedCommentsBySectionKey[sectionKey];
        if (existingComments?.length) {
          body.skip_analysis = true;
          body.provided_comments = [{
            section_key: sectionKey,
            status: 'warning',
            comments: existingComments,
          }];
        }
      }

      const { data, error } = await supabase.functions.invoke('review-challenge-sections', {
        body,
      });

      if (error) throw new Error(error.message);

      if (data?.success && data.data?.sections) {
        const reviewResult = (data.data.sections as SectionReview[])[0];
        if (reviewResult) {
          const normalized = normalizeSectionReview(reviewResult);

          if (sectionKey === 'complexity') {
            const rawSection = (data.data.sections as any[])[0];
            if (rawSection?.suggested_complexity && onComplexitySuggestion) {
              onComplexitySuggestion({ ...rawSection.suggested_complexity });
            }
          }

          const rawSuggestion = (normalized as any).suggestion ?? null;
          const parsedSuggestion = rawSuggestion && typeof rawSuggestion === 'string'
            ? parseSuggestionForSection(sectionKey, rawSuggestion)
            : rawSuggestion;

          store.getState().setAiReview(sectionKey, normalized.comments ?? [], parsedSuggestion);
          store.getState().clearStaleness(sectionKey);

          if ((normalized as any).status === 'generated' && parsedSuggestion != null) {
            store.getState().setSectionData(sectionKey, parsedSuggestion);
          }

          if (context.todaysDate) {
            const validationResult = validateAIOutput(
              sectionKey,
              (normalized as any).suggestion ?? normalized,
              context,
            );
            store.getState().setValidationResult(sectionKey, validationResult);
          }

          onSectionReviewed(sectionKey, { ...normalized, addressed: false });
          return 'success';
        }
      } else if (data?.success && data.data) {
        store.getState().setAiReview(
          sectionKey,
          data.data.comments ?? [],
          data.data.suggestion ?? data.data,
        );
        store.getState().clearStaleness(sectionKey);

        if (context.todaysDate) {
          const validationResult = validateAIOutput(
            sectionKey,
            data.data.suggestion ?? data.data,
            context,
          );
          store.getState().setValidationResult(sectionKey, validationResult);
        }

        onSectionReviewed(sectionKey, {
          section_key: sectionKey,
          status: 'warning',
          comments: data.data.comments ?? [],
          addressed: false,
        } as SectionReview);
        return 'success';
      }

      throw new Error('Unexpected response shape');
    } catch (err: any) {
      store.getState().setReviewStatus(sectionKey, 'error');
      return 'error';
    }
  }, [challengeId, onSectionReviewed, onComplexitySuggestion, pass1Only, skipAnalysis, providedCommentsBySectionKey]);
}
