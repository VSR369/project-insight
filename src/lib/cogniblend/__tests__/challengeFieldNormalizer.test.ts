/**
 * Unit tests for challengeFieldNormalizer
 */
import { describe, it, expect } from 'vitest';
import { normalizeChallengeFields } from '../challengeFieldNormalizer';

describe('normalizeChallengeFields', () => {
  /* ── maturity_level ─────────────────────────── */
  describe('maturity_level', () => {
    it.each(['blueprint', 'Blueprint', 'BLUEPRINT'])('normalizes "%s" → BLUEPRINT', (v) => {
      expect(normalizeChallengeFields({ maturity_level: v }).maturity_level).toBe('BLUEPRINT');
    });

    it.each(['poc', 'POC', 'prototype', 'PILOT', 'demo', 'DEMO'])('accepts valid values', (v) => {
      const out = normalizeChallengeFields({ maturity_level: v });
      expect(out.maturity_level).toBe(v.toUpperCase());
    });

    it('normalizes SOLUTION_DEMO → DEMO', () => {
      expect(normalizeChallengeFields({ maturity_level: 'SOLUTION_DEMO' }).maturity_level).toBe('DEMO');
    });

    it('throws for invalid value', () => {
      expect(() => normalizeChallengeFields({ maturity_level: 'unknown' })).toThrow('Invalid maturity_level');
    });

    it('passes through null/empty', () => {
      expect(normalizeChallengeFields({ maturity_level: null }).maturity_level).toBeNull();
      expect(normalizeChallengeFields({ maturity_level: '' }).maturity_level).toBe('');
    });
  });

  /* ── ip_model ───────────────────────────────── */
  describe('ip_model', () => {
    const cases: [string, string][] = [
      ['FULL_TRANSFER', 'IP-EA'],
      ['exclusive_assignment', 'IP-EA'],
      ['LICENSE', 'IP-NEL'],
      ['non_exclusive_license', 'IP-NEL'],
      ['exclusive_license', 'IP-EL'],
      ['SHARED', 'IP-JO'],
      ['joint_ownership', 'IP-JO'],
      ['SOLVER_RETAINS', 'IP-NONE'],
      ['no_transfer', 'IP-NONE'],
      ['IP-EA', 'IP-EA'],
      ['ip-nel', 'IP-NEL'],
    ];

    it.each(cases)('maps "%s" → "%s"', (input, expected) => {
      expect(normalizeChallengeFields({ ip_model: input }).ip_model).toBe(expected);
    });

    it('throws for invalid value', () => {
      expect(() => normalizeChallengeFields({ ip_model: 'BOGUS' })).toThrow('Invalid ip_model');
    });
  });

  /* ── complexity_level ───────────────────────── */
  describe('complexity_level', () => {
    it.each(['l1', 'L1', 'L5'])('normalizes "%s"', (v) => {
      expect(normalizeChallengeFields({ complexity_level: v }).complexity_level).toBe(v.toUpperCase());
    });

    it('throws for invalid', () => {
      expect(() => normalizeChallengeFields({ complexity_level: 'L6' })).toThrow('Invalid complexity_level');
    });
  });

  /* ── rejection_fee_percentage ───────────────── */
  describe('rejection_fee_percentage', () => {
    it('clamps below 5 to 5', () => {
      expect(normalizeChallengeFields({ rejection_fee_percentage: 2 }).rejection_fee_percentage).toBe(5);
    });

    it('clamps above 20 to 20', () => {
      expect(normalizeChallengeFields({ rejection_fee_percentage: 30 }).rejection_fee_percentage).toBe(20);
    });

    it('keeps value in range', () => {
      expect(normalizeChallengeFields({ rejection_fee_percentage: 10 }).rejection_fee_percentage).toBe(10);
    });
  });

  /* ── aggregated errors ──────────────────────── */
  it('aggregates multiple errors', () => {
    expect(() =>
      normalizeChallengeFields({ maturity_level: 'bad', ip_model: 'bad' }),
    ).toThrow(/maturity_level.*ip_model/);
  });

  /* ── passthrough of unrelated fields ────────── */
  it('preserves unrelated fields', () => {
    const out = normalizeChallengeFields({ title: 'Test', maturity_level: 'poc' });
    expect(out.title).toBe('Test');
    expect(out.maturity_level).toBe('POC');
  });
});
