/**
 * useWaveExecutor — Core wave-based AI review execution engine.
 *
 * Processes 6 dependency-ordered waves sequentially.
 * Each wave calls the existing edge function per section.
 * Updates running context between waves so downstream waves
 * benefit from newly generated/reviewed content.
 */

import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { getCurationFormStore, selectStaleSections } from '@/store/curationFormStore';
import { buildChallengeContext } from '@/lib/cogniblend/challengeContextAssembler';
import type { BuildChallengeContextOptions } from '@/lib/cogniblend/challengeContextAssembler';
import type { SectionReview } from '@/components/cogniblend/curation/CurationAIReviewPanel';
import { useWaveReviewSection } from '@/hooks/useWaveReviewSection';
import {
  EXECUTION_WAVES,
  determineSectionAction,
  createInitialWaveProgress,
  type WaveProgress,
  type WaveResult,
  type SectionAction,
} from '@/lib/cogniblend/waveConfig';

interface WaveProgressCallbacks {
  onWaveStart?: (waveNum: number) => void;
  onWaveComplete?: (waveNum: number, sectionsInWave: number, totalReviewed: number) => void;
  onAllComplete?: () => void;
}

interface UseWaveExecutorOptions {
  challengeId: string;
  buildContextOptions: () => BuildChallengeContextOptions;
  onSectionReviewed: (sectionKey: string, review: SectionReview) => void;
  onComplexitySuggestion?: (suggestion: Record<string, any>) => void;
  onProgress?: WaveProgressCallbacks;
  pass1Only?: boolean;
  skipAnalysis?: boolean;
  providedCommentsBySectionKey?: Record<string, unknown[]>;
}

interface UseWaveExecutorReturn {
  executeWaves: () => Promise<void>;
  reReviewStale: () => Promise<void>;
  cancelReview: () => void;
  waveProgress: WaveProgress;
  updateWaveProgress: React.Dispatch<React.SetStateAction<WaveProgress>>;
  isRunning: boolean;
}

