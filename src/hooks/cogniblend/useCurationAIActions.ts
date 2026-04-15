/**
 * useCurationAIActions — AI review, quality analysis, and wave execution callbacks.
 * Restored to wave-based architecture for maximum quality per section.
 * Pass 1: Wave executor with pass1Only=true (comments only).
 * Pass 2: Wave executor with skipAnalysis=true (suggestions using Pass 1 comments).
 */

import { useCallback, type Dispatch, type SetStateAction } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logWarning } from '@/lib/errorHandler';
import { preFlightCheck } from '@/lib/cogniblend/preFlightCheck';
import { buildChallengeContext, type BuildChallengeContextOptions } from '@/lib/cogniblend/challengeContextAssembler';
import { detectBudgetShortfall, type BudgetShortfallResult } from '@/lib/cogniblend/budgetShortfallDetection';
import { EXTENDED_BRIEF_FIELD_MAP } from '@/lib/cogniblend/curationSectionFormats';
import { resolveIndustrySegmentId, parseJson } from '@/lib/cogniblend/curationHelpers';
import { validateMasterDataInReviews } from '@/lib/cogniblend/masterDataValidator';
import type { ChallengeData } from '@/lib/cogniblend/curationTypes';
import { parseJson as jsonParse } from '@/lib/cogniblend/jsonbUnwrap';
import { normalizeSectionReview } from '@/lib/cogniblend/normalizeSectionReview';
import type { SectionReview } from '@/components/cogniblend/curation/CurationAIReviewPanel';
import type { AIQualitySummary } from '@/lib/cogniblend/curationTypes';
import type { Json } from '@/integrations/supabase/types';
import type { WaveProgress } from '@/lib/cogniblend/waveConfig';
import { useCurationComplexityActions } from './useCurationComplexityActions';

interface UseCurationAIActionsOptions {
  challengeId: string | undefined;
  challenge: Record<string, unknown> | null;
  curationStore: ReturnType<typeof import('@/store/curationFormStore').getCurationFormStore> | null;
  optimisticIndustrySegId: string | null;
  isWaveRunning: boolean;
  aiReviews: SectionReview[];
  buildContextOptions: () => BuildChallengeContextOptions;
  pass1SetWaveProgress: Dispatch<SetStateAction<WaveProgress>>;
  executeWavesPass1: () => Promise<void>;
  executeWavesPass2: () => Promise<void>;
  saveSectionMutationRef: React.RefObject<ReturnType<typeof import('@tanstack/react-query').useMutation>>;
  setPreFlightResult: (v: unknown) => void;
  setPreFlightDialogOpen: (v: boolean) => void;
  setAiReviewLoading: (v: boolean) => void;
  setTriageTotalCount: (v: number) => void;
  setBudgetShortfall: (v: BudgetShortfallResult | null) => void;
  setAiQuality: (v: AIQualitySummary) => void;
  setAiQualityLoading: (v: boolean) => void;
  setAiReviews: React.Dispatch<React.SetStateAction<SectionReview[]>>;
  setAiSuggestedComplexity: (v: unknown) => void;
  setHighlightWarnings: (v: boolean) => void;
  setContextLibraryOpen: (v: boolean) => void;
  setPass1DoneSession: (v: boolean) => void;
  setGenerateDoneSession: (v: boolean) => void;
  setContextLibraryReviewed?: (v: boolean) => void;
}

