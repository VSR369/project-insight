/**
 * diagnosticsActionLabel — Pure helper that derives the Pass 2 "Action"
 * column label for a diagnostics row. Extracted so it can be unit-tested
 * without rendering the full DiagnosticsSuggestionsPanel (R2: business
 * logic out of components).
 *
 * Rule (F4a): Pass 2 always shows "Suggest" — never "Review" or "Generate" —
 * unless the section was skipped entirely.
 */

export type DiagnosticsSectionStatus = 'success' | 'error' | 'skipped' | 'pending';

export function diagnosticsActionLabelPass2(status: DiagnosticsSectionStatus | undefined): string {
  if (status === 'skipped') return 'Skipped';
  return 'Suggest';
}
