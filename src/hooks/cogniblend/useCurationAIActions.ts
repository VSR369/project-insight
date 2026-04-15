/**
 * useCurationAIActions — AI review, quality analysis, and wave execution callbacks.
 * Now uses unified analyse-challenge and generate-suggestions endpoints.
 * Keeps wave executors for single-section re-review only.
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
import { DISCOVERY_WAVE_NUMBER, createInitialWaveProgressWithDiscovery, type WaveProgress } from '@/lib/cogniblend/waveConfig';
import { validateMasterDataInReviews } from '@/lib/cogniblend/masterDataValidator';
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
  setContextLibraryReviewed?: (v: boolean) => void;
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
  setContextLibraryReviewed,
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

  // ── runAnalyseFlow: post-preflight analysis logic (reusable by PreFlightDialog) ──
  const runAnalyseFlow = useCallback(async () => {
    // ═══ RESET ALL STATE from previous analysis run ═══
    setPass1DoneSession(false);
    setGenerateDoneSession(false);
    setAiReviews([]);
    setContextLibraryReviewed?.(false);
    if (challengeId) {
      sessionStorage.removeItem(`ctx_reviewed_${challengeId}`);
    }
    queryClient.invalidateQueries({ queryKey: ['context-digest', challengeId] });
    queryClient.invalidateQueries({ queryKey: ['context-sources', challengeId] });
    queryClient.invalidateQueries({ queryKey: ['context-source-count', challengeId] });
    queryClient.invalidateQueries({ queryKey: ['context-pending-count', challengeId] });

    setAiReviewLoading(true);
    setTriageTotalCount(0);
    curationStore.getState().clearAllSuggestions();
    pass1SetWaveProgress(createInitialWaveProgressWithDiscovery());

    try {
      const { data: analyseResult, error: analyseError } = await supabase.functions.invoke('analyse-challenge', {
        body: { challenge_id: challengeId },
      });

      if (analyseError || !analyseResult?.success) {
        const msg = analyseResult?.error?.message ?? analyseError?.message ?? 'Unknown error';
        throw new Error(msg);
      }

      const rawReviews: SectionReview[] = (analyseResult.data?.reviews ?? []).map(normalizeSectionReview);
      const validation = validateMasterDataInReviews(rawReviews);
      if (!validation.isValid) {
        logWarning(`Master data validation stripped ${validation.issues.length} invalid value(s)`, { operation: 'analyse_challenge', component: 'useCurationAIActions' });
      }
      const validatedReviews = validation.correctedReviews;

      setAiReviews(validatedReviews);
      saveSectionMutationRef.current.mutate({ field: 'ai_section_reviews', value: validatedReviews });

      pass1SetWaveProgress((prev) => ({
        ...prev,
        currentWave: DISCOVERY_WAVE_NUMBER,
        overallStatus: 'running',
        waves: prev.waves.map((w) =>
          w.waveNumber === DISCOVERY_WAVE_NUMBER ? { ...w, status: 'running' } : w
        ),
      }));

      // Run context discovery with proper error surfacing
      let discoveryOk = true;
      try {
        const { data: discoverResult, error: discoverError } = await supabase.functions.invoke('discover-context-resources', {
          body: { challenge_id: challengeId },
        });

        if (discoverError) {
          discoveryOk = false;
          toast.warning(`Source discovery failed: ${discoverError.message}. Add sources manually in Context Library.`, { duration: 6000 });
        } else if (!discoverResult?.success) {
          discoveryOk = false;
          const reason = discoverResult?.reason ?? discoverResult?.error?.message ?? 'Unknown';
          toast.warning(`Discovery: ${reason}. You can add sources manually.`, { duration: 6000 });
        } else {
          const autoCount = discoverResult?.auto_accepted ?? 0;
          const totalCount = discoverResult?.count ?? 0;
          if (totalCount === 0) {
            toast.info('No sources discovered. You can add sources manually in Context Library.', { duration: 6000 });
          } else {
            toast.success(`Discovered ${totalCount} sources${autoCount > 0 ? ` (${autoCount} auto-accepted)` : ''}`);
          }
        }
        queryClient.invalidateQueries({ queryKey: ['context-sources', challengeId] });
        queryClient.invalidateQueries({ queryKey: ['context-source-count', challengeId] });
        queryClient.invalidateQueries({ queryKey: ['context-pending-count', challengeId] });
      } catch (discErr: unknown) {
        discoveryOk = false;
        const msg = discErr instanceof Error ? discErr.message : 'Network error';
        toast.warning(`Source discovery failed: ${msg}. You can add sources manually.`, { duration: 6000 });
      }

      pass1SetWaveProgress((prev) => ({
        ...prev,
        overallStatus: 'completed',
        waves: prev.waves.map((w) =>
          w.waveNumber === DISCOVERY_WAVE_NUMBER
            ? { ...w, status: discoveryOk ? 'completed' : 'error' }
            : w
        ),
      }));

      setTriageTotalCount(validatedReviews.length);
      setPass1DoneSession(true);
      toast.success('Analysis complete. Review discovered sources in the Context Library, then Generate Suggestions.');
      setContextLibraryOpen(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      toast.error(`Analysis failed: ${msg}`);
    } finally {
      setAiReviewLoading(false);
    }
  }, [pass1SetWaveProgress, setAiReviewLoading, setTriageTotalCount, challengeId, queryClient, setPass1DoneSession, setContextLibraryOpen, setGenerateDoneSession, setAiReviews, setContextLibraryReviewed, curationStore, saveSectionMutationRef]);

  // ── handleAIReview: redirects to handleAnalyse (kills old wave path) ──
  // ── Step 1: Analyse Challenge (Pass 1 only) ──
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

  // ── handleAIReview: redirects to handleAnalyse (kills old wave path) ──
  const handleAIReview = useCallback(async () => {
    await handleAnalyse();
  }, [handleAnalyse]);

  // ── Step 2: Generate Suggestions (Pass 2 — digest is OPTIONAL) ──
  const handleGenerateSuggestions = useCallback(async () => {
    setAiReviewLoading(true);
    setTriageTotalCount(0);
    try {
      // TRY digest but do NOT block on failure
      let digestAvailable = false;
      try {
        const { data: digestResult, error: digestError } = await supabase.functions.invoke('generate-context-digest', {
          body: { challenge_id: challengeId },
        });
        digestAvailable = !digestError && digestResult?.success;
        if (!digestAvailable) {
          toast.info('Context digest unavailable — generating suggestions from challenge content and industry intelligence.', { duration: 5000 });
        }
      } catch {
        toast.info('Context digest unavailable — proceeding with available context.', { duration: 5000 });
      }

      // ALWAYS proceed to generate-suggestions with current aiReviews from client state
      const { data: genResult, error: genError } = await supabase.functions.invoke('generate-suggestions', {
        body: { challenge_id: challengeId, pass1_reviews: aiReviews },
      });

      if (genError || !genResult?.success) {
        const msg = genResult?.error?.message ?? genError?.message ?? 'Unknown error';
        throw new Error(msg);
      }

      const suggestions: SectionReview[] = (genResult.data?.reviews ?? []).map(normalizeSectionReview);

      const validation = validateMasterDataInReviews(suggestions);
      if (!validation.isValid) {
        logWarning(`Master data validation stripped ${validation.issues.length} invalid value(s)`, { operation: 'generate_suggestions', component: 'useCurationAIActions' });
      }

      let mergedResult: SectionReview[] = [];
      setAiReviews((prev) => {
        const merged = [...prev];
        for (const s of validation.correctedReviews) {
          const idx = merged.findIndex((r) => r.section_key === s.section_key);
          if (idx >= 0) {
            merged[idx] = { ...merged[idx], ...s };
          } else {
            merged.push(s);
          }
        }
        mergedResult = merged;
        return merged;
      });

      saveSectionMutationRef.current.mutate({ field: 'ai_section_reviews', value: mergedResult });

      const ctx = buildChallengeContext(buildContextOptions());
      const shortfall = detectBudgetShortfall(ctx);
      setBudgetShortfall(shortfall);
      setTriageTotalCount(suggestions.length);
      setGenerateDoneSession(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      toast.error(`Generation failed: ${msg}`);
    } finally {
      setAiReviewLoading(false);
    }
  }, [buildContextOptions, setAiReviewLoading, setTriageTotalCount, setBudgetShortfall, challengeId, setGenerateDoneSession, setAiReviews, aiReviews, saveSectionMutationRef]);

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
    handleAIReview,
    handleAnalyse,
    runAnalyseFlow,
    handleGenerateSuggestions,
    handleAIQualityAnalysis,
    handleSingleSectionReview,
    ...complexity,
  };
}
