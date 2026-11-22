import { describe, it, expect, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { resolveStageCount, canChooseStageCount, validateDeadlines, validateExtension, extensionErrorMessage } from '../stageDeadlines';

const RULES = { minOpenDays: 14, abstractMinOpenDays: 14, solutionMinOpenDays: 21 };
const day = (n: number) => new Date(Date.UTC(2027, 0, 1 + n));

describe('DEF-0157 stages', () => {
  it('Express is always single-stage', () => expect(resolveStageCount('QUICK', 2)).toBe(1));
  it('High-Rigor is always two-stage', () => expect(resolveStageCount('CONTROLLED', 1)).toBe(2));
  it('Structured uses the Creator choice, default single-stage', () => {
    expect(resolveStageCount('STRUCTURED', 2)).toBe(2);
    expect(resolveStageCount('STRUCTURED', null)).toBe(1);
  });
  it('stage choice is frozen at publication and only offered for Structured', () => {
    expect(canChooseStageCount('STRUCTURED', true)).toBe(false);
    expect(canChooseStageCount('QUICK', false)).toBe(false);
    expect(canChooseStageCount('STRUCTURED', false)).toBe(true);
  });
});

describe('P33 production open periods', () => {
  it('requires 14 days for a single-stage submission window', () => {
    expect(validateDeadlines({ stageCount: 1, startAt: day(0), abstractDeadline: null, solutionDeadline: day(13) }, RULES)).toHaveLength(1);
    expect(validateDeadlines({ stageCount: 1, startAt: day(0), abstractDeadline: null, solutionDeadline: day(14) }, RULES)).toEqual([]);
  });
  it('requires 14 days for abstracts and 21 days for full solutions', () => {
    expect(validateDeadlines({ stageCount: 2, startAt: day(0), abstractDeadline: day(14), solutionDeadline: day(34) }, RULES)).toHaveLength(1);
    expect(validateDeadlines({ stageCount: 2, startAt: day(0), abstractDeadline: day(14), solutionDeadline: day(35) }, RULES)).toEqual([]);
  });
  it('requires an abstract deadline for two stages', () => {
    expect(validateDeadlines({ stageCount: 2, startAt: day(0), abstractDeadline: null, solutionDeadline: day(35) }, RULES)).toHaveLength(1);
  });
});

describe('P34/P35 extensions', () => {
  it('caps one extension at 14 days and never shortens', () => {
    expect(validateExtension(day(10), day(9), 14)).not.toBeNull();
    expect(validateExtension(day(10), day(25), 14)).not.toBeNull();
    expect(validateExtension(day(10), day(24), 14)).toBeNull();
  });
  it('maps the two-extension server refusal', () => {
    expect(extensionErrorMessage(new Error('extension_limit_reached'))).toContain('maximum of 2 times');
  });
  it('maps server refusal for non-Curators', () => {
    expect(extensionErrorMessage(new Error('extension_requires_curator'))).toBe('Only the Curator of this challenge can extend a deadline.');
  });
});
