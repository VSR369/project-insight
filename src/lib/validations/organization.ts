/**
 * Organization Validation Schema
 * 
 * Shared validation schema for organization data used across enrollment and profile flows.
 * Centralizes validation rules to prevent duplication and ensure consistency.
 */

import { z } from 'zod';

// Organization form validation schema
export const organizationSchema = z.object({
  org_name: z.string().min(2, 'Organization name must be at least 2 characters'),
  org_type_id: z.string().min(1, 'Please select an organization type'),
  org_website: z.string().url('Please enter a valid website URL').or(z.literal('')).optional(),
  designation: z.string().min(2, 'Designation must be at least 2 characters'),
  manager_name: z.string().min(2, 'Manager name must be at least 2 characters'),
  manager_email: z.string().email('Please enter a valid email address'),
  manager_phone: z.string().min(10, 'Please enter a valid phone number').optional().or(z.literal('')),
});

export type OrganizationFormData = z.infer<typeof organizationSchema>;

// Validation rules documentation
export const ORGANIZATION_VALIDATION_RULES = {
  org_name: {
    minLength: 2,
    maxLength: 200,
    required: true,
  },
  org_type_id: {
    required: true,
  },
  org_website: {
    required: false,
    format: 'URL',
  },
  designation: {
    minLength: 2,
    maxLength: 100,
    required: true,
  },
  manager_name: {
    minLength: 2,
    maxLength: 100,
    required: true,
  },
  manager_email: {
    required: true,
    format: 'email',
  },
  manager_phone: {
    minLength: 10,
    maxLength: 20,
    required: false,
  },
} as const;
