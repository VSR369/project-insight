/**
 * TW1-01: Title accepts 200 chars, rejects 201
 * TW1-02: Problem Statement min 300 for Structured, 500 for Controlled, 200 for Quick
 * TW1-03: Scope min 150 for Structured, 200 for Controlled, optional for Quick
 */

import { describe, it, expect } from 'vitest';
import { createChallengeFormSchema, TITLE_MAX } from '../challengeFormSchema';

/* ── Helper: build a valid base object so only the field under test varies ── */
function validBase(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Valid Title',
    problem_statement: 'x'.repeat(500),
    scope: 'x'.repeat(200),
    domain_tags: ['ai'],
    maturity_level: 'poc',
    industry_segment_id: 'some-segment-id',
    deliverables_list: ['Report'],
    weighted_criteria: [{ name: 'Quality', weight: 100 }],
    platinum_award: 1000,
    gold_award: 500,
    rejection_fee_pct: 10,
    submission_deadline: '2026-06-01',
    expected_timeline: '3 months',
    review_duration: 14,
    ...overrides,
  };
}

/* ═══════════════════════════════════════════════════════════
   TW1-01  Title accepts 200 chars, rejects 201
   ═══════════════════════════════════════════════════════════ */
describe('TW1-01 — Title max length', () => {
  const schema = createChallengeFormSchema('STRUCTURED');

  it(`accepts exactly ${TITLE_MAX} characters`, () => {
    const result = schema.safeParse(validBase({ title: 'a'.repeat(TITLE_MAX) }));
    expect(result.success).toBe(true);
  });

  it(`rejects ${TITLE_MAX + 1} characters`, () => {
    const result = schema.safeParse(validBase({ title: 'a'.repeat(TITLE_MAX + 1) }));
    expect(result.success).toBe(false);
    if (!result.success) {
      const titleIssue = result.error.issues.find((i) => i.path.includes('title'));
      expect(titleIssue).toBeDefined();
    }
  });
});

/* ═══════════════════════════════════════════════════════════
   TW1-02  Problem Statement governance-aware min length
   ═══════════════════════════════════════════════════════════ */
describe('TW1-02 — Problem Statement governance-aware min length', () => {
  describe('Controlled (min 500)', () => {
    const schema = createChallengeFormSchema('CONTROLLED');

    it('rejects 499 chars', () => {
      const result = schema.safeParse(validBase({ problem_statement: 'x'.repeat(499) }));
      expect(result.success).toBe(false);
    });

    it('accepts 500 chars', () => {
      const result = schema.safeParse(validBase({ problem_statement: 'x'.repeat(500) }));
      expect(result.success).toBe(true);
    });
  });

  describe('Structured (min 300)', () => {
    const schema = createChallengeFormSchema('STRUCTURED');

    it('rejects 299 chars', () => {
      const result = schema.safeParse(validBase({ problem_statement: 'x'.repeat(299) }));
      expect(result.success).toBe(false);
    });

    it('accepts 300 chars', () => {
      const result = schema.safeParse(validBase({ problem_statement: 'x'.repeat(300) }));
      expect(result.success).toBe(true);
    });
  });

  describe('Quick (min 200)', () => {
    const schema = createChallengeFormSchema('QUICK');

    it('rejects 199 chars', () => {
      const result = schema.safeParse(validBase({ problem_statement: 'x'.repeat(199), industry_segment_id: '' }));
      expect(result.success).toBe(false);
    });

    it('accepts 200 chars', () => {
      const result = schema.safeParse(validBase({ problem_statement: 'x'.repeat(200), industry_segment_id: '' }));
      expect(result.success).toBe(true);
    });
  });
});

/* ═══════════════════════════════════════════════════════════
   TW1-03  Scope governance-aware min length
   ═══════════════════════════════════════════════════════════ */
describe('TW1-03 — Scope governance-aware min length', () => {
  describe('Controlled (min 200)', () => {
    const schema = createChallengeFormSchema('CONTROLLED');

    it('rejects 199 chars', () => {
      const result = schema.safeParse(validBase({ scope: 'x'.repeat(199) }));
      expect(result.success).toBe(false);
    });

    it('accepts 200 chars', () => {
      const result = schema.safeParse(validBase({ scope: 'x'.repeat(200) }));
      expect(result.success).toBe(true);
    });
  });

  describe('Quick (scope optional)', () => {
    const schema = createChallengeFormSchema('QUICK');

    it('accepts empty string', () => {
      const result = schema.safeParse(validBase({ scope: '', problem_statement: 'x'.repeat(200), industry_segment_id: '' }));
      expect(result.success).toBe(true);
    });

    it('accepts 50 chars (no min enforced)', () => {
      const result = schema.safeParse(validBase({ scope: 'x'.repeat(50), problem_statement: 'x'.repeat(200), industry_segment_id: '' }));
      expect(result.success).toBe(true);
    });
  });
});

/* ═══════════════════════════════════════════════════════════
   TW1-04  Industry Segment required for STRUCTURED/CONTROLLED
   ═══════════════════════════════════════════════════════════ */
describe('TW1-04 — Industry Segment governance-aware requirement', () => {
  it('STRUCTURED rejects empty industry_segment_id', () => {
    const schema = createChallengeFormSchema('STRUCTURED');
    const result = schema.safeParse(validBase({ industry_segment_id: '' }));
    expect(result.success).toBe(false);
  });

  it('QUICK accepts empty industry_segment_id', () => {
    const schema = createChallengeFormSchema('QUICK');
    const result = schema.safeParse(validBase({ industry_segment_id: '', problem_statement: 'x'.repeat(200) }));
    expect(result.success).toBe(true);
  });
});
