/**
 * Billing Validation Schema (REG-005)
 * 
 * Zod schema for Step 5: Payment method, billing address, terms acceptance.
 * Business Rules: BR-REG-016, BR-SAAS-001/003, BR-ZFE-001
 */

import { z } from 'zod';

export const billingSchema = z.object({
  billing_entity_name: z.string().min(1, 'Billing entity name is required').max(200),
  billing_email: z.string().email('Invalid email address'),
  billing_address_line1: z.string().min(1, 'Address is required').max(200),
  billing_address_line2: z.string().max(200).optional(),
  billing_city: z.string().min(1, 'City is required').max(100),
  billing_state_province_id: z.string().optional(),
  billing_country_id: z.string().min(1, 'Country is required'),
  billing_postal_code: z.string().min(1, 'Postal code is required').max(20),
  payment_method: z.enum(['credit_card', 'ach_bank_transfer', 'wire_transfer', 'shadow']),
  po_number: z.string().max(50).optional(),
  tax_id: z.string().max(50).optional(),
  terms_accepted: z.boolean().refine((val) => val === true, {
    message: 'You must accept the Terms & Conditions',
  }),
});

export type BillingFormValues = z.infer<typeof billingSchema>;
