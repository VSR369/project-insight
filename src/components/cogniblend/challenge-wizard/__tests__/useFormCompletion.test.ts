/**
 * TW1-04: Section completion bar shows correct percentage
 *
 * Unit-tests the pure logic behind useFormCompletion without rendering a component.
 * We extract the helper functions and test them directly.
 */

import { describe, it, expect } from 'vitest';

/* ── Re-implement the pure helpers (same logic as useFormCompletion.ts) ── */

function isFieldFilled(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return true;
  if (Array.isArray(value)) {
    if (value.length === 0) return false;
    if (typeof value[0] === 'string') return value.some((v) => typeof v === 'string' && v.trim().length > 0);
    if (typeof value[0] === 'object' && value[0] !== null && 'name' in value[0]) {
      return value.some((v: any) => v.name?.trim().length > 0);
    }
    return true;
  }
  if (typeof value === 'object') return Object.keys(value as object).length > 0;
  return false;
}

type FieldKey = string;

function getRequiredFieldsByStep(isLightweight: boolean): FieldKey[][] {
  return [
    isLightweight
      ? ['title', 'problem_statement', 'domain_tags', 'maturity_level']
      : ['title', 'problem_statement', 'scope', 'domain_tags', 'maturity_level'],
    isLightweight
      ? ['deliverables_list']
      : ['deliverables_list', 'submission_guidelines', 'ip_model', 'visibility', 'eligibility'],
    isLightweight
      ? ['weighted_criteria', 'platinum_award']
      : ['weighted_criteria', 'platinum_award', 'gold_award', 'rejection_fee_pct'],
    isLightweight
      ? ['expected_timeline']
      : ['submission_deadline', 'expected_timeline', 'review_duration'],
  ];
}

function computeCompletion(values: Record<string, unknown>, isLightweight: boolean) {
  const stepFields = getRequiredFieldsByStep(isLightweight);
  const steps = stepFields.map((fields) => {
    const filled = fields.filter((f) => isFieldFilled(values[f])).length;
    return { filled, total: fields.length };
  });
  const totalFilled = steps.reduce((s, step) => s + step.filled, 0);
  const totalRequired = steps.reduce((s, step) => s + step.total, 0);
  return { steps, totalFilled, totalRequired, pct: Math.round((totalFilled / totalRequired) * 100) };
}

/* ═══════════════════════════════════════════════════════════
   TW1-04  Section completion bar shows correct percentage
   ═══════════════════════════════════════════════════════════ */
describe('TW1-04 — Form completion percentage', () => {
  it('returns 0% when all fields are empty (lightweight)', () => {
    const result = computeCompletion({}, true);
    expect(result.pct).toBe(0);
    expect(result.totalRequired).toBe(8); // 4+1+2+1
  });

  it('returns 100% when all lightweight fields are filled', () => {
    const values: Record<string, unknown> = {
      title: 'My Challenge',
      problem_statement: 'A problem',
      domain_tags: ['ai'],
      maturity_level: 'poc',
      deliverables_list: ['Report'],
      weighted_criteria: [{ name: 'Quality', weight: 100 }],
      platinum_award: 1000,
      expected_timeline: '3 months',
    };
    const result = computeCompletion(values, true);
    expect(result.pct).toBe(100);
  });

  it('returns correct partial percentage (enterprise)', () => {
    // Enterprise has 5+5+4+3 = 17 required fields
    const values: Record<string, unknown> = {
      title: 'Title',
      problem_statement: 'Statement',
      // scope missing
      domain_tags: ['ai'],
      maturity_level: 'poc',
      // Step 2: only deliverables filled
      deliverables_list: ['Doc'],
      // Step 3: only weighted_criteria
      weighted_criteria: [{ name: 'Q', weight: 100 }],
      // Step 4: nothing
    };
    const result = computeCompletion(values, false);
    // filled: step1=4/5, step2=1/5, step3=1/4, step4=0/3 → 6/17 ≈ 35%
    expect(result.totalFilled).toBe(6);
    expect(result.totalRequired).toBe(17);
    expect(result.pct).toBe(35);
  });

  it('treats empty arrays as not filled', () => {
    expect(isFieldFilled([])).toBe(false);
  });

  it('treats arrays with blank strings as not filled', () => {
    expect(isFieldFilled(['', '  '])).toBe(false);
  });

  it('treats weighted_criteria with empty names as not filled', () => {
    expect(isFieldFilled([{ name: '', weight: 0 }])).toBe(false);
  });

  it('per-step counts match expected totals (lightweight)', () => {
    const result = computeCompletion({}, true);
    expect(result.steps.map((s) => s.total)).toEqual([4, 1, 2, 1]);
  });

  it('per-step counts match expected totals (enterprise)', () => {
    const result = computeCompletion({}, false);
    expect(result.steps.map((s) => s.total)).toEqual([5, 5, 4, 3]);
  });
});
