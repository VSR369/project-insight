import { describe, it, expect, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { isBelowMinimumMode } from '../minimumModeService';

describe('DEF-0144 mode choices', () => {
  it('blocks Express when the minimum is Structured', () => expect(isBelowMinimumMode('QUICK', 'STRUCTURED')).toBe(true));
  it('blocks Express and Structured when the minimum is High-Rigor', () => {
    expect(isBelowMinimumMode('QUICK', 'CONTROLLED')).toBe(true);
    expect(isBelowMinimumMode('STRUCTURED', 'CONTROLLED')).toBe(true);
  });
  it('allows the minimum mode itself and higher', () => {
    expect(isBelowMinimumMode('STRUCTURED', 'STRUCTURED')).toBe(false);
    expect(isBelowMinimumMode('CONTROLLED', 'STRUCTURED')).toBe(false);
  });
  it('blocks nothing before a draft exists', () => expect(isBelowMinimumMode('QUICK', null)).toBe(false));
});
