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
import type { SectionAction } from '@/lib/cogniblend/waveConfig';

const ATTACHMENT_ONLY_SECTIONS = new Set<SectionKey>(['creator_references', 'reference_urls']);

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

  const reviewable = sectionActions.filter((sa) => sa.action !== 'skip');
  if (reviewable.length === 0) {
    return sectionActions.map((sa) => ({ sectionId: sa.sectionId, status: 'skipped' as const }));
  }

  const store = getCurationFormStore(challengeId);
  reviewable.forEach((sa) => store.getState().setReviewStatus(sa.sectionId, 'pending'));

  // Determine wave-level pass1Only: true if global flag OR all sections are attachment-only
  const allAttachmentOnly = reviewable.every((sa) => ATTACHMENT_ONLY_SECTIONS.has(sa.sectionId));
  const wavePass1Only = pass1Only || allAttachmentOnly;

  // Build provided_comments array (Pass-2-only; ignored by pass1Only)
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
    .filter((sa) => sa.action === 'skip')
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
        // Missing → truthful error (R9: no console)
        store.getState().setReviewStatus(sa.sectionId, 'error');
        outcomes.push({ sectionId: sa.sectionId, status: 'error' });
        continue;
      }
      // is_batch_failure flag from edge function → error
      if (result.is_batch_failure === true) {
        store.getState().setReviewStatus(sa.sectionId, 'error');
        outcomes.push({ sectionId: sa.sectionId, status: 'error' });
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
      } catch {
        store.getState().setReviewStatus(sa.sectionId, 'error');
        outcomes.push({ sectionId: sa.sectionId, status: 'error' });
      }
    }
  } catch {
    // Whole-wave failure (network / 5xx after fallback) — mark all as error
    for (const sa of reviewable) {
      store.getState().setReviewStatus(sa.sectionId, 'error');
      outcomes.push({ sectionId: sa.sectionId, status: 'error' });
    }
  }

  return outcomes;
}

/**
 * Wave 8 — invokes the QA-only edge branch (consistency + ambiguity).
 */
export async function invokeQaWave(challengeId: string, context: ChallengeContext): Promise<'success' | 'error'> {
  try {
    const { data, error } = await supabase.functions.invoke('review-challenge-sections', {
      body: {
        challenge_id: challengeId,
        role_context: 'curation',
        wave_action: 'consistency_check',
        context,
      },
    });
    if (error) return 'error';
    return data?.success ? 'success' : 'error';
  } catch {
    return 'error';
  }
}
