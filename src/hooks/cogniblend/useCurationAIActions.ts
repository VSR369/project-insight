/**
 * useCurationAIActions — AI review, quality analysis, and wave execution callbacks.
 * Complexity re-review, accept-all, and warning navigation extracted to useCurationComplexityActions.
 */

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { preFlightCheck } from '@/lib/cogniblend/preFlightCheck';
import { buildChallengeContext, type BuildChallengeContextOptions } from '@/lib/cogniblend/challengeContextAssembler';
import { detectBudgetShortfall, type BudgetShortfallResult } from '@/lib/cogniblend/budgetShortfallDetection';
import { EXTENDED_BRIEF_FIELD_MAP } from '@/lib/cogniblend/curationSectionFormats';
import { resolveIndustrySegmentId, parseJson } from '@/lib/cogniblend/curationHelpers';
import type { ChallengeData } from '@/lib/cogniblend/curationTypes';
import { parseJson as jsonParse } from '@/lib/cogniblend/jsonbUnwrap';
import { normalizeSectionReview } from '@/lib/cogniblend/normalizeSectionReview';
import type { SectionReview } from '@/components/cogniblend/curation/CurationAIReviewPanel';
import type { AIQualitySummary } from '@/lib/cogniblend/curationTypes';
import type { Json } from '@/integrations/supabase/types';
import { useCurationComplexityActions } from './useCurationComplexityActions';

interface UseCurationAIActionsOptions {
  challengeId: string | undefined;
  challenge: Record<string, any> | null;
  curationStore: any;
  optimisticIndustrySegId: string | null;
  isWaveRunning: boolean;
  aiReviews: SectionReview[];
  buildContextOptions: () => BuildChallengeContextOptions;
  executeWaves: () => Promise<void>;
  saveSectionMutationRef: React.RefObject<any>;
  setPreFlightResult: (v: any) => void;
  setPreFlightDialogOpen: (v: boolean) => void;
  setAiReviewLoading: (v: boolean) => void;
  setTriageTotalCount: (v: number) => void;
  setBudgetShortfall: (v: BudgetShortfallResult | null) => void;
  setAiQuality: (v: AIQualitySummary) => void;
  setAiQualityLoading: (v: boolean) => void;
  setAiReviews: React.Dispatch<React.SetStateAction<SectionReview[]>>;
  setAiSuggestedComplexity: (v: any) => void;
  setHighlightWarnings: (v: boolean) => void;
}

