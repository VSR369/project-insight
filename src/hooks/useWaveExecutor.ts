/**
 * useWaveExecutor — Core wave-based AI review execution engine.
 *
 * Each wave fires ONE edge function call for all its sections. The QA wave
 * (QA_WAVE_NUMBER = 11) invokes the QA-only branch (consistency + ambiguity).
 * The Harmonization wave (HARMONIZE_WAVE_NUMBER = 12) runs Pass-2 only and
 * audits all suggestions for cross-section consistency before Accept All.
 * During Pass 2, QA is skipped (already executed in Pass 1; underlying data
 * unchanged). reReviewStale still uses per-section calls (unchanged).
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
  QA_WAVE_NUMBER,
  DISCOVERY_WAVE_NUMBER,
  HARMONIZE_WAVE_NUMBER,
  HARMONIZE_CLUSTER_SECTIONS,
  HARMONIZE_MIN_SUGGESTIONS,
  determineSectionAction,
  createInitialWaveProgress,
  createInitialWaveProgressWithDiscovery,
  createInitialWaveProgressForPass2,
  getWaveReasoning,
  type WaveProgress,
  type WaveResult,
  type SectionAction,
} from '@/lib/cogniblend/waveConfig';
import {
  createFreshRecord,
  updateWaveStart,
  updateWaveComplete,
  finalizeRecord,
  saveExecutionRecord,
  type ExecutionResult,
  type PassType,
  type WaveSectionResult,
} from '@/services/cogniblend/waveExecutionHistory';
import { invokeWaveBatch, invokeQaWave, invokeHarmonizationWave } from '@/services/cogniblend/waveBatchInvoker';
import type { SectionKey } from '@/types/sections';
import { supabase } from '@/integrations/supabase/client';
import { validateAIOutput } from '@/lib/cogniblend/postLlmValidation';
import { logWarning } from '@/lib/errorHandler';

async function supabaseUpsertProgress(
  challengeId: string,
  updates: { current_wave?: number; sections_reviewed?: number; sections_total?: number; status?: string },
): Promise<void> {
  try {
    await supabase
      .from('curation_progress' as never)
      .upsert({
        challenge_id: challengeId,
        ...updates,
        updated_at: new Date().toISOString(),
      } as never);
  } catch { /* non-blocking */ }
}

interface WaveProgressCallbacks {
  onWaveStart?: (waveNum: number) => void;
  onWaveComplete?: (waveNum: number, sectionsInWave: number, totalReviewed: number) => void;
  onAllComplete?: () => void;
}

interface UseWaveExecutorOptions {
  challengeId: string;
  buildContextOptions: () => BuildChallengeContextOptions;
  onSectionReviewed: (sectionKey: string, review: SectionReview) => void;
  onComplexitySuggestion?: (suggestion: Record<string, unknown>) => void;
  onProgress?: WaveProgressCallbacks;
  pass1Only?: boolean;
  skipAnalysis?: boolean;
  providedCommentsBySectionKey?: Record<string, unknown[]>;
}

interface UseWaveExecutorReturn {
  executeWaves: () => Promise<ExecutionResult>;
  reReviewStale: () => Promise<ExecutionResult>;
  cancelReview: () => void;
  waveProgress: WaveProgress;
  updateWaveProgress: React.Dispatch<React.SetStateAction<WaveProgress>>;
  isRunning: boolean;
}

