/**
 * Organization Identity Validation Schema (REG-001)
 * 
 * Zod schema for Step 1 of the Seeker Registration Wizard.
 * Validates all 14 fields per tech spec REG-ALL.
 */

import { z } from 'zod';
import type { CompanySizeRange, AnnualRevenueRange } from '@/types/registration';

const COMPANY_SIZE_VALUES: CompanySizeRange[] = ['1-10', '11-50', '51-200', '201-1000', '1001-5000', '5001+'];
const REVENUE_VALUES: AnnualRevenueRange[] = ['<1M', '1M-10M', '10M-50M', '50M-250M', '250M-1B', '>1B'];

const LEGAL_NAME_REGEX = /^[a-zA-Z0-9\s.,&'\-]+$/;
const currentYear = new Date().getFullYear();

export const organizationIdentitySchema = z.object({
  legal_entity_name: z.string()
    .trim()
    .min(2, 'Legal entity name must be at least 2 characters')
    .max(200, 'Legal entity name must be 200 characters or less')
    .regex(LEGAL_NAME_REGEX, 'Legal entity name contains invalid characters'),

  trade_brand_name: z.string()
    .trim()
    .max(200, 'Brand name must be 200 characters or less')
    .optional()
    .or(z.literal('')),

  organization_type_id: z.string()
    .min(1, 'Please select an organization type'),

  industry_ids: z.array(z.string())
    .min(1, 'Please select at least one industry'),

  company_size_range: z.enum(COMPANY_SIZE_VALUES as [string, ...string[]], {
    errorMap: () => ({ message: 'Please select a company size' }),
  }) as z.ZodType<CompanySizeRange>,

  annual_revenue_range: z.enum(REVENUE_VALUES as [string, ...string[]], {
    errorMap: () => ({ message: 'Please select an annual revenue range' }),
  }) as z.ZodType<AnnualRevenueRange>,

  year_founded: z.coerce.number()
    .int('Year must be a whole number')
    .min(1800, 'Year founded must be 1800 or later')
    .max(currentYear, `Year founded cannot exceed ${currentYear}`),

  hq_country_id: z.string()
    .min(1, 'Please select a headquarters country'),

  state_province_id: z.string()
    .min(1, 'Please select a state/province'),

  city: z.string()
    .trim()
    .min(1, 'City is required')
    .max(100, 'City must be 100 characters or less'),

  operating_geography_ids: z.array(z.string())
    .min(1, 'Please select at least one operating geography'),
});

export type OrganizationIdentityFormValues = z.infer<typeof organizationIdentitySchema>;
