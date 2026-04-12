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
  executeWavesPass1: () => Promise<void>;
  executeWavesFull: () => Promise<void>;
  executeWavesPass2: () => Promise<void>;
  pass1SetWaveProgress: Dispatch<SetStateAction<WaveProgress>>;
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
  setGenerateDoneSession: (v: boolean) => void;
}

export function useCurationAIActions({
  challengeId, challenge, curationStore, optimisticIndustrySegId,
  isWaveRunning, aiReviews, buildContextOptions, executeWaves,
  executeWavesPass1, executeWavesFull, executeWavesPass2, pass1SetWaveProgress,
  saveSectionMutationRef, setPreFlightResult, setPreFlightDialogOpen,
  setAiReviewLoading, setTriageTotalCount, setBudgetShortfall,
  setAiQuality, setAiQualityLoading, setAiReviews,
  setAiSuggestedComplexity, setHighlightWarnings, setContextLibraryOpen,
  setPass1DoneSession,
  setGenerateDoneSession,
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

    // Override initial progress to include Wave 7 (discovery)
    pass1SetWaveProgress(createInitialWaveProgressWithDiscovery());

    try {
      // Run Pass 1 analysis (waves 1-6)
      await executeWavesPass1();

      // Transition Wave 7 to running
      pass1SetWaveProgress((prev) => ({
        ...prev,
        currentWave: DISCOVERY_WAVE_NUMBER,
        overallStatus: 'running',
        waves: prev.waves.map((w) =>
          w.waveNumber === DISCOVERY_WAVE_NUMBER ? { ...w, status: 'running' } : w
        ),
      }));

      // Run context discovery
      let discoveryOk = true;
      try {
        await supabase.functions.invoke('discover-context-resources', {
          body: { challenge_id: challengeId },
        });
        queryClient.invalidateQueries({ queryKey: ['context-sources', challengeId] });
        queryClient.invalidateQueries({ queryKey: ['context-source-count', challengeId] });
        queryClient.invalidateQueries({ queryKey: ['context-pending-count', challengeId] });
      } catch {
        discoveryOk = false;
      }

      // Mark Wave 7 complete/error
      pass1SetWaveProgress((prev) => ({
        ...prev,
        overallStatus: 'completed',
        waves: prev.waves.map((w) =>
          w.waveNumber === DISCOVERY_WAVE_NUMBER
            ? { ...w, status: discoveryOk ? 'completed' : 'error' }
            : w
        ),
      }));

      setTriageTotalCount(24);
      setPass1DoneSession(true);
      toast.success('Analysis complete. Review discovered sources in the Context Library, then Generate Suggestions.');
      setContextLibraryOpen(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      toast.error(`Analysis failed: ${msg}`);
    } finally {
      setAiReviewLoading(false);
    }
  }, [runPreFlight, executeWavesPass1, pass1SetWaveProgress, setPreFlightResult, setPreFlightDialogOpen, setAiReviewLoading, setTriageTotalCount, challengeId, queryClient, setPass1DoneSession, setContextLibraryOpen]);

  // ── Step 2: Generate Suggestions (full Pass 1 + Pass 2) ──
  const handleGenerateSuggestions = useCallback(async () => {
    setAiReviewLoading(true);
    setTriageTotalCount(0);
    try {
      // Regenerate digest so Pass 2 has enriched context from accepted sources
      const { data: digestResult, error: digestError } = await supabase.functions.invoke('generate-context-digest', {
        body: { challenge_id: challengeId },
      });

      if (digestError || !digestResult?.success) {
        const errorCode = digestResult?.error?.code ?? '';
        const errorMsg = digestResult?.error?.message ?? digestError?.message ?? '';

        if (errorCode === 'NO_SOURCES' || errorMsg.includes('No accepted sources')) {
          toast.error(
            'No accepted sources found. Open the Context Library, run "Re-discover Sources", accept at least one source, then try again.',
            { duration: 8000 }
          );
        } else if (errorCode === 'NO_EXTRACTABLE_CONTENT' || errorMsg.includes('none have sufficient text')) {
          toast.error(
            'Accepted sources have no extractable text. Try adding URLs or uploading documents with readable content in the Context Library.',
            { duration: 8000 }
          );
        } else {
          toast.error(`Digest generation failed: ${errorMsg || 'Unknown error'}`, { duration: 8000 });
        }
        setAiReviewLoading(false);
        return;
      }
      // Run Pass 2 only — reuses stored Pass 1 comments, skips re-analysis
      await executeWavesPass2();
      const ctx = buildChallengeContext(buildContextOptions());
      const shortfall = detectBudgetShortfall(ctx);
      setBudgetShortfall(shortfall);
      setTriageTotalCount(24);
      setGenerateDoneSession(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      toast.error(`Generation failed: ${msg}`);
    } finally {
      setAiReviewLoading(false);
    }
  }, [executeWavesPass2, buildContextOptions, setAiReviewLoading, setTriageTotalCount, setBudgetShortfall, challengeId, setGenerateDoneSession]);

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
    let mergedResult: SectionReview[] = [];
    setAiReviews((prev) => {
      const filtered = prev.filter((r) => r.section_key !== sectionKey);
      mergedResult = [...filtered, { ...normalized, addressed: false }];
      return mergedResult;
    });
    saveSectionMutationRef.current.mutate({ field: "ai_section_reviews", value: mergedResult });
  }, [setAiReviews, saveSectionMutationRef]);

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
