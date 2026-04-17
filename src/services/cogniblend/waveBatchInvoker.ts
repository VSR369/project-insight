/**
 * waveBatchInvoker — Invokes the review-challenge-sections edge function once
 * per wave with the wave's section_keys array, then dispatches per-section
 * results to the existing per-section pipeline (autosave + parsing + validation).
 *
 * This is the speed/cost win: 6 waves × ~5 sections used to be 30 HTTP calls;
 * batched it is 6 HTTP calls. Quality preserved — every section still gets
 * its own format/quality criteria via the edge function's per-section config.
 */

import { supabase } from '@/integrations/supabase/client';
import { getCurationFormStore } from '@/store/curationFormStore';
import { normalizeSectionReview } from '@/lib/cogniblend/normalizeSectionReview';
import { parseSuggestionForSection } from '@/lib/cogniblend/parseSuggestion';
import { validateAIOutput } from '@/lib/cogniblend/postLlmValidation';
import type { ChallengeContext } from '@/lib/cogniblend/challengeContextAssembler';
import type { SectionKey } from '@/types/sections';
import type { SectionReview } from '@/components/cogniblend/curation/CurationAIReviewPanel';
import { BATCH_EXCLUDE_SECTIONS, type SectionAction } from '@/lib/cogniblend/waveConfig';

const ATTACHMENT_ONLY_SECTIONS = new Set<SectionKey>(['creator_references', 'reference_urls']);
const BATCH_EXCLUDE_SET = new Set<SectionKey>(BATCH_EXCLUDE_SECTIONS);

export interface BatchInvokeOptions {
  challengeId: string;
  sectionActions: Array<{ sectionId: SectionKey; action: SectionAction }>;
  context: ChallengeContext;
  reasoningEffort: 'high' | 'medium' | 'low';
  pass1Only: boolean;
  skipAnalysis: boolean;
  providedCommentsBySectionKey?: Record<string, unknown[]>;
  onSectionReviewed: (sectionKey: string, review: SectionReview) => void;
  onComplexitySuggestion?: (suggestion: Record<string, unknown>) => void;
}

export interface BatchSectionOutcome {
  sectionId: SectionKey;
  status: 'success' | 'error' | 'skipped';
  errorCode?: string | null;
  errorMessage?: string | null;
}

/**
 * Invokes the edge function once for all reviewable sections in a wave.
 * Returns per-section outcomes for the wave history record.
 */
