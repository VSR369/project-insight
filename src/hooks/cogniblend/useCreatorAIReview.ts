/**
 * useCreatorAIReview — Calls check-challenge-quality edge function for Creator's fields.
 * Uses 4-dimension model (no legal compliance). Transforms AI response into per-field scores.
 */

import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { handleMutationError } from '@/lib/errorHandler';
import type { GovernanceMode } from '@/lib/governanceMode';
import { CREATOR_REVIEW_FIELDS } from '@/constants/creatorReviewFields';
import { resolveFieldKey, deriveFieldScore, buildFieldComment } from '@/lib/creatorReviewMapper';

export interface FieldReviewResult {
  fieldKey: string;
  score: number;
  comment: string;
  suggestion?: string;
}

export interface DimensionScores {
  completeness: number;
  clarity: number;
  solverReadiness: number;
  governanceAlignment: number;
}

export interface AIReviewResult {
  overallScore: number;
  dimensions: DimensionScores;
  summary: string;
  strengths: string[];
  fieldResults: FieldReviewResult[];
}

interface ReviewParams {
  challengeId: string;
  governanceMode: GovernanceMode;
  engagementModel: string;
  industrySegmentId: string;
}

interface RawGap {
  field: string;
  severity: string;
  message: string;
}

interface RawAIData {
  overall_score?: number;
  completeness_score?: number;
  clarity_score?: number;
  solver_readiness_score?: number;
  governance_alignment_score?: number;
  content_quality_score?: number;
  summary?: string;
  gaps?: RawGap[];
  strengths?: string[];
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

      const envelope = data as { success?: boolean; data?: RawAIData; error?: { message?: string; code?: string }; fallback?: boolean };
      if (envelope.fallback) {
        throw new Error('AI service temporarily unavailable. Please try again in 30 seconds.');
      }
      if (!envelope.success || !envelope.data) {
        throw new Error(envelope.error?.message ?? 'AI review returned no data');
      }

      const raw = envelope.data;
      const dimensions: DimensionScores = {
        completeness: raw.completeness_score ?? 0,
        clarity: raw.clarity_score ?? 0,
        solverReadiness: raw.solver_readiness_score ?? 0,
        governanceAlignment: raw.governance_alignment_score ?? 0,
      };

      const gaps = Array.isArray(raw.gaps) ? raw.gaps : [];
      const strengths = Array.isArray(raw.strengths) ? raw.strengths : [];
      const reviewFields = CREATOR_REVIEW_FIELDS[governanceMode];

      const gapsByField = new Map<string, RawGap[]>();
      for (const gap of gaps) {
        const canonical = resolveFieldKey(gap.field);
        if (!canonical) continue;
        const existing = gapsByField.get(canonical) ?? [];
        existing.push(gap);
        gapsByField.set(canonical, existing);
      }

      const fieldResults: FieldReviewResult[] = reviewFields.map((f) => {
        const fieldGaps = gapsByField.get(f.key);
        const score = deriveFieldScore(fieldGaps);
        const comment = buildFieldComment(fieldGaps, strengths, f.label);
        return { fieldKey: f.key, score, comment };
      });

      return {
        overallScore: raw.overall_score ?? 0,
        dimensions,
        summary: raw.summary ?? '',
        strengths,
        fieldResults,
      };
    },
    onError: (error) => {
      handleMutationError(error, { operation: 'creator_ai_review', component: 'CreatorAIReviewDrawer' });
    },
  });
}
