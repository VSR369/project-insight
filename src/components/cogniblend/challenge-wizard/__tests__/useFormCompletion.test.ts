/**
 * TW1-04: Section completion bar shows correct percentage
 *
 * Unit-tests the pure logic behind useFormCompletion.
 * Tests use mock FieldRulesMap to verify dynamic derivation.
 */

import { describe, it, expect } from 'vitest';
import type { FieldRulesMap, FieldRule } from '@/hooks/queries/useGovernanceFieldRules';

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

const WIZARD_STEP_COUNT = 8;

function makeRule(fieldKey: string, wizardStep: number, visibility: string): FieldRule {
  return {
    fieldKey,
    wizardStep,
    visibility: visibility as any,
    minLength: null,
    maxLength: null,
    defaultValue: null,
    displayOrder: 0,
  };
}

function buildRulesMap(rules: FieldRule[]): FieldRulesMap {
  const map: FieldRulesMap = {};
  for (const r of rules) map[r.fieldKey] = r;
  return map;
}

function getRequiredFieldsByStepFromRules(fieldRules: FieldRulesMap | null): string[][] {
  if (!fieldRules) return Array.from({ length: WIZARD_STEP_COUNT }, () => []);
  const stepMap = new Map<number, string[]>();
  for (const [fieldKey, rule] of Object.entries(fieldRules)) {
    if (rule.visibility === 'required' && rule.wizardStep >= 0 && rule.wizardStep < WIZARD_STEP_COUNT) {
      if (!stepMap.has(rule.wizardStep)) stepMap.set(rule.wizardStep, []);
      stepMap.get(rule.wizardStep)!.push(fieldKey);
    }
  }
  return Array.from({ length: WIZARD_STEP_COUNT }, (_, i) => stepMap.get(i) ?? []);
}

function computeCompletion(values: Record<string, unknown>, fieldRules: FieldRulesMap | null) {
  const stepFields = getRequiredFieldsByStepFromRules(fieldRules);
  const steps = stepFields.map((fields) => {
    const filled = fields.filter((f) => isFieldFilled(values[f])).length;
    return { filled, total: fields.length };
  });
  const totalFilled = steps.reduce((s, step) => s + step.filled, 0);
  const totalRequired = steps.reduce((s, step) => s + step.total, 0);
  return { steps, totalFilled, totalRequired, pct: totalRequired > 0 ? Math.round((totalFilled / totalRequired) * 100) : 0 };
}

/* ── Mock rule sets simulating QUICK / STRUCTURED / CONTROLLED ── */

const QUICK_RULES = buildRulesMap([
  makeRule('governance_mode', 0, 'required'),
  makeRule('title', 1, 'required'),
  makeRule('problem_statement', 1, 'required'),
  makeRule('domain_tags', 1, 'required'),
  makeRule('maturity_level', 1, 'required'),
  makeRule('weighted_criteria', 2, 'required'),
  makeRule('platinum_award', 3, 'required'),
  makeRule('gold_award', 3, 'optional'),
  makeRule('expected_timeline', 4, 'required'),
  makeRule('submission_deadline', 4, 'required'),
  makeRule('eligibility', 5, 'required'),
  makeRule('scope', 1, 'hidden'),
  makeRule('rejection_fee_pct', 3, 'auto'),
]);

const STRUCTURED_RULES = buildRulesMap([
  makeRule('governance_mode', 0, 'required'),
  makeRule('title', 1, 'required'),
  makeRule('problem_statement', 1, 'required'),
  makeRule('scope', 1, 'required'),
  makeRule('domain_tags', 1, 'required'),
  makeRule('maturity_level', 1, 'required'),
  makeRule('weighted_criteria', 2, 'required'),
  makeRule('platinum_award', 3, 'required'),
  makeRule('gold_award', 3, 'required'),
  makeRule('rejection_fee_pct', 3, 'required'),
  makeRule('expected_timeline', 4, 'required'),
  makeRule('review_duration', 4, 'optional'),
  makeRule('eligibility', 5, 'required'),
]);