const FAILED_RESULT: ExecutionResult = {
  outcome: 'error',
  lastCompletedWave: 0,
  totalWaves: EXECUTION_WAVES.length,
  errorMessage: 'Already running',
  failedSections: [],
};

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
  const initialProgressFactory = useCallback(
    () => {
      if (pass1Only) return createInitialWaveProgressWithDiscovery();
      if (skipAnalysis) return createInitialWaveProgressForPass2();
      return createInitialWaveProgress();
    },
    [pass1Only, skipAnalysis],
  );
  const [waveProgress, setWaveProgress] = useState<WaveProgress>(initialProgressFactory);
  const cancelRef = useRef(false);
  const inFlightRef = useRef(false);

  const passType: PassType = skipAnalysis ? 'generate' : (pass1Only ? 'analyse' : 'generate');

  // Kept for reReviewStale (per-section path, unchanged)
  const reviewSingleSection = useWaveReviewSection({
    challengeId,
    onSectionReviewed,
    onComplexitySuggestion,
    pass1Only,
    skipAnalysis,
    providedCommentsBySectionKey,
  });

  const executeWaves = useCallback(async (): Promise<ExecutionResult> => {
    if (inFlightRef.current) {
      toast.warning('A review is already in progress.');
      return FAILED_RESULT;
    }
    inFlightRef.current = true;
    cancelRef.current = false;

    // Reset section-store AI state for every section we're about to touch so the
    // diagnostics panel starts blank on every Re-analyse / Generate run instead
    // of leaking "reviewed"/"error" rows from the previous run.
    {
      const store = getCurationFormStore(challengeId);
      for (const wave of EXECUTION_WAVES) {
        for (const sectionId of wave.sectionIds) {
          store.getState().setAiReview(sectionId, [], null);
          store.getState().setReviewStatus(sectionId, 'idle');
          store.getState().setAiAction(sectionId, null);
        }
      }
    }

    let execRecord = createFreshRecord(
      challengeId,
      passType,
      EXECUTION_WAVES.map((w) => ({ waveNumber: w.waveNumber, name: w.name, sectionIds: w.sectionIds })),
    );
    saveExecutionRecord(execRecord);

    const failedSections: SectionKey[] = [];
    let lastCompletedWave = 0;

    try {
      const initialProgress = initialProgressFactory();
      initialProgress.overallStatus = 'running';
      setWaveProgress(initialProgress);

      let context = buildChallengeContext(buildContextOptions());
      const totalSectionsAllWaves = EXECUTION_WAVES.reduce((sum, w) => sum + w.sectionIds.length, 0);

      for (let i = 0; i < EXECUTION_WAVES.length; i++) {
        if (cancelRef.current) {
          setWaveProgress((prev) => ({
            ...prev,
            overallStatus: 'cancelled',
            waves: prev.waves.map((w, idx) => (idx >= i ? { ...w, status: 'cancelled' } : w)),
          }));
          execRecord = finalizeRecord(execRecord, 'cancelled');
          saveExecutionRecord(execRecord);
          toast.warning('AI review cancelled after completing current wave.');
          return { outcome: 'cancelled', lastCompletedWave, totalWaves: EXECUTION_WAVES.length, errorMessage: null, failedSections };
        }

        const wave = EXECUTION_WAVES[i];
        onProgress?.onWaveStart?.(i + 1);
        execRecord = updateWaveStart(execRecord, wave.waveNumber);
        saveExecutionRecord(execRecord);

        setWaveProgress((prev) => ({
          ...prev,
          currentWave: wave.waveNumber,
          waves: prev.waves.map((w) => (w.waveNumber === wave.waveNumber ? { ...w, status: 'running' } : w)),
        }));

        const sectionsDoneBeforeWave = EXECUTION_WAVES.slice(0, i).reduce(
          (sum, w) => sum + w.sectionIds.length, 0,
        );

        let sectionResults: WaveResult['sections'] = [];
        const historyResults: WaveSectionResult[] = [];

        if (wave.waveNumber === QA_WAVE_NUMBER) {
          // Wave 11 — QA-only call (consistency + ambiguity).
          // During Pass 2 (skipAnalysis=true), QA is intentionally skipped:
          // ai_section_reviews carries Pass 1 data which has not changed,
          // so re-running consistency/ambiguity would produce identical findings
          // at ~60s extra cost. Cross-section coherence for *suggestions* is
          // checked instead by the Harmonization wave (12) below.
          if (skipAnalysis) {
            execRecord = updateWaveComplete(execRecord, wave.waveNumber, [], undefined);
            saveExecutionRecord(execRecord);
            setWaveProgress((prev) => ({
              ...prev,
              waves: prev.waves.map((w) =>
                w.waveNumber === wave.waveNumber
                  ? { ...w, status: 'completed', sections: [] }
                  : w
              ),
            }));
            lastCompletedWave = wave.waveNumber;
            onProgress?.onWaveComplete?.(i + 1, 0, sectionsDoneBeforeWave);
          } else {
            const qaOutcome = await invokeQaWave(challengeId, context);
            sectionResults = [];
            const qaError = qaOutcome.status === 'success'
              ? undefined
              : (qaOutcome.errorMessage ?? 'Quality Assurance pass (consistency + ambiguity) failed. Re-run AI review or check edge function logs.');
            execRecord = updateWaveComplete(execRecord, wave.waveNumber, [], qaError);
            saveExecutionRecord(execRecord);
            setWaveProgress((prev) => ({
              ...prev,
              waves: prev.waves.map((w) =>
                w.waveNumber === wave.waveNumber
                  ? { ...w, status: qaOutcome.status === 'success' ? 'completed' : 'error', sections: [] }
                  : w
              ),
            }));
            lastCompletedWave = wave.waveNumber;
            onProgress?.onWaveComplete?.(i + 1, 0, sectionsDoneBeforeWave);
          }
        } else {
          // Standard wave — single batched call for all sections
          const sectionActions = wave.sectionIds.map((id) => ({
            sectionId: id,
            action: determineSectionAction(id, context.sections[id]),
          }));
          sectionActions.forEach((sa) => {
            const store = getCurationFormStore(challengeId);
            store.getState().setAiAction(sa.sectionId, sa.action);
          });

          const reasoningEffort = getWaveReasoning(wave.sectionIds);

          const outcomes = await invokeWaveBatch({
            challengeId,
            sectionActions,
            context,
            reasoningEffort,
            pass1Only,
            skipAnalysis,
            providedCommentsBySectionKey,
            onSectionReviewed,
            onComplexitySuggestion,
          });

          for (const o of outcomes) {
            const action = sectionActions.find((sa) => sa.sectionId === o.sectionId)?.action ?? 'review';
            sectionResults.push({ sectionId: o.sectionId, action, status: o.status });
            historyResults.push({
              sectionId: o.sectionId,
              action,
              status: o.status,
              errorCode: o.errorCode ?? null,
              errorMessage: o.errorMessage ?? null,
              skippedReason: o.skippedReason ?? null,
              isPass2Failure: o.isPass2Failure ?? false,
            });
            if (o.status === 'error') failedSections.push(o.sectionId);
          }

          const waveStatus = sectionResults.some((s) => s.status === 'error') ? 'error' : 'completed';
          setWaveProgress((prev) => ({
            ...prev,
            waves: prev.waves.map((w) =>
              w.waveNumber === wave.waveNumber ? { ...w, status: waveStatus, sections: sectionResults } : w
            ),
          }));

          execRecord = updateWaveComplete(execRecord, wave.waveNumber, historyResults);
          saveExecutionRecord(execRecord);
          lastCompletedWave = wave.waveNumber;

          const totalReviewedSoFar = sectionsDoneBeforeWave + sectionResults.length;
          onProgress?.onWaveComplete?.(i + 1, sectionResults.length, totalReviewedSoFar);
          void supabaseUpsertProgress(challengeId, {
            current_wave: wave.waveNumber,
            sections_reviewed: totalReviewedSoFar,
            sections_total: totalSectionsAllWaves,
            status: 'ai_review',
          });
        }

        context = buildChallengeContext(buildContextOptions());
        if (i < EXECUTION_WAVES.length - 1) await new Promise((r) => setTimeout(r, 300));
      }

      // ── Wave 12 — Suggestion Harmonization (Pass 2 only) ──
      // Runs ONCE after all per-section suggestions exist. Audits cluster
      // sections for cross-section consistency and applies validated corrections.
      if (skipAnalysis && !cancelRef.current) {
        const store = getCurationFormStore(challengeId);
        const sections = store.getState().sections;
        const suggestions: Record<string, unknown> = {};
        for (const key of HARMONIZE_CLUSTER_SECTIONS) {
          const entry = sections[key];
          if (entry?.aiSuggestion != null) suggestions[key] = entry.aiSuggestion;
        }
        const suggestionCount = Object.keys(suggestions).length;

        setWaveProgress((prev) => ({
          ...prev,
          currentWave: HARMONIZE_WAVE_NUMBER,
          waves: prev.waves.map((w) =>
            w.waveNumber === HARMONIZE_WAVE_NUMBER ? { ...w, status: 'running' } : w
          ),
        }));

        if (suggestionCount < HARMONIZE_MIN_SUGGESTIONS) {
          // Not enough cluster suggestions to harmonize — mark complete, no AI call.
          setWaveProgress((prev) => ({
            ...prev,
            waves: prev.waves.map((w) =>
              w.waveNumber === HARMONIZE_WAVE_NUMBER
                ? { ...w, status: 'completed', sections: [] }
                : w
            ),
          }));
          lastCompletedWave = HARMONIZE_WAVE_NUMBER;
        } else {
          const harmonizeOutcome = await invokeHarmonizationWave(challengeId, suggestions);
          let appliedCount = 0;
          let droppedCount = 0;

          if (harmonizeOutcome.status === 'success') {
            const ctx = buildChallengeContext(buildContextOptions());
            for (const correction of harmonizeOutcome.corrections) {
              const key = correction.section_key as SectionKey;
              if (!HARMONIZE_CLUSTER_SECTIONS.includes(key)) {
                droppedCount += 1;
                continue;
              }
              try {
                const validation = validateAIOutput(
                  key,
                  correction.corrected_suggestion as Record<string, unknown> | null,
                  ctx,
                );
                const hasErrors = validation.corrections.some((c) => c.severity === 'error');
                if (hasErrors) {
                  droppedCount += 1;
                  logWarning('Harmonization correction failed validation — dropped', {
                    operation: 'harmonize_suggestions',
                    additionalData: { sectionKey: key, reason: correction.reason },
                  });
                  continue;
                }
                const existing = sections[key];
                store.getState().setAiReview(
                  key,
                  existing?.aiComments ?? [],
                  correction.corrected_suggestion as Record<string, unknown> | string | string[] | null,
                );
                appliedCount += 1;
              } catch (e) {
                droppedCount += 1;
                logWarning('Harmonization correction threw during apply — dropped', {
                  operation: 'harmonize_suggestions',
                  additionalData: { sectionKey: key, error: e instanceof Error ? e.message : String(e) },
                });
              }
            }
          }

          const harmonizeStatus = harmonizeOutcome.status === 'error' ? 'error' : 'completed';
          setWaveProgress((prev) => ({
            ...prev,
            waves: prev.waves.map((w) =>
              w.waveNumber === HARMONIZE_WAVE_NUMBER
                ? { ...w, status: harmonizeStatus, sections: [] }
                : w
            ),
          }));
          lastCompletedWave = HARMONIZE_WAVE_NUMBER;

          if (harmonizeOutcome.status === 'success' && (appliedCount > 0 || droppedCount > 0)) {
            toast.success(`Harmonization: ${appliedCount} correction(s) applied${droppedCount ? `, ${droppedCount} dropped` : ''}.`);
          }
        }
      }

      setWaveProgress((prev) => ({ ...prev, overallStatus: 'completed' }));
      execRecord = finalizeRecord(execRecord, 'completed');
      saveExecutionRecord(execRecord);

      onProgress?.onAllComplete?.();
      toast.success('All section reviews complete.');

      return { outcome: 'completed', lastCompletedWave, totalWaves: EXECUTION_WAVES.length, errorMessage: null, failedSections };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setWaveProgress((prev) => ({ ...prev, overallStatus: 'error' }));
      execRecord = finalizeRecord(execRecord, 'error', message);
      saveExecutionRecord(execRecord);
      toast.error(`AI review failed: ${message}`);
      return { outcome: 'error', lastCompletedWave, totalWaves: EXECUTION_WAVES.length, errorMessage: message, failedSections };
    } finally {
      inFlightRef.current = false;
    }
  }, [
    challengeId, buildContextOptions, onProgress, passType,
    pass1Only, skipAnalysis, providedCommentsBySectionKey,
    onSectionReviewed, onComplexitySuggestion,
  ]);

  const reReviewStale = useCallback(async (): Promise<ExecutionResult> => {
    if (inFlightRef.current) {
      toast.warning('A review is already in progress.');
      return FAILED_RESULT;
    }

    const store = getCurationFormStore(challengeId);
    const stale = selectStaleSections(store.getState());
    if (stale.length === 0) {
      toast.info('No stale sections to re-review.');
      return { outcome: 'completed', lastCompletedWave: 0, totalWaves: 0, errorMessage: null, failedSections: [] };
    }

    inFlightRef.current = true;
    cancelRef.current = false;
    const failedSections: SectionKey[] = [];
    let lastCompletedWave = 0;

    try {
      const staleIds = new Set(stale.map((s) => s.key));
      const affectedWaves = EXECUTION_WAVES.filter((w) =>
        w.waveNumber !== QA_WAVE_NUMBER && w.sectionIds.some((id) => staleIds.has(id))
      );

      const initialProgress = createInitialWaveProgress();
      initialProgress.overallStatus = 'running';
      initialProgress.waves = initialProgress.waves.map((w) => {
        const isAffected = affectedWaves.some((aw) => aw.waveNumber === w.waveNumber);
        return isAffected
          ? w
          : { ...w, status: 'completed' as const, sections: w.sections.map((s) => ({ ...s, status: 'skipped' as const })) };
      });
      setWaveProgress(initialProgress);

      let context = buildChallengeContext(buildContextOptions());

      for (const wave of affectedWaves) {
        if (cancelRef.current) break;

        setWaveProgress((prev) => ({
          ...prev,
          currentWave: wave.waveNumber,
          waves: prev.waves.map((w) => (w.waveNumber === wave.waveNumber ? { ...w, status: 'running' } : w)),
        }));

        const sectionsInWave = wave.sectionIds.filter((id) => staleIds.has(id));
        const sectionResults: WaveResult['sections'] = [];

        for (const sectionId of sectionsInWave) {
          const result = await reviewSingleSection(sectionId, 'review', context);
          sectionResults.push({ sectionId, action: 'review', status: result });
          if (result === 'error') failedSections.push(sectionId);
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

        lastCompletedWave = wave.waveNumber;
        context = buildChallengeContext(buildContextOptions());
        await new Promise((r) => setTimeout(r, 500));
      }

      const outcome = cancelRef.current ? 'cancelled' : 'completed';
      setWaveProgress((prev) => ({ ...prev, overallStatus: outcome }));
      if (!cancelRef.current) toast.success(`Re-reviewed ${stale.length} stale section(s).`);
      return { outcome, lastCompletedWave, totalWaves: affectedWaves.length, errorMessage: null, failedSections };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setWaveProgress((prev) => ({ ...prev, overallStatus: 'error' }));
      toast.error(`Stale re-review failed: ${message}`);
      return { outcome: 'error', lastCompletedWave, totalWaves: EXECUTION_WAVES.length, errorMessage: message, failedSections };
    } finally {
      inFlightRef.current = false;
    }
  }, [challengeId, buildContextOptions, reviewSingleSection]);

  const cancelReview = useCallback(() => { cancelRef.current = true; }, []);

  return {
    executeWaves,
    reReviewStale,
    cancelReview,
    waveProgress,
    updateWaveProgress: setWaveProgress,
    isRunning: waveProgress.overallStatus === 'running',
  };
}
