/**
 * diagnosticsActionLabel — Pure helpers that derive the Pass 2 "Action"
 * column label and outcome classification for a diagnostics row.
 *
 * Outcome model:
 *   - success: AI returned a usable suggestion.
 *   - truncated_recoverable: AI hit max_tokens on a known large-output section.
 *     Renders amber "Retry-needed" — repair via single-section re-run.
 *   - failed: Hard failure (MALFORMED, MISSING, gateway error). Renders red.
 *
 * Rule (F4a): Pass 2 always shows "Suggest" — never "Review" or "Generate" —
 * unless the section was skipped entirely.
 */

export type DiagnosticsSectionStatus = 'success' | 'error' | 'skipped' | 'pending';

export type Pass2Outcome = 'success' | 'truncated_recoverable' | 'failed' | 'skipped' | 'not_run';

/** Sections known to produce large structured outputs — mirrors aiPass2.ts. */
const LARGE_OUTPUT_SECTIONS = new Set([
  'evaluation_criteria',
  'reward_structure',
  'deliverables',
  'phase_schedule',
  'solver_expertise',
  'submission_guidelines',
]);

export function diagnosticsActionLabelPass2(status: DiagnosticsSectionStatus | undefined): string {
  if (status === 'skipped') return 'Skipped';
  return 'Suggest';
}

export interface ClassifyPass2Args {
  hasRecord: boolean;
  status?: string | null;
  errorCode?: string | null;
  isPass2Failure?: boolean;
  sectionId: string;
}

export function classifyPass2Outcome(args: ClassifyPass2Args): Pass2Outcome {
  if (!args.hasRecord || !args.status) return 'not_run';
  if (args.status === 'skipped') return 'skipped';
  if (args.status === 'success' && !args.isPass2Failure) return 'success';
  // TRUNCATED on a known large-output section is recoverable via single-section retry.
  if (args.errorCode === 'TRUNCATED' && LARGE_OUTPUT_SECTIONS.has(args.sectionId)) {
    return 'truncated_recoverable';
  }
  return 'failed';
}

/** Helper used by the Repair button — only target genuinely failed rows. */
export function getFailedRecoverable<T extends { sectionId: string; errorCode?: string | null; isPass2Failure?: boolean; status?: string }>(
  sections: T[],
): T[] {
  return sections.filter((s) =>
    s.isPass2Failure === true ||
    (s.status === 'error' && s.errorCode !== 'TRUNCATED'),
  );
}
