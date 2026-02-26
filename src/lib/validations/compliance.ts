/**
 * Compliance Validation Schema (REG-003)
 * 
 * Zod schema for Step 3: Tax ID, export control, ITAR, data residency.
 * Business Rules: BR-REG-008 (Tax ID format), BR-REG-009 (Export Control)
 */

import { z } from 'zod';

export const complianceSchema = z.object({
  export_control_status_id: z.string().min(1, 'Export control status is required'),
  itar_certified: z.boolean().default(false),
  itar_certification_expiry: z.string().optional(),
  data_residency_id: z.string().optional(),
  gdpr_compliant: z.boolean().default(false),
  hipaa_compliant: z.boolean().default(false),
  soc2_compliant: z.boolean().default(false),
  iso27001_certified: z.boolean().default(false),
  compliance_notes: z.string().max(500, 'Notes must be 500 characters or less').optional(),
  nda_preference: z.enum(['standard_platform_nda', 'custom_nda']).default('standard_platform_nda'),
}).refine(
  (data) => {
    if (data.itar_certified && !data.itar_certification_expiry) {
      return false;
    }
    return true;
  },
  {
    message: 'ITAR certification expiry date is required when ITAR certified',
    path: ['itar_certification_expiry'],
  }
);

export type ComplianceFormValues = z.infer<typeof complianceSchema>;