export async function invokeWaveBatch(opts: BatchInvokeOptions): Promise<BatchSectionOutcome[]> {
  const {
    challengeId, sectionActions, context, reasoningEffort,
    pass1Only, skipAnalysis, providedCommentsBySectionKey,
    onSectionReviewed, onComplexitySuggestion,
  } = opts;

  // Partition: skip excluded sections (no DB column → empty payload → malformed JSON)
  // and any section the executor already marked 'skip'. Both end up as 'skipped'
  // outcomes; only the remaining sections are sent to the edge function.
  const reviewable = sectionActions.filter(
    (sa) => sa.action !== 'skip' && !BATCH_EXCLUDE_SET.has(sa.sectionId),
  );

  // Mark excluded sections as 'idle' so they don't sit in 'pending' forever.
  const storeEarly = getCurationFormStore(challengeId);
  for (const sa of sectionActions) {
    if (BATCH_EXCLUDE_SET.has(sa.sectionId)) {
      storeEarly.getState().setReviewStatus(sa.sectionId, 'idle');
    }
  }

  if (reviewable.length === 0) {
    // Empty batch — short-circuit: skip the network call entirely.
    return sectionActions.map((sa) => ({ sectionId: sa.sectionId, status: 'skipped' as const }));
  }

  const store = getCurationFormStore(challengeId);
  reviewable.forEach((sa) => store.getState().setReviewStatus(sa.sectionId, 'pending'));

  // Determine wave-level pass1Only: true if global flag OR all sections are attachment-only
  const allAttachmentOnly = reviewable.every((sa) => ATTACHMENT_ONLY_SECTIONS.has(sa.sectionId));
  const wavePass1Only = pass1Only || allAttachmentOnly;

  // Build provided_comments array (Pass-2-only; ignored by pass1Only).
  // INVARIANT: providedComments only contains entries for sections in `reviewable`
  // (the current sub-batch). This prevents Pass-2 duplicate-suggestion bleed.
  const providedComments: Array<{ section_key: string; status: string; comments: unknown[] }> = [];
  if (skipAnalysis && providedCommentsBySectionKey) {
    for (const sa of reviewable) {
      const existing = providedCommentsBySectionKey[sa.sectionId] as
        | Array<{ type?: string }>
        | undefined;
      if (existing?.length) {
        const hasWarningOrError = existing.some(
          (c) => c.type === 'error' || c.type === 'warning',
        );
        providedComments.push({
          section_key: sa.sectionId,
          status: hasWarningOrError ? 'warning' : 'pass',
          comments: existing,
        });
      }
    }
  }

  const body: Record<string, unknown> = {
    challenge_id: challengeId,
    section_keys: reviewable.map((sa) => sa.sectionId),
    role_context: 'curation',
    context,
    wave_action: 'review',
    reasoning_effort: reasoningEffort,
  };
  if (wavePass1Only) body.pass1_only = true;
  if (providedComments.length > 0) {
    body.skip_analysis = true;
    body.provided_comments = providedComments;
  }

  const outcomes: BatchSectionOutcome[] = sectionActions
    .filter((sa) => sa.action === 'skip' || BATCH_EXCLUDE_SET.has(sa.sectionId))
    .map((sa) => ({ sectionId: sa.sectionId, status: 'skipped' as const }));

  try {
    const { data, error } = await supabase.functions.invoke('review-challenge-sections', { body });
    if (error) throw new Error(error.message);

    const sections: Array<Record<string, unknown>> = data?.success && Array.isArray(data?.data?.sections)
      ? (data.data.sections as Array<Record<string, unknown>>)
      : [];

    const sectionsByKey = new Map<string, Record<string, unknown>>();
    for (const s of sections) {
      const k = s.section_key;
      if (typeof k === 'string') sectionsByKey.set(k, s);
    }

    for (const sa of reviewable) {
      const result = sectionsByKey.get(sa.sectionId);
      if (!result) {
        store.getState().setReviewStatus(sa.sectionId, 'error');
        outcomes.push({
          sectionId: sa.sectionId,
          status: 'error',
          errorCode: 'MISSING',
          errorMessage: 'AI did not return a result for this section.',
        });
        continue;
      }
      // is_batch_failure flag from edge function → error
      if (result.is_batch_failure === true) {
        store.getState().setReviewStatus(sa.sectionId, 'error');
        const errorCode = typeof result.error_code === 'string' ? result.error_code : 'BATCH_ERROR';
        const firstComment = Array.isArray(result.comments) && result.comments.length > 0
          ? (result.comments[0] as { text?: string }).text
          : null;
        outcomes.push({
          sectionId: sa.sectionId,
          status: 'error',
          errorCode,
          errorMessage: firstComment ?? `Batch failed (${errorCode}).`,
        });
        continue;
      }

      try {
        const normalized = normalizeSectionReview(result as unknown as SectionReview);

        if (sa.sectionId === 'complexity') {
          const suggested = (result as { suggested_complexity?: Record<string, unknown> })
            .suggested_complexity;
          if (suggested && onComplexitySuggestion) onComplexitySuggestion({ ...suggested });
        }

        const rawSuggestion = (normalized as { suggestion?: unknown }).suggestion ?? null;
        const parsedSuggestion = rawSuggestion && typeof rawSuggestion === 'string'
          ? parseSuggestionForSection(sa.sectionId, rawSuggestion)
          : rawSuggestion;

        store.getState().setAiReview(
          sa.sectionId,
          normalized.comments ?? [],
          parsedSuggestion as string | string[] | Record<string, unknown> | null,
        );
        store.getState().clearStaleness(sa.sectionId);

        if ((normalized as { status?: string }).status === 'generated' && parsedSuggestion != null) {
          store.getState().setSectionData(
            sa.sectionId,
            parsedSuggestion as string | string[] | Record<string, unknown>,
          );
        }

        if (context.todaysDate) {
          const validationResult = validateAIOutput(
            sa.sectionId,
            ((normalized as { suggestion?: unknown }).suggestion ?? normalized) as Record<string, unknown>,
            context,
          );
          store.getState().setValidationResult(sa.sectionId, validationResult);
        }

        onSectionReviewed(sa.sectionId, { ...normalized, addressed: false });
        outcomes.push({ sectionId: sa.sectionId, status: 'success' });
      } catch (parseErr) {
        store.getState().setReviewStatus(sa.sectionId, 'error');
        outcomes.push({
          sectionId: sa.sectionId,
          status: 'error',
          errorCode: 'MALFORMED',
          errorMessage: parseErr instanceof Error ? parseErr.message : 'Could not parse AI response.',
        });
      }
    }
  } catch (waveErr) {
    // Whole-wave failure (network / 5xx after fallback)
    const msg = waveErr instanceof Error ? waveErr.message : 'Network error';
    for (const sa of reviewable) {
      store.getState().setReviewStatus(sa.sectionId, 'error');
      outcomes.push({
        sectionId: sa.sectionId,
        status: 'error',
        errorCode: 'NETWORK',
        errorMessage: msg,
      });
    }
  }

  return outcomes;
}

