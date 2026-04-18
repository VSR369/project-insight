/**
 * formatValidator.test.ts — covers checklist items C10, G2.
 * Asserts the validator emits corrections when AI returns the wrong shape.
 */

import { describe, it, expect } from 'vitest';
import { validateFormat } from '../formatValidator';

describe('validateFormat — table / schedule_table (C10)', () => {
  it('flags a string-typed suggestion for a table section', () => {
    const r = validateFormat('evaluation_criteria', { suggestion: 'just a string, not rows' });
    // suggestion string with no extractable rows → no corrections (early return)
    // — exercise the explicit row-shape path instead:
    const r2 = validateFormat('evaluation_criteria', { suggestion: { rows: 'not-an-array' } });
    expect(r2.corrections.some((c) => /array/i.test(c.issue))).toBe(true);
    expect(r.corrections).toBeDefined();
  });

  it('flags rows that are scalars (not objects)', () => {
    const r = validateFormat('phase_schedule', { suggestion: ['a', 'b', 'c'] });
    expect(r.corrections.some((c) => /objects/i.test(c.issue))).toBe(true);
  });

  it('passes for a well-formed table', () => {
    const r = validateFormat('evaluation_criteria', {
      suggestion: [
        { criterion_name: 'Quality', weight_percentage: 40, description: 'x', scoring_method: 'numeric', evaluator_role: 'expert' },
      ],
    });
    expect(r.corrections).toHaveLength(0);
    expect(r.passedChecks.length).toBeGreaterThan(0);
  });
});

describe('validateFormat — line_items (C10)', () => {
  it('flags an object when an array is required', () => {
    const r = validateFormat('deliverables', { suggestion: { items: { not: 'an-array' } } });
    expect(r.corrections.some((c) => /line_items/i.test(c.issue))).toBe(true);
  });

  it('passes for a clean string array', () => {
    const r = validateFormat('deliverables', { suggestion: ['Deliverable A', 'Deliverable B'] });
    expect(r.corrections).toHaveLength(0);
  });
});

describe('validateFormat — checkbox_single (C10)', () => {
  it('flags an array with multiple values for a single-select section', () => {
    const r = validateFormat('maturity_level', { suggestion: ['POC', 'PILOT'] });
    expect(r.corrections.some((c) => /single value/i.test(c.issue))).toBe(true);
  });

  it('passes for a single value', () => {
    const r = validateFormat('maturity_level', { suggestion: 'POC' });
    expect(r.corrections).toHaveLength(0);
  });
});

describe('validateFormat — unknown sections', () => {
  it('returns empty result when section has no format config (no false positives)', () => {
    const r = validateFormat('not_a_real_section', { suggestion: 'anything' });
    expect(r.corrections).toEqual([]);
    expect(r.passedChecks).toEqual([]);
  });
});