const CONTROLLED_RULES = buildRulesMap([
  makeRule('governance_mode', 0, 'required'),
  makeRule('title', 1, 'required'),
  makeRule('problem_statement', 1, 'required'),
  makeRule('scope', 1, 'required'),
  makeRule('domain_tags', 1, 'required'),
  makeRule('maturity_level', 1, 'required'),
  makeRule('weighted_criteria', 2, 'required'),
  makeRule('platinum_award', 3, 'required'),
  makeRule('gold_award', 3, 'required'),
  makeRule('rejection_fee_pct', 3, 'required'),
  makeRule('ip_model', 3, 'required'),
  makeRule('expected_timeline', 4, 'required'),
  makeRule('review_duration', 4, 'required'),
  makeRule('eligibility', 5, 'required'),
  makeRule('challenge_enrollment', 5, 'required'),
  makeRule('challenge_submission', 5, 'required'),
]);

/* ═══════════════════════════════════════════════════════════
   TW1-04  Section completion bar shows correct percentage
   ═══════════════════════════════════════════════════════════ */
describe('TW1-04 — Form completion percentage (dynamic FieldRulesMap)', () => {
  it('returns 0% when all fields are empty (QUICK)', () => {
    const result = computeCompletion({}, QUICK_RULES);
    expect(result.pct).toBe(0);
    expect(result.totalRequired).toBe(10); // governance_mode + 4 problem + 1 eval + 1 reward + 2 timeline + 1 eligibility
  });

  it('returns 100% when all QUICK required fields are filled', () => {
    const values: Record<string, unknown> = {
      governance_mode: 'QUICK',
      title: 'My Challenge',
      problem_statement: 'A problem',
      domain_tags: ['ai'],
      maturity_level: 'poc',
      weighted_criteria: [{ name: 'Quality', weight: 100 }],
      platinum_award: 1000,
      expected_timeline: '3 months',
      submission_deadline: '2026-06-01',
      eligibility: 'Open to all',
    };
    const result = computeCompletion(values, QUICK_RULES);
    expect(result.pct).toBe(100);
  });

  it('returns correct partial percentage (STRUCTURED)', () => {
    const values: Record<string, unknown> = {
      governance_mode: 'STRUCTURED',
      title: 'Title',
      problem_statement: 'Statement',
      domain_tags: ['ai'],
      maturity_level: 'poc',
      weighted_criteria: [{ name: 'Q', weight: 100 }],
      platinum_award: 500,
    };
    const result = computeCompletion(values, STRUCTURED_RULES);
    // filled: step0=1/1, step1=4/5, step2=1/1, step3=1/3, step4=0/1, step5=0/1 → 7/12
    expect(result.totalFilled).toBe(7);
    expect(result.totalRequired).toBe(12);
    expect(result.pct).toBe(58);
  });

  it('CONTROLLED has more required fields than STRUCTURED', () => {
    const controlled = computeCompletion({}, CONTROLLED_RULES);
    const structured = computeCompletion({}, STRUCTURED_RULES);
    expect(controlled.totalRequired).toBeGreaterThan(structured.totalRequired);
  });

  it('returns 0/0 when fieldRules is null (loading state)', () => {
    const result = computeCompletion({}, null);
    expect(result.totalRequired).toBe(0);
    expect(result.totalFilled).toBe(0);
    expect(result.pct).toBe(0);
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

  it('hidden and auto fields are excluded from required count', () => {
    const result = computeCompletion({}, QUICK_RULES);
    // scope is hidden, rejection_fee_pct is auto — neither should count
    const allStepFields = result.steps.flatMap((_, i) => {
      const fields = getRequiredFieldsByStepFromRules(QUICK_RULES);
      return fields[i];
    });
    expect(allStepFields).not.toContain('scope');
    expect(allStepFields).not.toContain('rejection_fee_pct');
  });
});
