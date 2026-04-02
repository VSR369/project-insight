/**
 * useCurationAIActions — AI review, quality analysis, and wave execution callbacks.
 * Extracted from CurationReviewPage (Phase D4.2).
 */

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { preFlightCheck } from '@/lib/cogniblend/preFlightCheck';
import { buildChallengeContext, type BuildChallengeContextOptions } from '@/lib/cogniblend/challengeContextAssembler';
import { detectBudgetShortfall, type BudgetShortfallResult } from '@/lib/cogniblend/budgetShortfallDetection';
import { EXTENDED_BRIEF_FIELD_MAP } from '@/lib/cogniblend/curationSectionFormats';
import { GROUPS } from '@/lib/cogniblend/curationSectionDefs';
import { resolveIndustrySegmentId, parseJson } from '@/lib/cogniblend/curationHelpers';
import type { ChallengeData } from '@/lib/cogniblend/curationTypes';
import { parseJson as jsonParse } from '@/lib/cogniblend/jsonbUnwrap';
import { normalizeSectionReview } from '@/lib/cogniblend/normalizeSectionReview';
import type { SectionReview } from '@/components/cogniblend/curation/CurationAIReviewPanel';
import type { SectionKey } from '@/types/sections';
import type { AIQualitySummary } from '@/lib/cogniblend/curationTypes';
import type { Json } from '@/integrations/supabase/types';

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
  // State setters
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
  challengeId,
  challenge,
  curationStore,
  optimisticIndustrySegId,
  isWaveRunning,
  aiReviews,
  buildContextOptions,
  executeWaves,
  saveSectionMutationRef,
  setPreFlightResult,
  setPreFlightDialogOpen,
  setAiReviewLoading,
  setTriageTotalCount,
  setBudgetShortfall,
  setAiQuality,
  setAiQualityLoading,
  setAiReviews,
  setAiSuggestedComplexity,
  setHighlightWarnings,
}: UseCurationAIActionsOptions) {

  /** Execute waves and check budget shortfall after completion */
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

  /** Main AI review entry point with pre-flight gating */
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
          if (val != null) {
            sectionContents[subKey] = typeof val === 'string' ? val : JSON.stringify(val);
          }
        }
      }
    }

    if (!sectionContents['problem_statement']) sectionContents['problem_statement'] = challenge.problem_statement;
    if (!sectionContents['scope']) sectionContents['scope'] = challenge.scope;

    const industrySegId = optimisticIndustrySegId ?? resolveIndustrySegmentId(challenge as unknown as ChallengeData);
    if (!industrySegId) {
      sectionContents['industry_segment'] = null;
    }

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

    if (!pfResult.canProceed) {
      setPreFlightDialogOpen(true);
      return;
    }

    if (pfResult.warnings.length > 0) {
      setPreFlightDialogOpen(true);
      return;
    }

    await executeWavesWithBudgetCheck();
  }, [challengeId, challenge, isWaveRunning, curationStore, optimisticIndustrySegId, executeWavesWithBudgetCheck, setPreFlightResult, setPreFlightDialogOpen]);

  /** AI quality analysis */
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

  /** Handle single-section re-review result */
  const handleSingleSectionReview = useCallback((sectionKey: string, freshReview: SectionReview) => {
    const normalized = normalizeSectionReview(freshReview);
    setAiReviews((prev) => {
      const filtered = prev.filter((r) => r.section_key !== sectionKey);
      return [...filtered, { ...normalized, addressed: false }];
    });
    const currentReviews = aiReviews.filter((r) => r.section_key !== sectionKey);
    const updated = [...currentReviews, { ...normalized, addressed: false }];
    saveSectionMutationRef.current.mutate({ field: "ai_section_reviews", value: updated });
  }, [aiReviews, setAiReviews, saveSectionMutationRef]);

  /** Custom re-review handler for complexity */
  const handleComplexityReReview = useCallback(async (_sectionKey: string) => {
    if (!challengeId) return;
    const { data, error } = await supabase.functions.invoke("review-challenge-sections", {
      body: { challenge_id: challengeId, section_key: 'complexity', role_context: 'curation' },
    });

    if (error) {
      let msg = error.message;
      try { const body = await (error as any).context?.json?.(); msg = body?.error?.message ?? msg; } catch {}
      throw new Error(msg);
    }
    if (!data?.success) {
      throw new Error(data?.error?.message ?? "Complexity review failed");
    }

    const sections = data.data?.sections as any[];
    const complexitySection = sections?.[0];
    if (!complexitySection) throw new Error("No complexity review returned");

    if (complexitySection.suggested_complexity) {
      setAiSuggestedComplexity({ ...complexitySection.suggested_complexity });
    }

    const complexityReview: SectionReview = {
      section_key: 'complexity',
      status: complexitySection.status ?? 'warning',
      comments: complexitySection.comments ?? [],
      addressed: false,
      reviewed_at: complexitySection.reviewed_at ?? new Date().toISOString(),
    };
    const normalized = normalizeSectionReview(complexityReview);
    setAiReviews((prev) => {
      const filtered = prev.filter((r) => r.section_key !== 'complexity');
      return [...filtered, normalized];
    });
    const currentReviews = aiReviews.filter((r) => r.section_key !== 'complexity');
    saveSectionMutationRef.current.mutate({ field: "ai_section_reviews", value: [...currentReviews, normalized] });
    const hasIssues = (complexitySection.comments ?? []).length > 0;
    toast.success(hasIssues ? "Re-review complete — see updated complexity assessment." : "Complexity looks good — no issues found.");
  }, [challengeId, aiReviews, setAiReviews, setAiSuggestedComplexity, saveSectionMutationRef]);

  /** Accept all passing AI reviews */
  const handleAcceptAllPassing = useCallback((handleMarkAddressed: (key: string) => void) => {
    const passingSections = aiReviews.filter((r) => r.status === "pass" && !r.addressed);
    if (passingSections.length === 0) return;
    passingSections.forEach((r) => {
      handleMarkAddressed(r.section_key);
    });
    toast.success(`${passingSections.length} section${passingSections.length !== 1 ? "s" : ""} updated automatically`);
  }, [aiReviews]);

  /** Scroll to first warning section */
  const handleReviewWarnings = useCallback(() => {
    setHighlightWarnings(true);
    const firstWarning = aiReviews.find(
      (r) => (r.status === "warning" || r.status === "needs_revision") && !r.addressed
    );
    if (firstWarning) {
      const el = document.querySelector(`[data-section-key="${firstWarning.section_key}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
    setTimeout(() => setHighlightWarnings(false), 10000);
  }, [aiReviews, setHighlightWarnings]);

  return {
    executeWavesWithBudgetCheck,
    handleAIReview,
    handleAIQualityAnalysis,
    handleSingleSectionReview,
    handleComplexityReReview,
    handleAcceptAllPassing,
    handleReviewWarnings,
  };
}
