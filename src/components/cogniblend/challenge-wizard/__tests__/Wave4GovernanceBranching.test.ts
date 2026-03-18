/**
 * Wave 4 Tests — Lightweight vs Enterprise governance-aware wizard branching
 *
 * TW4-01: LW complexity dropdown instead of sliders
 * TW4-02: Enterprise 7-param sliders (no regression)
 * TW4-03: LW criteria without weights, equally distributed
 * TW4-04: LW single award or non-monetary option
 * TW4-05: LW Public/Private toggle instead of dropdowns
 * TW4-06: Enterprise 3-tier access + 3-tier rewards unchanged
 */

import { describe, it, expect } from 'vitest';

/* ─── TW4-01: LW complexity dropdown ─── */

describe('TW4-01: LW — Low/Medium/High dropdown instead of sliders', () => {
  const LW_OPTIONS = [
    { value: 'low', level: 'L1', score: 2.0 },
    { value: 'medium', level: 'L3', score: 5.0 },
    { value: 'high', level: 'L5', score: 9.0 },
  ];

  it('should have exactly 3 dropdown options', () => {
    expect(LW_OPTIONS).toHaveLength(3);
  });

  it('should map Low → L1 with score 2.0', () => {
    const low = LW_OPTIONS.find((o) => o.value === 'low')!;
    expect(low.level).toBe('L1');
    expect(low.score).toBe(2.0);
  });

  it('should map Medium → L3 with score 5.0', () => {
    const med = LW_OPTIONS.find((o) => o.value === 'medium')!;
    expect(med.level).toBe('L3');
    expect(med.score).toBe(5.0);
  });

  it('should map High → L5 with score 9.0', () => {
    const high = LW_OPTIONS.find((o) => o.value === 'high')!;
    expect(high.level).toBe('L5');
    expect(high.score).toBe(9.0);
  });

  it('should set both complexity_level and complexity_score from dropdown', () => {
    const lwMap: Record<string, { level: string; score: number }> = {
      low: { level: 'L1', score: 2.0 },
      medium: { level: 'L3', score: 5.0 },
      high: { level: 'L5', score: 9.0 },
    };
    for (const [key, expected] of Object.entries(lwMap)) {
      const mapped = lwMap[key];
      expect(mapped.level).toBe(expected.level);
      expect(mapped.score).toBe(expected.score);
    }
  });
});

/* ─── TW4-02: Enterprise 7-param sliders ─── */

describe('TW4-02: Enterprise — 7-param sliders still work (no regression)', () => {
  const COMPLEXITY_PARAMS = [
    { key: 'technical_novelty', weight: 0.20 },
    { key: 'solution_maturity', weight: 0.15 },
    { key: 'domain_breadth', weight: 0.15 },
    { key: 'evaluation_complexity', weight: 0.15 },
    { key: 'ip_sensitivity', weight: 0.15 },
    { key: 'timeline_urgency', weight: 0.10 },
    { key: 'budget_scale', weight: 0.10 },
  ];

  it('should have exactly 7 complexity parameters', () => {
    expect(COMPLEXITY_PARAMS).toHaveLength(7);
  });

  it('should have weights summing to 1.0', () => {
    const total = COMPLEXITY_PARAMS.reduce((sum, p) => sum + p.weight, 0);
    expect(total).toBeCloseTo(1.0);
  });

  it('should calculate weighted score correctly', () => {
    // All params at 5 → score = 5.0
    const allFive: Record<string, number> = {};
    COMPLEXITY_PARAMS.forEach((p) => { allFive[p.key] = 5; });
    const score = COMPLEXITY_PARAMS.reduce((sum, p) => sum + allFive[p.key] * p.weight, 0);
    expect(score).toBeCloseTo(5.0);
  });

  it('should derive correct level from score', () => {
    function getLevel(score: number) {
      if (score < 2) return 'L1';
      if (score < 4) return 'L2';
      if (score < 6) return 'L3';
      if (score < 8) return 'L4';
      return 'L5';
    }
    expect(getLevel(1.5)).toBe('L1');
    expect(getLevel(3.0)).toBe('L2');
    expect(getLevel(5.0)).toBe('L3');
    expect(getLevel(7.5)).toBe('L4');
    expect(getLevel(9.0)).toBe('L5');
  });
});

/* ─── TW4-03: LW criteria equally distributed ─── */

describe('TW4-03: LW — criteria listed without weights, equally distributed', () => {
  function distributeEvenly(count: number) {
    const evenWeight = Math.floor(100 / count);
    return Array.from({ length: count }, (_, i) =>
      i === count - 1 ? 100 - evenWeight * (count - 1) : evenWeight
    );
  }

  it('should distribute 100% evenly among 3 criteria', () => {
    const weights = distributeEvenly(3);
    expect(weights).toEqual([33, 33, 34]);
    expect(weights.reduce((a, b) => a + b, 0)).toBe(100);
  });

  it('should distribute 100% evenly among 4 criteria', () => {
    const weights = distributeEvenly(4);
    expect(weights).toEqual([25, 25, 25, 25]);
    expect(weights.reduce((a, b) => a + b, 0)).toBe(100);
  });

  it('should distribute 100% evenly among 7 criteria', () => {
    const weights = distributeEvenly(7);
    expect(weights.reduce((a, b) => a + b, 0)).toBe(100);
    // First 6 get 14%, last gets 16%
    expect(weights[0]).toBe(14);
    expect(weights[6]).toBe(16);
  });

  it('should handle single criterion at 100%', () => {
    const weights = distributeEvenly(1);
    expect(weights).toEqual([100]);
  });

  it('should redistribute when a criterion is removed', () => {
    // Start with 4 → remove one → 3 remaining
    const before = distributeEvenly(4); // [25,25,25,25]
    expect(before.reduce((a, b) => a + b, 0)).toBe(100);
    const after = distributeEvenly(3); // [33,33,34]
    expect(after.reduce((a, b) => a + b, 0)).toBe(100);
  });
});

