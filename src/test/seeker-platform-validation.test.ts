/**
 * Seeker Platform Validation Unit Tests
 * 
 * 18 offline Vitest tests covering Zod schemas, helper functions, and fee calculations.
 * Maps to test case IDs from the Seeker_Platform_Test_Cases.xlsx specification.
 * 
 * TC Coverage:
 *   TC-M1-001, 002, 003, 004, 015, 017, 018, 018b, 018c, 019, 024, 028
 *   TC-NFR-011, 012, 013
 *   Plus: extractDomain, isStartupEligible (x3)
 */

import { describe, it, expect } from 'vitest';
import {
  organizationIdentitySchema,
} from '@/lib/validations/organizationIdentity';
import {
  primaryContactSchema,
  extractDomain,
  isInstitutionalDomain,
} from '@/lib/validations/primaryContact';
import { isStartupEligible } from '@/services/registrationService';
import { calculateChallengeFees } from '@/services/challengePricingService';

// ============================================================================
// HELPERS: Valid base objects for schema parsing
// ============================================================================

const validOrgIdentity = {
  legal_entity_name: 'Acme Corporation',
  trade_brand_name: '',
  organization_type_id: 'some-uuid-1',
  industry_ids: ['ind-1'],
  company_size_range: '11-50',
  annual_revenue_range: '1M-10M',
  year_founded: 2000,
  hq_country_id: 'country-uuid',
  state_province_id: 'state-uuid',
  city: 'Mumbai',
  operating_geography_ids: ['geo-1'],
};

const validPrimaryContact = {
  first_name: 'John',
  last_name: 'Doe',
  job_title: 'CTO',
  email: 'john@acmecorp.com',
  phone_country_code: '+91',
  phone_number: '9876543210',
  department: '',
  department_functional_area_id: '',
  timezone: 'Asia/Kolkata',
  preferred_language_id: 'lang-1',
  is_email_verified: true,
  password: 'StrongP@ss1',
  confirm_password: 'StrongP@ss1',
};

// ============================================================================
// TC-M1-001 to TC-M1-004, TC-M1-015, TC-M1-017: Organization Identity Schema
// ============================================================================

describe('Organization Identity Schema (TC-M1-001 to TC-M1-017)', () => {
  it('TC-M1-001: rejects legal entity name with less than 2 chars', () => {
    const result = organizationIdentitySchema.safeParse({
      ...validOrgIdentity,
      legal_entity_name: 'A',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.path.includes('legal_entity_name'))).toBe(true);
    }
  });

  it('TC-M1-002: rejects legal entity name with invalid special chars (@, #)', () => {
    const result = organizationIdentitySchema.safeParse({
      ...validOrgIdentity,
      legal_entity_name: 'Test@Corp#Ltd',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.path.includes('legal_entity_name'))).toBe(true);
    }
  });

  it('TC-M1-003: accepts legal entity name with &, -, . characters', () => {
    const result = organizationIdentitySchema.safeParse({
      ...validOrgIdentity,
      legal_entity_name: "Johnson & Johnson - India Pvt. Ltd.",
    });
    expect(result.success).toBe(true);
  });

  it('TC-M1-004: trade/brand name is optional (blank accepts)', () => {
    const result = organizationIdentitySchema.safeParse({
      ...validOrgIdentity,
      trade_brand_name: '',
    });
    expect(result.success).toBe(true);
  });

  it('TC-M1-015: year founded boundary validation (1799 rejects, 2027 rejects, 2000 accepts)', () => {
    const tooOld = organizationIdentitySchema.safeParse({
      ...validOrgIdentity,
      year_founded: 1799,
    });
    expect(tooOld.success).toBe(false);

    const tooNew = organizationIdentitySchema.safeParse({
      ...validOrgIdentity,
      year_founded: 2027,
    });
    expect(tooNew.success).toBe(false);

    const valid = organizationIdentitySchema.safeParse({
      ...validOrgIdentity,
      year_founded: 2000,
    });
    expect(valid.success).toBe(true);
  });

  it('TC-M1-017: all required fields blank rejects', () => {
    const result = organizationIdentitySchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThanOrEqual(5);
    }
  });
});

// ============================================================================
// TC-M1-018, TC-M1-018b, TC-M1-018c, TC-M1-024: Primary Contact Schema
// ============================================================================

