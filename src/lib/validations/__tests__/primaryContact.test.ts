/**
 * Phase 10e — Tests for the env-flagged registration OTP gate.
 *
 * `isRegistrationOtpEnabled()` reads `import.meta.env.VITE_ENABLE_REGISTRATION_OTP`
 * at call-time, and `primaryContactSchema` reads the helper at parse-time, so
 * we can flip the env between cases via `vi.stubEnv`.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { isRegistrationOtpEnabled } from '@/lib/featureFlags';
import {
  primaryContactSchema,
  isInstitutionalDomain,
  extractDomain,
} from '@/lib/validations/primaryContact';

const validBase = {
  first_name: 'Jane',
  last_name: 'Smith',
  job_title: 'Director',
  email: 'jane@acme.com',
  phone_country_code: '+1',
  phone_number: '5551234567',
  department: '',
  department_functional_area_id: '',
  timezone: 'UTC',
  preferred_language_id: 'en',
  password: 'Aa1!aaaa',
  confirm_password: 'Aa1!aaaa',
};

describe('featureFlags.isRegistrationOtpEnabled', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('returns false when VITE_ENABLE_REGISTRATION_OTP is unset', () => {
    vi.stubEnv('VITE_ENABLE_REGISTRATION_OTP', '');
    expect(isRegistrationOtpEnabled()).toBe(false);
  });

  it('returns false when set to "false"', () => {
    vi.stubEnv('VITE_ENABLE_REGISTRATION_OTP', 'false');
    expect(isRegistrationOtpEnabled()).toBe(false);
  });

  it('returns true only when set exactly to "true"', () => {
    vi.stubEnv('VITE_ENABLE_REGISTRATION_OTP', 'true');
    expect(isRegistrationOtpEnabled()).toBe(true);
  });

  it('returns false for truthy-but-not-"true" values (no string coercion)', () => {
    vi.stubEnv('VITE_ENABLE_REGISTRATION_OTP', '1');
    expect(isRegistrationOtpEnabled()).toBe(false);
    vi.stubEnv('VITE_ENABLE_REGISTRATION_OTP', 'TRUE');
    expect(isRegistrationOtpEnabled()).toBe(false);
  });
});

describe('primaryContactSchema — OTP gate OFF (dev/preview default)', () => {
  beforeEach(() => vi.stubEnv('VITE_ENABLE_REGISTRATION_OTP', 'false'));
  afterEach(() => vi.unstubAllEnvs());

  it('accepts is_email_verified=false (no OTP enforcement)', () => {
    const r = primaryContactSchema.safeParse({ ...validBase, is_email_verified: false });
    expect(r.success).toBe(true);
  });

  it('defaults is_email_verified to true when omitted', () => {
    const r = primaryContactSchema.safeParse(validBase);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.is_email_verified).toBe(true);
  });
});

describe('primaryContactSchema — OTP gate ON (production cutover)', () => {
  beforeEach(() => vi.stubEnv('VITE_ENABLE_REGISTRATION_OTP', 'true'));
  afterEach(() => vi.unstubAllEnvs());

  it('rejects is_email_verified=false with the gate message', () => {
    const r = primaryContactSchema.safeParse({ ...validBase, is_email_verified: false });
    expect(r.success).toBe(false);
    if (!r.success) {
      const fieldErrors = r.error.flatten().fieldErrors;
      expect(fieldErrors.is_email_verified?.[0]).toMatch(/verification required/i);
    }
  });

  it('accepts is_email_verified=true', () => {
    const r = primaryContactSchema.safeParse({ ...validBase, is_email_verified: true });
    expect(r.success).toBe(true);
  });

  it('still enforces password match independent of the OTP gate', () => {
    const r = primaryContactSchema.safeParse({
      ...validBase,
      is_email_verified: true,
      confirm_password: 'Bb2!bbbb',
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.flatten().fieldErrors.confirm_password?.[0]).toMatch(/don't match/i);
    }
  });
});

describe('primaryContact — domain helpers', () => {
  it('extractDomain lowercases and parses domain from email', () => {
    expect(extractDomain('Jane@ACME.com')).toBe('acme.com');
    expect(extractDomain('no-at-sign')).toBe('');
  });

  it('isInstitutionalDomain matches .edu / .ac. / .gov substrings', () => {
    expect(isInstitutionalDomain('mit.edu')).toBe(true);
    expect(isInstitutionalDomain('cam.ac.uk')).toBe(true);
    expect(isInstitutionalDomain('agency.gov')).toBe(true);
    expect(isInstitutionalDomain('acme.com')).toBe(false);
    expect(isInstitutionalDomain('gmail.com')).toBe(false);
  });
});