/**
 * Wave 8 — invokes the QA-only edge branch (consistency + ambiguity).
 * Returns 'success' only when at least one of the two passes produced a result.
 */
export interface QaWaveOutcome {
  status: 'success' | 'error';
  errorMessage?: string;
  consistencyCount?: number;
  ambiguityCount?: number;
  /** True when the edge function intentionally skipped QA (insufficient coverage). */
  skipped?: boolean;
}

export async function invokeQaWave(challengeId: string, context: ChallengeContext): Promise<QaWaveOutcome> {
  try {
    const { data, error } = await supabase.functions.invoke('review-challenge-sections', {
      body: {
        challenge_id: challengeId,
        role_context: 'curation',
        wave_action: 'consistency_check',
        context,
      },
    });
    if (error) return { status: 'error', errorMessage: error.message };
    if (!data?.success) {
      return { status: 'error', errorMessage: data?.error?.message ?? 'QA pass returned no data.' };
    }
    // Edge function intentionally skipped QA (insufficient section coverage).
    // Surface as success-with-note so the UI shows "Skipped" rather than red.
    if (data?.data?.skipped === true) {
      return {
        status: 'success',
        skipped: true,
        errorMessage: data?.data?.reason ?? 'QA skipped — insufficient section coverage.',
        consistencyCount: 0,
        ambiguityCount: 0,
      };
    }
    const consistencyCount = data?.data?.consistency_findings_count ?? 0;
    const ambiguityCount = data?.data?.ambiguity_findings_count ?? 0;
    const coherence = data?.data?.overall_coherence_score;
    const clarity = data?.data?.overall_clarity_score;
    // Both passes silently failed (caught with .catch(() => null) in the edge fn).
    if (coherence == null && clarity == null && consistencyCount === 0 && ambiguityCount === 0) {
      return { status: 'error', errorMessage: 'Consistency and Ambiguity passes both failed to return a score.' };
    }
    return { status: 'success', consistencyCount, ambiguityCount };
  } catch (e) {
    return { status: 'error', errorMessage: e instanceof Error ? e.message : 'Network error' };
  }
}

/**
 * Wave 12 — Pass-2 Suggestion Harmonization.
 * Sends all cluster suggestions in one call; receives cross-section corrections.
 * Caller is responsible for validating each correction before writing to the store.
 */
export interface HarmonizationCorrectionPayload {
  section_key: string;
  reason: string;
  corrected_suggestion: unknown;
}

export interface HarmonizeWaveOutcome {
  status: 'success' | 'error' | 'skipped';
  errorMessage?: string;
  corrections: HarmonizationCorrectionPayload[];
  crossSectionScore?: number;
  issuesFound?: number;
  issuesFixed?: number;
  skippedReason?: string;
}

export async function invokeHarmonizationWave(
  challengeId: string,
  suggestions: Record<string, unknown>,
): Promise<HarmonizeWaveOutcome> {
  try {
    const { data, error } = await supabase.functions.invoke('review-challenge-sections', {
      body: {
        challenge_id: challengeId,
        role_context: 'curation',
        wave_action: 'harmonize_suggestions',
        context: { suggestions },
      },
    });
    if (error) return { status: 'error', errorMessage: error.message, corrections: [] };
    if (!data?.success) {
      return { status: 'error', errorMessage: data?.error?.message ?? 'Harmonization returned no data.', corrections: [] };
    }
    if (data?.data?.skipped === true) {
      return {
        status: 'skipped',
        skippedReason: data?.data?.reason ?? 'Skipped — insufficient suggestions to harmonize.',
        corrections: [],
      };
    }
    const correctionsRaw = Array.isArray(data?.data?.corrections) ? data.data.corrections : [];
    const corrections: HarmonizationCorrectionPayload[] = correctionsRaw
      .filter((c: unknown): c is HarmonizationCorrectionPayload => {
        if (!c || typeof c !== 'object') return false;
        const obj = c as Record<string, unknown>;
        return typeof obj.section_key === 'string'
          && typeof obj.reason === 'string'
          && obj.corrected_suggestion !== undefined;
      });
    return {
      status: 'success',
      corrections,
      crossSectionScore: typeof data?.data?.cross_section_score === 'number' ? data.data.cross_section_score : undefined,
      issuesFound: typeof data?.data?.issues_found === 'number' ? data.data.issues_found : corrections.length,
      issuesFixed: typeof data?.data?.issues_fixed === 'number' ? data.data.issues_fixed : corrections.length,
    };
  } catch (e) {
    return { status: 'error', errorMessage: e instanceof Error ? e.message : 'Network error', corrections: [] };
  }
}