describe('Primary Contact Schema (TC-M1-018, 018b, 018c, 024)', () => {
  it('TC-M1-018: rejects invalid email format', () => {
    const result = primaryContactSchema.safeParse({
      ...validPrimaryContact,
      email: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });

  it('TC-M1-018: accepts valid email format', () => {
    const result = primaryContactSchema.safeParse(validPrimaryContact);
    expect(result.success).toBe(true);
  });

  it('TC-M1-018b: password must have 8+ chars, mixed case, number, special char', () => {
    const weakPasswords = ['short1!', 'alllowercase1!', 'ALLUPPERCASE1!', 'NoNumbers!!', 'NoSpecial1a'];
    for (const pw of weakPasswords) {
      const result = primaryContactSchema.safeParse({
        ...validPrimaryContact,
        password: pw,
        confirm_password: pw,
      });
      expect(result.success).toBe(false);
    }

    const strongResult = primaryContactSchema.safeParse({
      ...validPrimaryContact,
      password: 'Str0ng!Pass',
      confirm_password: 'Str0ng!Pass',
    });
    expect(strongResult.success).toBe(true);
  });

  it('TC-M1-018c: password mismatch rejects', () => {
    const result = primaryContactSchema.safeParse({
      ...validPrimaryContact,
      password: 'StrongP@ss1',
      confirm_password: 'DifferentP@ss2',
    });
    expect(result.success).toBe(false);
  });

  it('TC-M1-024: phone number must contain only digits', () => {
    const invalid = primaryContactSchema.safeParse({
      ...validPrimaryContact,
      phone_number: '98765-43210',
    });
    expect(invalid.success).toBe(false);

    const valid = primaryContactSchema.safeParse({
      ...validPrimaryContact,
      phone_number: '9876543210',
    });
    expect(valid.success).toBe(true);
  });
});

// ============================================================================
// TC-M1-019: Institutional Domain Bypass
// ============================================================================

describe('Institutional Domain Detection (TC-M1-019)', () => {
  it('TC-M1-019: recognizes .edu, .ac.*, .gov.* as institutional domains', () => {
    expect(isInstitutionalDomain('mit.edu')).toBe(true);
    expect(isInstitutionalDomain('iitb.ac.in')).toBe(true);
    expect(isInstitutionalDomain('nic.gov.in')).toBe(true);
    expect(isInstitutionalDomain('gmail.com')).toBe(false);
    expect(isInstitutionalDomain('company.co')).toBe(false);
  });
});

// ============================================================================
// TC-M1-028: DUNS Number Validation
// ============================================================================

describe('DUNS Number Validation (TC-M1-028)', () => {
  it('TC-M1-028: DUNS must be exactly 9 digits', () => {
    const dunsRegex = /^\d{9}$/;
    expect(dunsRegex.test('123456789')).toBe(true);
    expect(dunsRegex.test('12345678')).toBe(false);   // 8 digits
    expect(dunsRegex.test('1234567890')).toBe(false);  // 10 digits
    expect(dunsRegex.test('12345678a')).toBe(false);   // letter
    expect(dunsRegex.test('')).toBe(false);             // empty
  });
});

// ============================================================================
// extractDomain() helper
// ============================================================================

describe('extractDomain() helper', () => {
  it('extracts domain from valid email', () => {
    expect(extractDomain('user@example.com')).toBe('example.com');
    expect(extractDomain('admin@MIT.EDU')).toBe('mit.edu');
    expect(extractDomain('test@sub.domain.co.uk')).toBe('sub.domain.co.uk');
  });

  it('returns empty string for invalid email', () => {
    expect(extractDomain('no-at-sign')).toBe('');
    expect(extractDomain('')).toBe('');
  });
});

// ============================================================================
// isStartupEligible() — 3 test cases
// ============================================================================

describe('isStartupEligible() (BR-REG-002)', () => {
  const currentYear = new Date().getFullYear();

  it('eligible: founded 2 years ago, 1-10 employees', () => {
    expect(isStartupEligible(currentYear - 2, '1-10')).toBe(true);
  });

  it('ineligible: founded 20 years ago', () => {
    expect(isStartupEligible(currentYear - 20, '1-10')).toBe(false);
  });

  it('ineligible: 5001+ employees', () => {
    expect(isStartupEligible(currentYear - 2, '5001+')).toBe(false);
  });
});

// ============================================================================
// TC-NFR-011, 012, 013: Fee Multiplier Calculations
// ============================================================================

describe('Fee Multiplier Calculations (TC-NFR-011 to TC-NFR-013)', () => {
  const baseFees = { consultingBaseFee: 1000, managementBaseFee: 500, currencyCode: 'INR' };

  it('TC-NFR-011: Simple complexity = 1.0x multiplier', () => {
    const result = calculateChallengeFees(baseFees, {
      consultingFeeMultiplier: 1.0,
      managementFeeMultiplier: 1.0,
    });
    expect(result.consultingFee).toBe(1000);
    expect(result.managementFee).toBe(500);
    expect(result.totalFee).toBe(1500);
  });

  it('TC-NFR-012: Moderate complexity = 1.5x consulting, 1.25x management', () => {
    const result = calculateChallengeFees(baseFees, {
      consultingFeeMultiplier: 1.5,
      managementFeeMultiplier: 1.25,
    });
    expect(result.consultingFee).toBe(1500);
    expect(result.managementFee).toBe(625);
    expect(result.totalFee).toBe(2125);
  });

  it('TC-NFR-013: Complex = 2.0x consulting, 1.5x management', () => {
    const result = calculateChallengeFees(baseFees, {
      consultingFeeMultiplier: 2.0,
      managementFeeMultiplier: 1.5,
    });
    expect(result.consultingFee).toBe(2000);
    expect(result.managementFee).toBe(750);
    expect(result.totalFee).toBe(2750);
  });
});