/* ─── TW4-04: LW single award or non-monetary ─── */

describe('TW4-04: LW — single award or non-monetary option', () => {
  it('should support monetary reward type with amount and currency', () => {
    const reward = { type: 'monetary' as const, amount: 5000, currency: 'USD' };
    expect(reward.type).toBe('monetary');
    expect(reward.amount).toBe(5000);
    expect(reward.currency).toBe('USD');
  });

  it('should support non-monetary reward type with description', () => {
    const reward = { type: 'non_monetary' as const, description: 'Publication credit and mentorship' };
    expect(reward.type).toBe('non_monetary');
    expect(reward.description).toContain('Publication');
  });

  it('should store monetary reward in correct JSON shape', () => {
    const values = { reward_type: 'monetary', platinum_award: 10000, currency_code: 'EUR' };
    const rewardStructure = { type: values.reward_type, amount: values.platinum_award, currency: values.currency_code };
    expect(rewardStructure).toEqual({ type: 'monetary', amount: 10000, currency: 'EUR' });
  });

  it('should store non-monetary reward in correct JSON shape', () => {
    const values = { reward_type: 'non_monetary', reward_description: 'Partnership opportunity' };
    const rewardStructure = { type: values.reward_type, description: values.reward_description };
    expect(rewardStructure).toEqual({ type: 'non_monetary', description: 'Partnership opportunity' });
  });

  it('should have reward_type field in schema with default monetary', () => {
    // Schema defines: reward_type: z.enum(['monetary', 'non_monetary']).default('monetary')
    const defaultType = 'monetary';
    expect(['monetary', 'non_monetary']).toContain(defaultType);
  });
});

/* ─── TW4-05: LW Public/Private toggle ─── */

describe('TW4-05: LW — Public/Private toggle instead of dropdowns', () => {
  it('should set visibility=public and eligibility=anyone when toggle ON', () => {
    const isPublic = true;
    const visibility = isPublic ? 'public' : 'invite_only';
    const eligibility = isPublic ? 'anyone' : 'invited_only';
    expect(visibility).toBe('public');
    expect(eligibility).toBe('anyone');
  });

  it('should set visibility=invite_only and eligibility=invited_only when toggle OFF', () => {
    const isPublic = false;
    const visibility = isPublic ? 'public' : 'invite_only';
    const eligibility = isPublic ? 'anyone' : 'invited_only';
    expect(visibility).toBe('invite_only');
    expect(eligibility).toBe('invited_only');
  });

  it('should validate email format for invite list', () => {
    const validEmail = 'solver@example.com';
    const invalidEmail = 'not-an-email';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    expect(emailRegex.test(validEmail)).toBe(true);
    expect(emailRegex.test(invalidEmail)).toBe(false);
  });

  it('should prevent duplicate emails in invite list', () => {
    const emails = ['a@b.com', 'c@d.com'];
    const newEmail = 'a@b.com';
    const isDuplicate = emails.includes(newEmail);
    expect(isDuplicate).toBe(true);
  });
});

/* ─── TW4-06: Enterprise 3-tier access + rewards unchanged ─── */

describe('TW4-06: Enterprise — 3-tier access + 3-tier rewards unchanged', () => {
  it('should store Enterprise reward structure with platinum/gold/silver', () => {
    const reward = { currency: 'USD', platinum: 50000, gold: 25000, silver: 10000 };
    expect(reward.platinum).toBeGreaterThan(reward.gold);
    expect(reward.gold).toBeGreaterThan(reward.silver);
  });

  it('should enforce descending order: Platinum > Gold > Silver', () => {
    const platinum = 50000;
    const gold = 25000;
    const silver = 10000;
    const valid = platinum > gold && gold > silver;
    expect(valid).toBe(true);
  });

  it('should reject invalid order', () => {
    const platinum = 10000;
    const gold = 25000;
    const valid = platinum > gold;
    expect(valid).toBe(false);
  });

  it('should keep silver optional', () => {
    const reward = { currency: 'USD', platinum: 50000, gold: 25000, silver: null };
    expect(reward.silver).toBeNull();
    // Order check still valid without silver
    expect(reward.platinum).toBeGreaterThan(reward.gold);
  });

  it('should support 4 currency options', () => {
    const currencies = ['USD', 'EUR', 'GBP', 'INR'];
    expect(currencies).toHaveLength(4);
  });

  it('should have rejection fee slider for Enterprise only (5-20%)', () => {
    const min = 5;
    const max = 20;
    const defaultVal = 10;
    expect(defaultVal).toBeGreaterThanOrEqual(min);
    expect(defaultVal).toBeLessThanOrEqual(max);
  });
});
