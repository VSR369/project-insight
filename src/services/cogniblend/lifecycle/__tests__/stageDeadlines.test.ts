import { describe, it, expect, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { resolveStageCount, canChooseStageCount, validateDeadlines, validateExtension, extensionErrorMessage } from '../stageDeadlines';

const RULES = { minOpenDays: 14, abstractMinOpenDays: 7 };
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

describe('DEF-0036 deadlines', () => {
  it('refuses a solution deadline inside the minimum open period', () => {
    expect(validateDeadlines({ stageCount: 1, startAt: day(0), abstractDeadline: null, solutionDeadline: day(13) }, RULES)).toHaveLength(1);
  });
  it('accepts a single-stage schedule meeting the minimum', () => {
    expect(validateDeadlines({ stageCount: 1, startAt: day(0), abstractDeadline: null, solutionDeadline: day(14) }, RULES)).toEqual([]);
  });
  it('two-stage needs an abstract deadline with gaps either side', () => {
    expect(validateDeadlines({ stageCount: 2, startAt: day(0), abstractDeadline: null, solutionDeadline: day(30) }, RULES)).toHaveLength(1);
    expect(validateDeadlines({ stageCount: 2, startAt: day(0), abstractDeadline: day(25), solutionDeadline: day(30) }, RULES)).toHaveLength(1);
    expect(validateDeadlines({ stageCount: 2, startAt: day(0), abstractDeadline: day(10), solutionDeadline: day(30) }, RULES)).toEqual([]);
  });
  it('extensions cannot shorten and are capped', () => {
    expect(validateExtension(day(10), day(9), 30)).not.toBeNull();
    expect(validateExtension(day(10), day(41), 30)).not.toBeNull();
    expect(validateExtension(day(10), day(40), 30)).toBeNull();
  });
  it('maps server refusal for non-Curators', () => {
    expect(extensionErrorMessage(new Error('extension_requires_curator'))).toBe('Only the Curator of this challenge can extend a deadline.');
  });
});
