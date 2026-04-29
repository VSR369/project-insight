/**
 * Phase 10f.3 — Country-specific postal code validation.
 *
 * Locks behaviour of validatePinCode + PIN_CODE_PATTERNS so future regex
 * tweaks don't silently break country-specific registration flows.
 */

import { describe, it, expect } from 'vitest';
import { validatePinCode, PIN_CODE_PATTERNS } from '../registration';

describe('validatePinCode — empty / whitespace input', () => {
  it('rejects empty string', () => {
    const result = validatePinCode('');
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/required/i);
  });

  it('rejects whitespace-only string', () => {
    const result = validatePinCode('   ');
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/required/i);
  });
});

describe('validatePinCode — India (IN, 6-digit, no leading zero)', () => {
  it.each([
    ['110001', true],
    ['560001', true],
    ['999999', true],
  ])('accepts %s', (code, valid) => {
    expect(validatePinCode(code, 'IN').valid).toBe(valid);
  });

  it.each([
    ['012345', 'leading zero'],
    ['12345', 'too short'],
    ['1234567', 'too long'],
    ['ABCDEF', 'non-numeric'],
  ])('rejects %s (%s)', (code) => {
    const result = validatePinCode(code, 'IN');
    expect(result.valid).toBe(false);
    expect(result.message).toBeDefined();
  });
});

describe('validatePinCode — United States (US, 5-digit or ZIP+4)', () => {
  it.each([
    '12345',
    '90210',
    '12345-6789',
  ])('accepts %s', (code) => {
    expect(validatePinCode(code, 'US').valid).toBe(true);
  });

  it.each([
    ['1234', 'too short'],
    ['123456', 'too long without dash'],
    ['12345-678', 'invalid +4 segment'],
    ['ABCDE', 'non-numeric'],
  ])('rejects %s (%s)', (code) => {
    expect(validatePinCode(code, 'US').valid).toBe(false);
  });
});

describe('validatePinCode — United Kingdom (GB, alphanumeric postcode)', () => {
  it.each([
    'SW1A 1AA',
    'EC1A 1BB',
    'M1 1AE',
    'B33 8TH',
    'CR2 6XH',
    'DN55 1PT',
    'sw1a 1aa', // case-insensitive
  ])('accepts %s', (code) => {
    expect(validatePinCode(code, 'GB').valid).toBe(true);
  });

  it.each([
    '12345',
    'SW1A',
    'INVALID',
  ])('rejects %s', (code) => {
    expect(validatePinCode(code, 'GB').valid).toBe(false);
  });
});

describe('validatePinCode — DEFAULT fallback (unknown country)', () => {
  it('uses DEFAULT pattern when country code is omitted', () => {
    expect(validatePinCode('12345').valid).toBe(true);
    expect(validatePinCode('AB-123').valid).toBe(true);
  });

  it('uses DEFAULT pattern when country code is unknown', () => {
    // Germany has no dedicated regex in PIN_CODE_PATTERNS — falls back to DEFAULT
    expect(validatePinCode('10115', 'DE').valid).toBe(true);
    expect(validatePinCode('80331', 'XX').valid).toBe(true);
  });

  it('rejects strings shorter than DEFAULT minimum (3 chars)', () => {
    expect(validatePinCode('AB').valid).toBe(false);
  });

  it('rejects strings exceeding DEFAULT maximum (20 chars)', () => {
    expect(validatePinCode('A'.repeat(21)).valid).toBe(false);
  });

  it('rejects characters outside the DEFAULT character class', () => {
    expect(validatePinCode('12345!').valid).toBe(false);
    expect(validatePinCode('123_456').valid).toBe(false);
  });
});

describe('PIN_CODE_PATTERNS — registry shape contract', () => {
  it('exposes IN, US, GB, and DEFAULT entries', () => {
    expect(PIN_CODE_PATTERNS.IN).toBeDefined();
    expect(PIN_CODE_PATTERNS.US).toBeDefined();
    expect(PIN_CODE_PATTERNS.GB).toBeDefined();
    expect(PIN_CODE_PATTERNS.DEFAULT).toBeDefined();
  });

  it('every entry has a RegExp pattern and human-readable message', () => {
    for (const [country, cfg] of Object.entries(PIN_CODE_PATTERNS)) {
      expect(cfg.pattern, `${country} pattern`).toBeInstanceOf(RegExp);
      expect(typeof cfg.message, `${country} message`).toBe('string');
      expect(cfg.message.length, `${country} message length`).toBeGreaterThan(0);
    }
  });
});
