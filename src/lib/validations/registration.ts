/**
 * Registration Validation Schema
 * 
 * Shared validation schema for provider registration data used across enrollment and profile flows.
 * Centralizes validation rules to prevent duplication and ensure consistency.
 */

import { z } from 'zod';

// Registration form validation schema
export const registrationSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(50, 'First name must be 50 characters or less'),
  last_name: z.string().min(1, 'Last name is required').max(50, 'Last name must be 50 characters or less'),
  address: z.string().min(1, 'Address is required').max(200, 'Address must be 200 characters or less'),
  pin_code: z.string().min(1, 'Pin code is required').max(20, 'Pin code must be 20 characters or less'),
  country_id: z.string().min(1, 'Please select a country'),
  industry_segment_id: z.string().min(1, 'Please select an industry segment'),
});

export type RegistrationFormData = z.infer<typeof registrationSchema>;

// Validation rules documentation
export const REGISTRATION_VALIDATION_RULES = {
  first_name: {
    minLength: 1,
    maxLength: 50,
    required: true,
  },
  last_name: {
    minLength: 1,
    maxLength: 50,
    required: true,
  },
  address: {
    minLength: 1,
    maxLength: 200,
    required: true,
  },
  pin_code: {
    minLength: 1,
    maxLength: 20,
    required: true,
    // Note: Pin code validation is country-specific and handled separately
  },
  country_id: {
    required: true,
  },
  industry_segment_id: {
    required: true,
  },
} as const;

// Country-specific pin code patterns
export const PIN_CODE_PATTERNS: Record<string, { pattern: RegExp; message: string }> = {
  IN: {
    pattern: /^[1-9][0-9]{5}$/,
    message: 'Indian pin code must be 6 digits and cannot start with 0',
  },
  US: {
    pattern: /^\d{5}(-\d{4})?$/,
    message: 'US zip code must be 5 digits or 5+4 format (e.g., 12345 or 12345-6789)',
  },
  GB: {
    pattern: /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i,
    message: 'Please enter a valid UK postcode',
  },
  // Default pattern for other countries
  DEFAULT: {
    pattern: /^[A-Za-z0-9\s-]{3,20}$/,
    message: 'Please enter a valid postal code',
  },
};

/**
 * Validate pin code based on country code
 */
export function validatePinCode(pinCode: string, countryCode?: string): { valid: boolean; message?: string } {
  if (!pinCode.trim()) {
    return { valid: false, message: 'Pin code is required' };
  }

  const patternConfig = countryCode && PIN_CODE_PATTERNS[countryCode] 
    ? PIN_CODE_PATTERNS[countryCode] 
    : PIN_CODE_PATTERNS.DEFAULT;

  if (!patternConfig.pattern.test(pinCode)) {
    return { valid: false, message: patternConfig.message };
  }

  return { valid: true };
}
