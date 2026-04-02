/**
 * useWaveExecutor — Core wave-based AI review execution engine.
 *
 * Processes 6 dependency-ordered waves sequentially.
 * Each wave calls the existing edge function per section.
 * Updates running context between waves so downstream waves
 * benefit from newly generated/reviewed content.
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getCurationFormStore, selectStaleSections } from '@/store/curationFormStore';
import { normalizeSectionReview } from '@/lib/cogniblend/normalizeSectionReview';
import { parseSuggestionForSection } from '@/lib/cogniblend/parseSuggestion';
import { validateAIOutput } from '@/lib/cogniblend/postLlmValidation';
import { buildChallengeContext } from '@/lib/cogniblend/challengeContextAssembler';
import type { ChallengeContext, BuildChallengeContextOptions } from '@/lib/cogniblend/challengeContextAssembler';
import type { SectionKey } from '@/types/sections';
import type { SectionReview } from '@/components/cogniblend/curation/CurationAIReviewPanel';
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
  /** Function to rebuild the challenge context (from page-level data) */
  buildContextOptions: () => BuildChallengeContextOptions;
  /** Callback to update the page-level AI reviews state */
  onSectionReviewed: (sectionKey: string, review: SectionReview) => void;
  /** Callback when complexity suggestion arrives */
  onComplexitySuggestion?: (suggestion: Record<string, any>) => void;
  /** Optional progress callbacks for curation progress tracking */
  onProgress?: WaveProgressCallbacks;
}

interface UseWaveExecutorReturn {
  /** Execute all 6 waves sequentially */
  executeWaves: () => Promise<void>;
  /** Re-review only stale sections in wave order */
  reReviewStale: () => Promise<void>;
  /** Cancel after current wave completes */
  cancelReview: () => void;
  /** Current wave progress state */
  waveProgress: WaveProgress;
  /** Whether any wave is currently running */
  isRunning: boolean;
}