export function useCurationAIActions({
  challengeId, challenge, curationStore, optimisticIndustrySegId,
  isWaveRunning, aiReviews, buildContextOptions, executeWaves,
  saveSectionMutationRef, setPreFlightResult, setPreFlightDialogOpen,
  setAiReviewLoading, setTriageTotalCount, setBudgetShortfall,
  setAiQuality, setAiQualityLoading, setAiReviews,
  setAiSuggestedComplexity, setHighlightWarnings,
}: UseCurationAIActionsOptions) {

  const executeWavesWithBudgetCheck = useCallback(async () => {
    setAiReviewLoading(true);
    setTriageTotalCount(0);
    try {
      await executeWaves();
      const ctx = buildChallengeContext(buildContextOptions());
      const shortfall = detectBudgetShortfall(ctx);
      setBudgetShortfall(shortfall);
      setTriageTotalCount(24);
    } catch (e: any) {
      toast.error(`AI review failed: ${e.message ?? "Unknown error"}`);
    } finally {
      setAiReviewLoading(false);
    }
  }, [executeWaves, buildContextOptions, setAiReviewLoading, setTriageTotalCount, setBudgetShortfall]);

  const handleAIReview = useCallback(async () => {
    if (!challengeId || !challenge) return;
    if (isWaveRunning) return;

    const store = curationStore;
    const sectionContents: Record<string, string | null> = {};
    if (store) {
      const state = store.getState();
      for (const [key, entry] of Object.entries(state.sections)) {
        if ((entry as any)?.data != null) {
          sectionContents[key] = typeof (entry as any).data === 'string' ? (entry as any).data : JSON.stringify((entry as any).data);
        } else {
          sectionContents[key] = (challenge as any)?.[key] ?? null;
        }
      }
    }

    const ebForPreFlight = jsonParse<Record<string, unknown>>(challenge.extended_brief as Json);
    if (ebForPreFlight) {
      for (const [subKey, jsonbField] of Object.entries(EXTENDED_BRIEF_FIELD_MAP)) {
        if (!sectionContents[subKey]) {
          const val = ebForPreFlight[jsonbField];
          if (val != null) sectionContents[subKey] = typeof val === 'string' ? val : JSON.stringify(val);
        }
      }
    }

    if (!sectionContents['problem_statement']) sectionContents['problem_statement'] = challenge.problem_statement;
    if (!sectionContents['scope']) sectionContents['scope'] = challenge.scope;

    const industrySegId = optimisticIndustrySegId ?? resolveIndustrySegmentId(challenge as unknown as ChallengeData);
    if (!industrySegId) sectionContents['industry_segment'] = null;

    const pfResult = preFlightCheck(sectionContents, challenge.operating_model as string | null);

    if (!industrySegId) {
      pfResult.missingMandatory.push({
        sectionId: 'context_and_background' as any,
        sectionName: 'Industry Segment',
        reason: 'Industry segment must be set in Context & Background before AI review. It drives taxonomy cascades across all sections.',
      });
      pfResult.canProceed = false;
    }

    setPreFlightResult(pfResult);
    if (!pfResult.canProceed || pfResult.warnings.length > 0) {
      setPreFlightDialogOpen(true);
      return;
    }
    await executeWavesWithBudgetCheck();
  }, [challengeId, challenge, isWaveRunning, curationStore, optimisticIndustrySegId, executeWavesWithBudgetCheck, setPreFlightResult, setPreFlightDialogOpen]);

  const handleAIQualityAnalysis = useCallback(async () => {
    if (!challengeId) return;
    setAiQualityLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-challenge-quality", {
        body: { challenge_id: challengeId },
      });
      if (error) {
        let msg = error.message;
        try { const body = await (error as any).context?.json?.(); msg = body?.error?.message ?? msg; } catch {}
        throw new Error(msg);
      }
      if (data?.success && data?.data) {
        const score = data.data.overall_score ?? 0;
        const gaps = data.data.gaps ?? [];
        setAiQuality({ overall_score: score, gaps });
        toast.success(`AI analysis complete — Score: ${score}/100, ${gaps.length} gap${gaps.length !== 1 ? "s" : ""} found`);
      } else {
        throw new Error(data?.error?.message ?? "Unexpected response from AI analysis");
      }
    } catch (e: any) {
      toast.error(`AI analysis failed: ${e.message ?? "Unknown error"}`);
    } finally {
      setAiQualityLoading(false);
    }
  }, [challengeId, setAiQuality, setAiQualityLoading]);

  const handleSingleSectionReview = useCallback((sectionKey: string, freshReview: SectionReview) => {
    const normalized = normalizeSectionReview(freshReview);
    setAiReviews((prev) => {
      const filtered = prev.filter((r) => r.section_key !== sectionKey);
      return [...filtered, { ...normalized, addressed: false }];
    });
    const currentReviews = aiReviews.filter((r) => r.section_key !== sectionKey);
    saveSectionMutationRef.current.mutate({ field: "ai_section_reviews", value: [...currentReviews, { ...normalized, addressed: false }] });
  }, [aiReviews, setAiReviews, saveSectionMutationRef]);

  // ── Delegated: complexity re-review, accept-all, warnings ──
  const complexity = useCurationComplexityActions({
    challengeId, aiReviews, setAiReviews,
    setAiSuggestedComplexity, setHighlightWarnings, saveSectionMutationRef,
  });

  return {
    executeWavesWithBudgetCheck,
    handleAIReview,
    handleAIQualityAnalysis,
    handleSingleSectionReview,
    ...complexity,
  };
}
