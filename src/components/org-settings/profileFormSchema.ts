/**
 * Shared Zod schema + types for the org Profile editor.
 * Lives outside the component so the new ProfileExtraFieldsSection
 * can share the same form type without circular imports.
 */

import { z } from 'zod';

export const profileFormSchema = z.object({
  organization_name: z.string().min(2, 'Organization name must be at least 2 characters').max(200),
  trade_brand_name: z.string().max(200).optional().or(z.literal('')),
  website_url: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  linkedin_url: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  organization_description: z.string().max(2000).optional().or(z.literal('')),
  hq_address_line1: z.string().max(255).optional().or(z.literal('')),
  hq_address_line2: z.string().max(255).optional().or(z.literal('')),
  hq_city: z.string().max(100).optional().or(z.literal('')),
  hq_postal_code: z.string().max(20).optional().or(z.literal('')),
  timezone: z.string().max(100).optional().or(z.literal('')),
  employee_count_range: z.string().max(20).optional().or(z.literal('')),
  annual_revenue_range: z.string().max(20).optional().or(z.literal('')),
  registration_number: z.string().max(100).optional().or(z.literal('')),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;

export const PROFILE_FORM_DEFAULTS: ProfileFormValues = {
  organization_name: '',
  trade_brand_name: '',
  website_url: '',
  linkedin_url: '',
  organization_description: '',
  hq_address_line1: '',
  hq_address_line2: '',
  hq_city: '',
  hq_postal_code: '',
  timezone: '',
  employee_count_range: '',
  annual_revenue_range: '',
  registration_number: '',
};
