/**
 * useCreatorAIReview — Calls check-challenge-quality edge function for Creator's fields.
 * Returns per-field scores and comments.
 */

import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { handleMutationError } from '@/lib/errorHandler';
import type { GovernanceMode } from '@/lib/governanceMode';

export interface FieldReviewResult {
  fieldKey: string;
  score: number;
  comment: string;
  suggestion?: string;
}

export interface AIReviewResult {
  overallScore: number;
  fieldResults: FieldReviewResult[];
}

interface ReviewParams {
  challengeId: string;
  governanceMode: GovernanceMode;
  engagementModel: string;
  industrySegmentId: string;
}

export function useCreatorAIReview() {
  return useMutation<AIReviewResult, Error, ReviewParams>({
    mutationFn: async ({ challengeId, governanceMode, engagementModel, industrySegmentId }) => {
      const { data, error } = await supabase.functions.invoke('check-challenge-quality', {
        body: {
          challengeId,
          governanceMode,
          engagementModel,
          industrySegmentId,
          reviewScope: 'creator_fields_only',
        },
      });

      if (error) throw new Error(error.message || 'AI review failed');

      const result = data as Record<string, unknown>;
      const fieldResults = Array.isArray(result.fieldResults)
        ? (result.fieldResults as FieldReviewResult[])
        : [];

      return {
        overallScore: typeof result.overallScore === 'number' ? result.overallScore : 0,
        fieldResults,
      };
    },
    onError: (error) => {
      handleMutationError(error, { operation: 'creator_ai_review', component: 'CreatorAIReviewDrawer' });
    },
  });
}
