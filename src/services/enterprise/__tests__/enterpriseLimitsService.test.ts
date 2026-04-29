import { describe, it, expect } from 'vitest';
import {
  resolveLimit,
  isFeatureGateEnabled,
} from '@/services/enterprise/enterpriseLimitsService';

describe('enterpriseLimitsService.resolveLimit', () => {
  it('prefers a positive override over the tier default', () => {
    expect(resolveLimit(500, 50)).toBe(500);
  });

  it('falls back to the tier default when override is null', () => {
    expect(resolveLimit(null, 50)).toBe(50);
  });

  it('falls back to the tier default when override is undefined', () => {
    expect(resolveLimit(undefined, 50)).toBe(50);
  });

  it('ignores zero / negative overrides and uses tier default', () => {
    expect(resolveLimit(0, 50)).toBe(50);
    expect(resolveLimit(-1, 50)).toBe(50);
  });

  it('floors fractional overrides defensively', () => {
    expect(resolveLimit(10.9, 50)).toBe(10);
  });

  it('returns null (unlimited) when both sides are null', () => {
    expect(resolveLimit(null, null)).toBeNull();
  });
});

describe('enterpriseLimitsService.isFeatureGateEnabled', () => {
  it('returns true ONLY for boolean true', () => {
    expect(isFeatureGateEnabled({ sso: true }, 'sso')).toBe(true);
  });

  it('returns false for missing keys', () => {
    expect(isFeatureGateEnabled({ sso: true }, 'white_label')).toBe(false);
  });

  it('returns false for non-boolean truthy values (typo / wrong-type guard)', () => {
    expect(isFeatureGateEnabled({ sso: 'yes' as unknown as boolean }, 'sso')).toBe(false);
    expect(isFeatureGateEnabled({ sso: 1 as unknown as boolean }, 'sso')).toBe(false);
    expect(isFeatureGateEnabled({ sso: 'true' as unknown as boolean }, 'sso')).toBe(false);
  });

  it('handles null / undefined gate maps safely', () => {
    expect(isFeatureGateEnabled(null, 'sso')).toBe(false);
    expect(isFeatureGateEnabled(undefined, 'sso')).toBe(false);
  });
});
