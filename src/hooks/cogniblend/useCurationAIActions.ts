/**
 * useCurationAIActions — AI review, quality analysis, and wave execution callbacks.
 * Complexity re-review, accept-all, and warning navigation extracted to useCurationComplexityActions.
 */

import { useCallback, type Dispatch, type SetStateAction } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { preFlightCheck } from '@/lib/cogniblend/preFlightCheck';
import { buildChallengeContext, type BuildChallengeContextOptions } from '@/lib/cogniblend/challengeContextAssembler';
import { detectBudgetShortfall, type BudgetShortfallResult } from '@/lib/cogniblend/budgetShortfallDetection';
import { EXTENDED_BRIEF_FIELD_MAP } from '@/lib/cogniblend/curationSectionFormats';
import { resolveIndustrySegmentId, parseJson } from '@/lib/cogniblend/curationHelpers';
import { DISCOVERY_WAVE_NUMBER, createInitialWaveProgressWithDiscovery, type WaveProgress } from '@/lib/cogniblend/waveConfig';
import type { ChallengeData } from '@/lib/cogniblend/curationTypes';
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
  executeWavesPass1: () => Promise<void>;
  executeWavesFull: () => Promise<void>;
  executeWavesPass2: () => Promise<void>;
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
  setContextLibraryOpen: (v: boolean) => void;
  setPass1DoneSession: (v: boolean) => void;
}

export function useCurationAIActions({
  challengeId, challenge, curationStore, optimisticIndustrySegId,
  isWaveRunning, aiReviews, buildContextOptions, executeWaves,
  executeWavesPass1, executeWavesFull, executeWavesPass2,
  saveSectionMutationRef, setPreFlightResult, setPreFlightDialogOpen,
  setAiReviewLoading, setTriageTotalCount, setBudgetShortfall,
  setAiQuality, setAiQualityLoading, setAiReviews,
  setAiSuggestedComplexity, setHighlightWarnings, setContextLibraryOpen,
  setPass1DoneSession,
}: UseCurationAIActionsOptions) {

  const queryClient = useQueryClient();

  // Shared pre-flight logic extracted for reuse
  const runPreFlight = useCallback((): ReturnType<typeof preFlightCheck> | null => {
    if (!challengeId || !challenge) return null;
    if (isWaveRunning) return null;

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

    // Seed Creator-filled fields from DB if not already in store
    const creatorFields = [
      'problem_statement', 'scope', 'maturity_level', 'domain_tags',
      'deliverables', 'evaluation_criteria', 'reward_structure',
      'phase_schedule', 'ip_model', 'expected_outcomes',
      'submission_guidelines', 'description', 'eligibility', 'visibility',
    ];
    for (const field of creatorFields) {
      if (!sectionContents[field] && (challenge as Record<string, unknown>)?.[field] != null) {
        const v = (challenge as Record<string, unknown>)[field];
        sectionContents[field] = typeof v === 'string' ? v : JSON.stringify(v);
      }
    }

    const industrySegId = optimisticIndustrySegId ?? resolveIndustrySegmentId(challenge as unknown as ChallengeData);
    if (!industrySegId) sectionContents['industry_segment'] = null;

    const pfResult = preFlightCheck(sectionContents, challenge.operating_model as string | null);

    if (!industrySegId) {
      pfResult.missingMandatory.push({
        sectionId: 'context_and_background' as any,
        sectionName: 'Industry Segment',
        reason: 'Industry segment must be set in Context & Background before AI review.',
      });
      pfResult.canProceed = false;
    }

    return pfResult;
  }, [challengeId, challenge, isWaveRunning, curationStore, optimisticIndustrySegId]);

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
    const pfResult = runPreFlight();
    if (!pfResult) return;
    setPreFlightResult(pfResult);
    if (!pfResult.canProceed || pfResult.warnings.length > 0) {
      setPreFlightDialogOpen(true);
      return;
    }
    await executeWavesWithBudgetCheck();
  }, [runPreFlight, executeWavesWithBudgetCheck, setPreFlightResult, setPreFlightDialogOpen]);

  // ── Step 1: Analyse Challenge (Pass 1 only) ──
  const handleAnalyse = useCallback(async () => {
    const pfResult = runPreFlight();
    if (!pfResult) return;
    setPreFlightResult(pfResult);
    if (!pfResult.canProceed || pfResult.warnings.length > 0) {
      setPreFlightDialogOpen(true);
      return;
    }
    setAiReviewLoading(true);
    setTriageTotalCount(0);
    try {
      // Run Pass 1 analysis first
      await executeWavesPass1();

      // AFTER Pass 1 completes, run discovery sequentially
      try {
        await supabase.functions.invoke('discover-context-resources', {
          body: { challenge_id: challengeId },
        });
        queryClient.invalidateQueries({ queryKey: ['context-sources', challengeId] });
        queryClient.invalidateQueries({ queryKey: ['context-source-count', challengeId] });
        queryClient.invalidateQueries({ queryKey: ['context-pending-count', challengeId] });
      } catch {
        // Discovery failure is non-blocking
      }

      setTriageTotalCount(24);
      setPass1DoneSession(true);
      toast.success('Analysis complete. Review discovered sources in the Context Library, then Generate Suggestions.');
      // Auto-open Context Library so curator can review/accept discovered sources
      setContextLibraryOpen(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      toast.error(`Analysis failed: ${msg}`);
    } finally {
      setAiReviewLoading(false);
    }
  }, [runPreFlight, executeWavesPass1, setPreFlightResult, setPreFlightDialogOpen, setAiReviewLoading, setTriageTotalCount, challengeId, queryClient, setPass1DoneSession, setContextLibraryOpen]);

  // ── Step 2: Generate Suggestions (full Pass 1 + Pass 2) ──
  const handleGenerateSuggestions = useCallback(async () => {
    setAiReviewLoading(true);
    setTriageTotalCount(0);
    try {
      // Regenerate digest so Pass 2 has enriched context from accepted sources
      await supabase.functions.invoke('generate-context-digest', {
        body: { challenge_id: challengeId },
      });
      // Run Pass 2 only — reuses stored Pass 1 comments, skips re-analysis
      await executeWavesPass2();
      const ctx = buildChallengeContext(buildContextOptions());
      const shortfall = detectBudgetShortfall(ctx);
      setBudgetShortfall(shortfall);
      setTriageTotalCount(24);
      setPass1DoneSession(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      toast.error(`Generation failed: ${msg}`);
    } finally {
      setAiReviewLoading(false);
    }
  }, [executeWavesPass2, buildContextOptions, setAiReviewLoading, setTriageTotalCount, setBudgetShortfall, challengeId, setPass1DoneSession]);

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
    handleAnalyse,
    handleGenerateSuggestions,
    handleAIQualityAnalysis,
    handleSingleSectionReview,
    ...complexity,
  };
}
