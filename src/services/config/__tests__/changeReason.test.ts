import { describe, it, expect } from 'vitest';
import { resolveReasonLimits, validateChangeReason } from '../changeReason';

describe('settings change reason (DEF-0533)', () => {
  const limits = { min: 10, max: 500 };

  it('rejects a reason shorter than 10 characters', () => {
    expect(validateChangeReason('too short', limits)).toMatch('10 to 500');
  });

  it('rejects a blank reason padded with spaces', () => {
    expect(validateChangeReason('           ', limits)).not.toBeNull();
  });

  it('accepts a 10-character reason', () => {
    expect(validateChangeReason('0123456789', limits)).toBeNull();
  });

  it('rejects a reason longer than 500 characters', () => {
    expect(validateChangeReason('x'.repeat(501), limits)).not.toBeNull();
  });

  it('reads the limits from the settings register', () => {
    const l = resolveReasonLimits([
      { param_key: 'config_change_reason_min_length', param_value: '20' },
      { param_key: 'config_change_reason_max_length', param_value: '300' },
    ]);
    expect(l).toEqual({ min: 20, max: 300 });
    expect(validateChangeReason('fifteen chars!!', l)).not.toBeNull();
  });

  it('falls back to 10 and 500 when the settings are missing', () => {
    expect(resolveReasonLimits(undefined)).toEqual({ min: 10, max: 500 });
  });
});
