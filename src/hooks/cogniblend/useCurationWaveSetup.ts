/**
 * useCurationWaveSetup — Wave executor wiring + completeness checks
 * extracted from useCurationPageOrchestrator (Batch B).
 */

import { useCallback, useEffect, useRef } from 'react';
import { useUpdateCurationProgress } from '@/hooks/cogniblend/useCurationProgress';
import { useCompletenessCheckDefs, useRunCompletenessCheck } from '@/hooks/queries/useCompletenessChecks';
import { useWaveExecutor } from '@/hooks/useWaveExecutor';
import { normalizeSectionReview } from '@/lib/cogniblend/normalizeSectionReview';
import { buildChallengeContext, type BuildChallengeContextOptions } from '@/lib/cogniblend/challengeContextAssembler';
import { getCurationFormStore } from '@/store/curationFormStore';
import type { SectionKey } from '@/types/sections';
import type { SectionReview } from '@/components/cogniblend/curation/CurationAIReviewPanel';
import type { UseMutationResult } from '@tanstack/react-query';

interface UseCurationWaveSetupOptions {
  challengeId: string | undefined;
  challenge: Record<string, any> | null;
  aiReviews: SectionReview[];
  setAiReviews: React.Dispatch<React.SetStateAction<SectionReview[]>>;
  setAiSuggestedComplexity: (v: any) => void;
  saveSectionMutationRef: React.MutableRefObject<UseMutationResult<void, Error, { field: string; value: any }>>;
}

export function useCurationWaveSetup({
  challengeId,
  challenge,
  aiReviews,
  setAiReviews,
  setAiSuggestedComplexity,
  saveSectionMutationRef,
}: UseCurationWaveSetupOptions) {

  const buildContextOptions = useCallback((): BuildChallengeContextOptions => {
    const store = challengeId ? getCurationFormStore(challengeId) : null;
    const storeSections: BuildChallengeContextOptions['storeSections'] = {};
    if (store) {
      const state = store.getState();
      for (const [key, entry] of Object.entries(state.sections)) {
        if (entry) storeSections[key as SectionKey] = { data: entry.data };
      }
    }
    return {
      challengeId: challengeId!,
      challengeTitle: challenge?.title ?? '',
      solutionType: (challenge?.solution_type as any) ?? null,
      solutionTypes: Array.isArray(challenge?.solution_types) ? (challenge.solution_types as string[]) : [],
      seekerSegment: null,
      organizationTypeId: null,
      maturityLevelFromChallenge: challenge?.maturity_level ?? null,
      storeSections,
    };
  }, [challengeId, challenge?.title, challenge?.maturity_level]);

  const handleWaveSectionReviewed = useCallback((sectionKey: string, review: SectionReview) => {
    const normalized = normalizeSectionReview(review);
    setAiReviews((prev) => {
      const filtered = prev.filter((r) => r.section_key !== sectionKey);
      return [...filtered, { ...normalized, addressed: false }];
    });
    const currentReviews = aiReviews.filter((r) => r.section_key !== sectionKey);
    const merged = [...currentReviews, { ...normalized, addressed: false }];
    saveSectionMutationRef.current.mutate({ field: 'ai_section_reviews', value: merged });
  }, [aiReviews]);

  const updateProgress = useUpdateCurationProgress();
  const { executeWaves, reReviewStale, cancelReview, waveProgress, isRunning: isWaveRunning } = useWaveExecutor({
    challengeId: challengeId!,
    buildContextOptions,
    onSectionReviewed: handleWaveSectionReviewed,
    onComplexitySuggestion: (suggestion) => setAiSuggestedComplexity(suggestion),
    onProgress: {
      onWaveStart: (waveNum) => updateProgress.mutate({
        challengeId: challengeId!, status: 'ai_review', current_wave: waveNum,
        ...(waveNum === 1 ? { ai_review_started_at: new Date().toISOString() } : {}),
      }),
      onWaveComplete: (_waveNum, _count, total) => updateProgress.mutate({
        challengeId: challengeId!, sections_reviewed: total,
      }),
      onAllComplete: () => updateProgress.mutate({
        challengeId: challengeId!, status: 'curator_editing',
        ai_review_completed_at: new Date().toISOString(), sections_reviewed: 27,
      }),
    },
  });

  // ── Completeness checks ──
  const { data: completenessCheckDefs = [] } = useCompletenessCheckDefs();
  const { result: completenessResult, run: runCompletenessCheck, isRunning: completenessRunning } = useRunCompletenessCheck({
    challengeId: challengeId!,
    challengeData: challenge,
  });

  const prevWaveStatusRef = useRef<string | undefined>();
  const runCompletenessCheckRef = useRef(runCompletenessCheck);
  runCompletenessCheckRef.current = runCompletenessCheck;
  useEffect(() => {
    const currentStatus = waveProgress?.overallStatus;
    if (prevWaveStatusRef.current === 'running' && currentStatus === 'completed') {
      runCompletenessCheckRef.current();
    }
    prevWaveStatusRef.current = currentStatus;
  }, [waveProgress?.overallStatus]);

  return {
    buildContextOptions,
    executeWaves,
    reReviewStale,
    cancelReview,
    waveProgress,
    isWaveRunning,
    completenessCheckDefs,
    completenessResult,
    completenessRunning,
    runCompletenessCheck,
  };
}
