/**
 * diagnosticsActionLabel.test.ts — covers checklist item C7 (NEW gap closure).
 * Pass 2 diagnostics MUST show "Suggest" (not "Review" or "Generate") for
 * every non-skipped row. Regression guard against label drift.
 */

import { describe, it, expect } from 'vitest';
import { diagnosticsActionLabelPass2 } from '../diagnosticsActionLabel';

describe('diagnosticsActionLabelPass2 — C7 label policy', () => {
  it.each(['success', 'error', 'pending', undefined] as const)(
    'C7: returns "Suggest" for status=%s',
    (s) => {
      expect(diagnosticsActionLabelPass2(s)).toBe('Suggest');
    },
  );

  it('C7: returns "Skipped" for skipped sections', () => {
    expect(diagnosticsActionLabelPass2('skipped')).toBe('Skipped');
  });
});