export function useWaveExecutor({
  challengeId,
  buildContextOptions,
  onSectionReviewed,
  onComplexitySuggestion,
  onProgress,
  pass1Only = false,
  skipAnalysis = false,
  providedCommentsBySectionKey,
}: UseWaveExecutorOptions): UseWaveExecutorReturn {
  const [waveProgress, setWaveProgress] = useState<WaveProgress>(createInitialWaveProgress);
  const cancelRef = useRef(false);
  const inFlightRef = useRef(false);

  const reviewSingleSection = useWaveReviewSection({
    challengeId,
    onSectionReviewed,
    onComplexitySuggestion,
    pass1Only,
    skipAnalysis,
    providedCommentsBySectionKey,
  });

  const executeWaves = useCallback(async () => {
    if (inFlightRef.current) {
      toast.warning('A review is already in progress.');
      return;
    }
    inFlightRef.current = true;
    cancelRef.current = false;

    try {
      const initialProgress = createInitialWaveProgress();
      initialProgress.overallStatus = 'running';
      setWaveProgress(initialProgress);

      let context = buildChallengeContext(buildContextOptions());

      for (let i = 0; i < EXECUTION_WAVES.length; i++) {
        if (cancelRef.current) {
          setWaveProgress((prev) => ({
            ...prev,
            overallStatus: 'cancelled',
            waves: prev.waves.map((w, idx) =>
              idx >= i ? { ...w, status: 'cancelled' } : w
            ),
          }));
          break;
        }

        const wave = EXECUTION_WAVES[i];
        onProgress?.onWaveStart?.(i + 1);

        setWaveProgress((prev) => ({
          ...prev,
          currentWave: wave.waveNumber,
          waves: prev.waves.map((w) =>
            w.waveNumber === wave.waveNumber ? { ...w, status: 'running' } : w
          ),
        }));

        const sectionActions = wave.sectionIds.map((id) => ({
          sectionId: id,
          action: determineSectionAction(id, context.sections[id]),
        }));

        const sectionResults: WaveResult['sections'] = [];
        for (const sa of sectionActions) {
          const store = getCurationFormStore(challengeId);
          store.getState().setAiAction(sa.sectionId, sa.action);

          const result = await reviewSingleSection(sa.sectionId, sa.action, context);
          sectionResults.push({
            sectionId: sa.sectionId,
            action: sa.action,
            status: result,
          });
        }

        const waveStatus = sectionResults.some((s) => s.status === 'error') ? 'error' : 'completed';
        const totalReviewedSoFar = EXECUTION_WAVES.slice(0, i + 1).reduce((sum, w) => sum + w.sectionIds.length, 0);
        setWaveProgress((prev) => ({
          ...prev,
          waves: prev.waves.map((w) =>
            w.waveNumber === wave.waveNumber
              ? { ...w, status: waveStatus, sections: sectionResults }
              : w
          ),
        }));
        onProgress?.onWaveComplete?.(i + 1, sectionResults.length, totalReviewedSoFar);

        // Persist wave progress summary to localStorage for recovery
        try {
          const progressSummary = {
            waveNumber: wave.waveNumber,
            status: waveStatus,
            sectionsCompleted: totalReviewedSoFar,
            timestamp: new Date().toISOString(),
          };
          const storageKey = `wave-progress-${challengeId}`;
          const existing = JSON.parse(localStorage.getItem(storageKey) ?? '{"waves":[]}');
          existing.waves = [...(existing.waves ?? []).filter((w: { waveNumber: number }) => w.waveNumber !== wave.waveNumber), progressSummary];
          existing.overallStatus = 'running';
          localStorage.setItem(storageKey, JSON.stringify(existing));
        } catch { /* localStorage unavailable */ }

        context = buildChallengeContext(buildContextOptions());

        if (i < EXECUTION_WAVES.length - 1) {
          await new Promise((r) => setTimeout(r, 500));
        }
      }

      if (!cancelRef.current) {
        setWaveProgress((prev) => ({ ...prev, overallStatus: 'completed' }));
        onProgress?.onAllComplete?.();
        toast.success('All section reviews complete.');
      } else {
        toast.warning('AI review cancelled after completing current wave.');
      }

      // Persist final status to localStorage
      try {
        const storageKey = `wave-progress-${challengeId}`;
        const existing = JSON.parse(localStorage.getItem(storageKey) ?? '{"waves":[]}');
        existing.overallStatus = cancelRef.current ? 'cancelled' : 'completed';
        existing.completedAt = new Date().toISOString();
        localStorage.setItem(storageKey, JSON.stringify(existing));
      } catch { /* localStorage unavailable */ }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setWaveProgress((prev) => ({ ...prev, overallStatus: 'error' }));
      toast.error(`AI review failed: ${message}`);
    } finally {
      inFlightRef.current = false;
    }
  }, [challengeId, buildContextOptions, reviewSingleSection, onProgress]);

  const reReviewStale = useCallback(async () => {
    if (inFlightRef.current) {
      toast.warning('A review is already in progress.');
      return;
    }

    const store = getCurationFormStore(challengeId);
    const stale = selectStaleSections(store.getState());
    if (stale.length === 0) {
      toast.info('No stale sections to re-review.');
      return;
    }

    inFlightRef.current = true;
    cancelRef.current = false;

    try {
      const staleIds = new Set(stale.map((s) => s.key));
      const affectedWaves = EXECUTION_WAVES.filter((w) =>
        w.sectionIds.some((id) => staleIds.has(id))
      );

      const initialProgress = createInitialWaveProgress();
      initialProgress.overallStatus = 'running';
      initialProgress.waves = initialProgress.waves.map((w) => {
        const isAffected = affectedWaves.some((aw) => aw.waveNumber === w.waveNumber);
        return isAffected ? w : { ...w, status: 'completed' as const, sections: w.sections.map((s) => ({ ...s, status: 'skipped' as const })) };
      });
      setWaveProgress(initialProgress);

      let context = buildChallengeContext(buildContextOptions());

      for (const wave of affectedWaves) {
        if (cancelRef.current) break;

        setWaveProgress((prev) => ({
          ...prev,
          currentWave: wave.waveNumber,
          waves: prev.waves.map((w) =>
            w.waveNumber === wave.waveNumber ? { ...w, status: 'running' } : w
          ),
        }));

        const sectionsInWave = wave.sectionIds.filter((id) => staleIds.has(id));
        const sectionResults: WaveResult['sections'] = [];

        for (const sectionId of sectionsInWave) {
          const result = await reviewSingleSection(sectionId, 'review', context);
          sectionResults.push({ sectionId, action: 'review', status: result });
        }

        const skippedSections = wave.sectionIds
          .filter((id) => !staleIds.has(id))
          .map((id) => ({ sectionId: id, action: 'skip' as SectionAction, status: 'skipped' as const }));

        setWaveProgress((prev) => ({
          ...prev,
          waves: prev.waves.map((w) =>
            w.waveNumber === wave.waveNumber
              ? { ...w, status: 'completed', sections: [...sectionResults, ...skippedSections] }
              : w
          ),
        }));

        context = buildChallengeContext(buildContextOptions());
        await new Promise((r) => setTimeout(r, 500));
      }

      setWaveProgress((prev) => ({ ...prev, overallStatus: cancelRef.current ? 'cancelled' : 'completed' }));
      if (!cancelRef.current) {
        toast.success(`Re-reviewed ${stale.length} stale section(s).`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setWaveProgress((prev) => ({ ...prev, overallStatus: 'error' }));
      toast.error(`Stale re-review failed: ${message}`);
    } finally {
      inFlightRef.current = false;
    }
  }, [challengeId, buildContextOptions, reviewSingleSection]);

  const cancelReview = useCallback(() => {
    cancelRef.current = true;
  }, []);

  return {
    executeWaves,
    reReviewStale,
    cancelReview,
    waveProgress,
    updateWaveProgress: setWaveProgress,
    isRunning: waveProgress.overallStatus === 'running',
  };
}