export function useCurationAIActions({
  challengeId, challenge, curationStore, optimisticIndustrySegId,
  isWaveRunning, aiReviews, buildContextOptions,
  pass1SetWaveProgress,
  executeWavesPass1, executeWavesPass2,
  saveSectionMutationRef, setPreFlightResult, setPreFlightDialogOpen,
  setAiReviewLoading, setTriageTotalCount, setBudgetShortfall,
  setAiQuality, setAiQualityLoading, setAiReviews,
  setAiSuggestedComplexity, setHighlightWarnings, setContextLibraryOpen,
  setPass1DoneSession,
  setGenerateDoneSession,
  setContextLibraryReviewed,
}: UseCurationAIActionsOptions) {

  const queryClient = useQueryClient();

  // ── Shared pre-flight logic ──
  const runPreFlight = useCallback((): ReturnType<typeof preFlightCheck> | null => {
    if (!challengeId || !challenge) return null;
    if (isWaveRunning) return null;

    const sectionContents: Record<string, string | null> = {};
    if (curationStore) {
      const state = curationStore.getState();
      for (const [key, entry] of Object.entries(state.sections)) {
        if (entry?.data != null) {
          const d = entry.data;
          sectionContents[key] = typeof d === 'string' ? d : JSON.stringify(d);
        } else {
          sectionContents[key] = (challenge as Record<string, unknown>)?.[key] as string ?? null;
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
        sectionId: 'context_and_background' as unknown as import('@/types/sections').SectionKey,
        sectionName: 'Industry Segment',
        reason: 'Industry segment must be set in Context & Background before AI review.',
      });
      pfResult.canProceed = false;
    }

    return pfResult;
  }, [challengeId, challenge, isWaveRunning, curationStore, optimisticIndustrySegId]);

  // ── runAnalyseFlow: Wave-based Pass 1 → Discovery → Extraction ──
  const runAnalyseFlow = useCallback(async () => {
    setPass1DoneSession(false);
    setGenerateDoneSession(false);
    setAiReviews([]);
    setContextLibraryReviewed?.(false);
    if (challengeId) sessionStorage.removeItem(`ctx_reviewed_${challengeId}`);
    queryClient.invalidateQueries({ queryKey: ['context-digest', challengeId] });
    queryClient.invalidateQueries({ queryKey: ['context-sources', challengeId] });
    queryClient.invalidateQueries({ queryKey: ['context-source-count', challengeId] });
    queryClient.invalidateQueries({ queryKey: ['context-pending-count', challengeId] });

    setAiReviewLoading(true);
    setTriageTotalCount(0);
    curationStore?.getState().clearAllSuggestions();

    try {
      // ── Pass 1: Wave-based analysis (comments only) ──
      await executeWavesPass1();

      // ── Discovery: discover-context-resources ──
      let autoAcceptedCount = 0;
      try {
        const { data: discoverResult, error: discoverError } = await supabase.functions.invoke('discover-context-resources', {
          body: { challenge_id: challengeId },
        });
        if (discoverError || !discoverResult?.success) {
          const reason = discoverResult?.reason ?? discoverResult?.error?.message ?? discoverError?.message ?? 'Unknown';
          toast.warning(`Discovery: ${reason}. Add sources manually.`, { duration: 6000 });
        } else {
          autoAcceptedCount = discoverResult?.auto_accepted ?? 0;
          const totalCount = discoverResult?.count ?? 0;
          const discarded = discoverResult?.discarded ?? 0;
          if (totalCount === 0) {
            toast.info(`No sources found${discarded > 0 ? ` (${discarded} inaccessible discarded)` : ''}. Add sources manually.`, { duration: 6000 });
          } else {
            toast.success(`Discovered ${totalCount} sources${autoAcceptedCount > 0 ? ` (${autoAcceptedCount} auto-accepted & extracted)` : ''}${discarded > 0 ? `, ${discarded} inaccessible discarded` : ''}`);
          }
        }
        queryClient.invalidateQueries({ queryKey: ['context-sources', challengeId] });
        queryClient.invalidateQueries({ queryKey: ['context-source-count', challengeId] });
        queryClient.invalidateQueries({ queryKey: ['context-pending-count', challengeId] });
      } catch (discErr: unknown) {
        const msg = discErr instanceof Error ? discErr.message : 'Network error';
        toast.warning(`Discovery failed: ${msg}. Add sources manually.`, { duration: 6000 });
      }

      setPass1DoneSession(true);
      toast.success('Analysis complete. Review sources in Context Library, then Generate Suggestions.');
      setContextLibraryOpen(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      toast.error(`Analysis failed: ${msg}`);
    } finally {
      setAiReviewLoading(false);
    }
  }, [executeWavesPass1, setAiReviewLoading, setTriageTotalCount, challengeId, queryClient, setPass1DoneSession, setContextLibraryOpen, setGenerateDoneSession, setAiReviews, setContextLibraryReviewed, curationStore]);

  // ── handleAnalyse: Pre-flight → runAnalyseFlow ──
  const handleAnalyse = useCallback(async () => {
    const pfResult = runPreFlight();
    if (!pfResult) return;
    setPreFlightResult(pfResult);
    if (!pfResult.canProceed || pfResult.warnings.length > 0) {
      setPreFlightDialogOpen(true);
      return;
    }
    await runAnalyseFlow();
  }, [runPreFlight, runAnalyseFlow, setPreFlightResult, setPreFlightDialogOpen]);

  const handleAIReview = useCallback(async () => {
    await handleAnalyse();
  }, [handleAnalyse]);

  // ── handleGenerateSuggestions: Context Digest → Wave-based Pass 2 ──
  const handleGenerateSuggestions = useCallback(async () => {
    setAiReviewLoading(true);
    setTriageTotalCount(0);

    try {
      // Stage 1: Generate context digest
      let digestAvailable = false;
      try {
        const { data: digestResult, error: digestError } = await supabase.functions.invoke('generate-context-digest', {
          body: { challenge_id: challengeId },
        });
        digestAvailable = !digestError && digestResult?.success;
        if (digestAvailable) {
          toast.info('Context digest generated — grounding suggestions.');
        }
      } catch { /* non-blocking */ }

      // Stage 2: Wave-based Pass 2 (suggestions using Pass 1 comments)
      await executeWavesPass2();

      // Stage 3: Post-processing
      const ctx = buildChallengeContext(buildContextOptions());
      const shortfall = detectBudgetShortfall(ctx);
      setBudgetShortfall(shortfall);
      setGenerateDoneSession(true);

      toast.success('Suggestions generated for all sections.');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      toast.error(`Generation failed: ${msg}`);
    } finally {
      setAiReviewLoading(false);
    }
  }, [buildContextOptions, setAiReviewLoading, setTriageTotalCount, setBudgetShortfall, challengeId, setGenerateDoneSession, executeWavesPass2]);

  const handleAIQualityAnalysis = useCallback(async () => {
    if (!challengeId) return;
    setAiQualityLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-challenge-quality", {
        body: { challenge_id: challengeId },
      });
      if (error) {
        let msg = error.message;
        try { msg = (error as Record<string, Record<string, () => Promise<Record<string, string>>>>)?.context?.json?.()?.then?.((b: Record<string, string>) => b?.error?.message) as unknown as string ?? msg; } catch { /* ignore */ }
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
    } catch (e: unknown) {
      const msg = e instanceof Error ? (e as Error).message : 'Unknown error';
      toast.error(`AI analysis failed: ${msg}`);
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

  const complexity = useCurationComplexityActions({
    challengeId, aiReviews, setAiReviews,
    setAiSuggestedComplexity, setHighlightWarnings, saveSectionMutationRef,
  });

  return {
    handleAIReview,
    handleAnalyse,
    runAnalyseFlow,
    handleGenerateSuggestions,
    handleAIQualityAnalysis,
    handleSingleSectionReview,
    ...complexity,
  };
}
