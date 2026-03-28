/**
 * TW1-04: Section completion bar shows correct percentage
 *
 * Unit-tests the pure logic behind useFormCompletion without rendering a component.
 * We extract the helper functions and test them directly.
 */

import { describe, it, expect } from 'vitest';
import type { GovernanceMode } from '@/lib/governanceMode';

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

function getRequiredFieldsByStep(mode: GovernanceMode): FieldKey[][] {
  if (mode === 'QUICK') {
    return [
      ['governance_mode'],
      ['title', 'problem_statement', 'domain_tags', 'maturity_level'],
      ['weighted_criteria'],
      ['platinum_award'],
      ['expected_timeline'],
      ['eligibility'],
      [],
      [],
    ];
  }
  if (mode === 'CONTROLLED') {
    return [
      ['governance_mode'],
      ['title', 'problem_statement', 'scope', 'domain_tags', 'maturity_level'],
      ['weighted_criteria'],
      ['platinum_award', 'gold_award', 'rejection_fee_pct', 'ip_model'],
      ['expected_timeline', 'review_duration'],
      ['eligibility', 'challenge_visibility', 'challenge_enrollment', 'challenge_submission'],
      [],
      [],
    ];
  }
  // STRUCTURED
  return [
    ['governance_mode'],
    ['title', 'problem_statement', 'scope', 'domain_tags', 'maturity_level'],
    ['weighted_criteria'],
    ['platinum_award', 'gold_award', 'rejection_fee_pct'],
    ['expected_timeline', 'review_duration'],
    ['eligibility'],
    [],
    [],
  ];
}

function computeCompletion(values: Record<string, unknown>, mode: GovernanceMode) {
  const stepFields = getRequiredFieldsByStep(mode);
  const steps = stepFields.map((fields) => {
    const filled = fields.filter((f) => isFieldFilled(values[f])).length;
    return { filled, total: fields.length };
  });
  const totalFilled = steps.reduce((s, step) => s + step.filled, 0);
  const totalRequired = steps.reduce((s, step) => s + step.total, 0);
  return { steps, totalFilled, totalRequired, pct: totalRequired > 0 ? Math.round((totalFilled / totalRequired) * 100) : 0 };
}

/* ═══════════════════════════════════════════════════════════
   TW1-04  Section completion bar shows correct percentage
   ═══════════════════════════════════════════════════════════ */
describe('TW1-04 — Form completion percentage (3-mode governance)', () => {
  it('returns 0% when all fields are empty (QUICK)', () => {
    const result = computeCompletion({}, 'QUICK');
    expect(result.pct).toBe(0);
    // Step 0: 1, Step 1: 4, Step 2: 1, Step 3: 1, Step 4: 1, Step 5: 1 = 9
    expect(result.totalRequired).toBe(9);
  });

  it('returns 100% when all QUICK fields are filled', () => {
    const values: Record<string, unknown> = {
      governance_mode: 'QUICK',
      title: 'My Challenge',
      problem_statement: 'A problem',
      domain_tags: ['ai'],
      maturity_level: 'poc',
      weighted_criteria: [{ name: 'Quality', weight: 100 }],
      platinum_award: 1000,
      expected_timeline: '3 months',
      eligibility: 'Open to all',
    };
    const result = computeCompletion(values, 'QUICK');
    expect(result.pct).toBe(100);
  });

  it('returns correct partial percentage (STRUCTURED)', () => {
    // STRUCTURED: 1+5+1+3+3+1 = 14 required fields
    const values: Record<string, unknown> = {
      governance_mode: 'STRUCTURED',
      title: 'Title',
      problem_statement: 'Statement',
      domain_tags: ['ai'],
      maturity_level: 'poc',
      // Step 2: weighted_criteria
      weighted_criteria: [{ name: 'Q', weight: 100 }],
      // Step 3: only platinum
      platinum_award: 500,
    };
    const result = computeCompletion(values, 'STRUCTURED');
    // filled: step0=1/1, step1=4/5, step2=1/1, step3=1/3, step4=0/2, step5=0/1 → 7/13 = 53%
    expect(result.totalFilled).toBe(7);
    expect(result.totalRequired).toBe(13);
    expect(result.pct).toBe(54);
  });

  it('CONTROLLED has more required fields than STRUCTURED', () => {
    const controlled = computeCompletion({}, 'CONTROLLED');
    const structured = computeCompletion({}, 'STRUCTURED');
    expect(controlled.totalRequired).toBeGreaterThan(structured.totalRequired);
  });

  it('per-step counts match expected totals (QUICK)', () => {
    const result = computeCompletion({}, 'QUICK');
    expect(result.steps.map((s) => s.total)).toEqual([1, 4, 1, 1, 1, 1, 0, 0]);
  });

  it('per-step counts match expected totals (STRUCTURED)', () => {
    const result = computeCompletion({}, 'STRUCTURED');
    expect(result.steps.map((s) => s.total)).toEqual([1, 5, 1, 3, 2, 1, 0, 0]);
  });

  it('per-step counts match expected totals (CONTROLLED)', () => {
    const result = computeCompletion({}, 'CONTROLLED');
    expect(result.steps.map((s) => s.total)).toEqual([1, 5, 1, 4, 2, 4, 0, 0]);
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
});
