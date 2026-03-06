/**
 * Zod schema for Platform Admin profile form (create + edit).
 */

import { z } from 'zod';

export const ADMIN_TIER_OPTIONS = [
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'senior_admin', label: 'Senior Admin' },
  { value: 'admin', label: 'Admin' },
] as const;

export type AdminTierValue = 'supervisor' | 'senior_admin' | 'admin';

export const platformAdminFormSchema = z.object({
  full_name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be 100 characters or less')
    .trim(),
  email: z.string().email('Invalid email address').max(255),
  phone: z.string()
    .min(1, 'Phone number is required')
    .regex(/^\+[1-9]\d{6,14}$/, 'Phone must be in E.164 format (e.g. +1234567890)'),
  is_supervisor: z.boolean().default(false),
  admin_tier: z.enum(['supervisor', 'senior_admin', 'admin']).default('admin'),
  industry_expertise: z.array(z.string().uuid()).min(1, 'At least one industry is required'),
  country_region_expertise: z.array(z.string().uuid()).default([]),
  org_type_expertise: z.array(z.string()).default([]),
  max_concurrent_verifications: z.coerce.number().int().min(1).max(100).default(10),
  assignment_priority: z.coerce.number().int().min(1).max(10).default(5),
});

export type PlatformAdminFormValues = z.infer<typeof platformAdminFormSchema>;
