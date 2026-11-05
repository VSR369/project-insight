import { describe, expect, it } from 'vitest';
import { resolveConfigNumber } from '../configNumber';

describe('resolveConfigNumber', () => {
  it('uses the register value when present', () => {
    expect(resolveConfigNumber('return_reason_min_length', '25')).toBe(25);
  });

  it('falls back to the seeded 10-character return reason minimum when missing', () => {
    expect(resolveConfigNumber('return_reason_min_length', null)).toBe(10);
  });

  it('falls back to the seeded 7-day creator timeout on invalid text', () => {
    expect(resolveConfigNumber('creator_response_timeout_days', 'seven')).toBe(7);
  });

  it('rejects negative values and keeps the 100-character cancel minimum', () => {
    expect(resolveConfigNumber('cancel_reason_min_length', '-5')).toBe(100);
  });

  it('accepts zero (e.g. commentary not required)', () => {
    expect(resolveConfigNumber('screening_commentary_min_length', '0')).toBe(0);
  });
});