export function useWaveExecutor({
  challengeId,
  buildContextOptions,
  onSectionReviewed,
  onComplexitySuggestion,
}: UseWaveExecutorOptions): UseWaveExecutorReturn {
  const [waveProgress, setWaveProgress] = useState<WaveProgress>(createInitialWaveProgress);
  const cancelRef = useRef(false);
  const inFlightRef = useRef(false);

  const reviewSingleSection = useCallback(async (
    sectionKey: SectionKey,
    action: SectionAction,
    context: ChallengeContext,
  ): Promise<'success' | 'error' | 'skipped'> => {
    if (action === 'skip') return 'skipped';

    const store = getCurationFormStore(challengeId);
    store.getState().setReviewStatus(sectionKey, 'pending');

    try {
      const currentContent = context.sections[sectionKey] ?? null;
      const { data, error } = await supabase.functions.invoke('review-challenge-sections', {
        body: {
          challenge_id: challengeId,
          section_key: sectionKey,
          role_context: 'curation',
          current_content: currentContent,
          context,
          wave_action: action, // Tell edge function whether to generate or review
        },
      });

      if (error) throw new Error(error.message);

      if (data?.success && data.data?.sections) {
        const reviewResult = (data.data.sections as SectionReview[])[0];
        if (reviewResult) {
          const normalized = normalizeSectionReview(reviewResult);

          // Extract complexity suggestion if applicable
          if (sectionKey === 'complexity') {
            const rawSection = (data.data.sections as any[])[0];
            if (rawSection?.suggested_complexity && onComplexitySuggestion) {
              onComplexitySuggestion({ ...rawSection.suggested_complexity });
            }
          }

          // Parse suggestion into native format before storing
          const rawSuggestion = (normalized as any).suggestion ?? null;
          const parsedSuggestion = rawSuggestion && typeof rawSuggestion === 'string'
            ? parseSuggestionForSection(sectionKey, rawSuggestion)
            : rawSuggestion;

          store.getState().setAiReview(
            sectionKey,
            normalized.comments ?? [],
            parsedSuggestion,
          );
          store.getState().clearStaleness(sectionKey);

          // AI suggestions are stored in review state (setAiReview above).
          // We do NOT write to setSectionData — that requires explicit Accept action.
          // Writing here would corrupt table sections if AI returns prose.
          //
          // EXCEPTION: For GENERATED sections (empty → AI created content), write to section data
          // so downstream waves can reference it. Safe: no human content to corrupt.
          if ((normalized as any).status === 'generated' && parsedSuggestion != null) {
            store.getState().setSectionData(sectionKey, parsedSuggestion);
          }

          // Post-LLM validation
          if (context.todaysDate) {
            const validationResult = validateAIOutput(
              sectionKey,
              (normalized as any).suggestion ?? normalized,
              context,
            );
            store.getState().setValidationResult(sectionKey, validationResult);
          }

          onSectionReviewed(sectionKey, { ...normalized, addressed: false });
          return 'success';
        }
      } else if (data?.success && data.data) {
        store.getState().setAiReview(
          sectionKey,
          data.data.comments ?? [],
          data.data.suggestion ?? data.data,
        );
        store.getState().clearStaleness(sectionKey);

        if (context.todaysDate) {
          const validationResult = validateAIOutput(
            sectionKey,
            data.data.suggestion ?? data.data,
            context,
          );
          store.getState().setValidationResult(sectionKey, validationResult);
        }

        onSectionReviewed(sectionKey, {
          section_key: sectionKey,
          status: 'warning',
          comments: data.data.comments ?? [],
          addressed: false,
        } as SectionReview);
        return 'success';
      }

      throw new Error('Unexpected response shape');
    } catch (err: any) {
      store.getState().setReviewStatus(sectionKey, 'error');
      return 'error';
    }
  }, [challengeId, onSectionReviewed, onComplexitySuggestion]);

  const executeWaves = useCallback(async () => {
    if (inFlightRef.current) {
      toast.warning('A review is already in progress.');
      return;
    }
    inFlightRef.current = true;
    cancelRef.current = false;

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

      // Mark wave as running
      setWaveProgress((prev) => ({
        ...prev,
        currentWave: wave.waveNumber,
        waves: prev.waves.map((w) =>
          w.waveNumber === wave.waveNumber ? { ...w, status: 'running' } : w
        ),
      }));

      // Determine actions for each section in this wave
      const sectionActions = wave.sectionIds.map((id) => ({
        sectionId: id,
        action: determineSectionAction(id, context.sections[id]),
      }));

      // Process all sections in this wave
      const sectionResults: WaveResult['sections'] = [];
      for (const sa of sectionActions) {
        // Record the AI action type in the store
        const store = getCurationFormStore(challengeId);
        store.getState().setAiAction(sa.sectionId, sa.action);

        const result = await reviewSingleSection(sa.sectionId, sa.action, context);
        sectionResults.push({
          sectionId: sa.sectionId,
          action: sa.action,
          status: result,
        });
      }

      // Update wave result
      const waveStatus = sectionResults.some((s) => s.status === 'error') ? 'error' : 'completed';
      setWaveProgress((prev) => ({
        ...prev,
        waves: prev.waves.map((w) =>
          w.waveNumber === wave.waveNumber
            ? { ...w, status: waveStatus, sections: sectionResults }
            : w
        ),
      }));

      // Refresh context for next wave — re-read store sections
      context = buildChallengeContext(buildContextOptions());

      // Rate-limit pause between waves
      if (i < EXECUTION_WAVES.length - 1) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    // Mark overall completion
    if (!cancelRef.current) {
      setWaveProgress((prev) => ({ ...prev, overallStatus: 'completed' }));
      toast.success('All section reviews complete.');
    } else {
      toast.warning('AI review cancelled after completing current wave.');
    }

    inFlightRef.current = false;
  }, [challengeId, buildContextOptions, reviewSingleSection]);

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

    const staleIds = new Set(stale.map((s) => s.key));
    const affectedWaves = EXECUTION_WAVES.filter((w) =>
      w.sectionIds.some((id) => staleIds.has(id))
    );

    const initialProgress = createInitialWaveProgress();
    initialProgress.overallStatus = 'running';
    // Mark non-affected waves as completed/skipped
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

      // Non-stale sections in this wave are skipped
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
    inFlightRef.current = false;
  }, [challengeId, buildContextOptions, reviewSingleSection]);

  const cancelReview = useCallback(() => {
    cancelRef.current = true;
  }, []);

  return {
    executeWaves,
    reReviewStale,
    cancelReview,
    waveProgress,
    isRunning: waveProgress.overallStatus === 'running',
  };
}
