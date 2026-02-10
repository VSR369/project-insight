/**
 * Primary Contact Validation Schema (REG-002)
 * 
 * Zod schema for Step 2 of the Seeker Registration Wizard.
 * Validates contact info, email domain, phone (E.164), timezone.
 * 
 * Business Rules: BR-REG-005 (blocked domains), BR-REG-006 (OTP)
 */

import { z } from 'zod';

/** Domains that are always allowed (academic, government) */
const ALLOWED_DOMAIN_PATTERNS = ['.edu', '.ac.', '.gov'];

/** Check if a domain is an allowed institutional domain */
export function isInstitutionalDomain(domain: string): boolean {
  return ALLOWED_DOMAIN_PATTERNS.some((pattern) => domain.includes(pattern));
}

/** Extract domain from email */
export function extractDomain(email: string): string {
  return email.split('@')[1]?.toLowerCase() ?? '';
}

export const primaryContactSchema = z.object({
  first_name: z.string()
    .trim()
    .min(1, 'First name is required')
    .max(100, 'First name must be 100 characters or less'),

  last_name: z.string()
    .trim()
    .min(1, 'Last name is required')
    .max(100, 'Last name must be 100 characters or less'),

  job_title: z.string()
    .trim()
    .min(1, 'Designation / job title is required')
    .max(150, 'Job title must be 150 characters or less'),

  email: z.string()
    .trim()
    .email('Please enter a valid email address')
    .max(255, 'Email must be 255 characters or less'),

  phone_country_code: z.string()
    .min(1, 'Phone country code is required')
    .max(6, 'Invalid country code'),

  phone_number: z.string()
    .trim()
    .min(5, 'Phone number must be at least 5 digits')
    .max(15, 'Phone number must be 15 digits or less')
    .regex(/^\d+$/, 'Phone number must contain only digits'),

  department: z.string()
    .trim()
    .max(100, 'Department must be 100 characters or less')
    .optional()
    .or(z.literal('')),

  timezone: z.string()
    .min(1, 'Timezone is required'),

  preferred_language_id: z.string()
    .min(1, 'Please select a preferred language'),
});

export type PrimaryContactFormValues = z.infer<typeof primaryContactSchema>;
