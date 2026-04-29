/**
 * Shared Zod schema + types for the Enterprise Agreement editor.
 * Lives outside the component file so the split sub-components
 * (commercial / overrides / feature gates) share one type definition.
 */

import { z } from 'zod';
import type { EnterpriseAgreement } from '@/hooks/queries/useEnterpriseAgreement';

export const agreementFormSchema = z.object({
  organization_id: z.string().uuid(),
  tier_id: z.string().uuid('Select an Enterprise tier'),
  acv_amount: z.coerce.number().nonnegative().nullable(),
  currency_code: z.string().length(3, 'ISO 4217 (3 letters)').toUpperCase(),
  billing_cadence: z.enum(['annual', 'multi_year', 'custom']),
  contract_start_date: z.string().nullable(),
  contract_end_date: z.string().nullable(),
  max_challenges_override: z.coerce.number().int().positive().nullable(),
  max_users_override: z.coerce.number().int().positive().nullable(),
  max_storage_gb_override: z.coerce.number().int().positive().nullable(),
  governance_mode_override: z.enum(['QUICK', 'STRUCTURED', 'CONTROLLED']).nullable(),
  msa_document_url: z.string().url('Must be a URL').nullable().or(z.literal('')),
  notes: z.string().max(2000).nullable(),
  feature_gates: z.record(z.boolean()),
});

export type AgreementFormValues = z.infer<typeof agreementFormSchema>;

export function emptyAgreementDefaults(orgId: string): AgreementFormValues {
  return {
    organization_id: orgId,
    tier_id: '',
    acv_amount: null,
    currency_code: 'USD',
    billing_cadence: 'annual',
    contract_start_date: null,
    contract_end_date: null,
    max_challenges_override: null,
    max_users_override: null,
    max_storage_gb_override: null,
    governance_mode_override: null,
    msa_document_url: '',
    notes: null,
    feature_gates: {},
  };
}

export function agreementToFormValues(a: EnterpriseAgreement): AgreementFormValues {
  return {
    organization_id: a.organization_id,
    tier_id: a.tier_id,
    acv_amount: a.acv_amount,
    currency_code: a.currency_code,
    billing_cadence: (a.billing_cadence as AgreementFormValues['billing_cadence']) ?? 'annual',
    contract_start_date: a.contract_start_date,
    contract_end_date: a.contract_end_date,
    max_challenges_override: a.max_challenges_override,
    max_users_override: a.max_users_override,
    max_storage_gb_override: a.max_storage_gb_override,
    governance_mode_override:
      (a.governance_mode_override as AgreementFormValues['governance_mode_override']) ?? null,
    msa_document_url: a.msa_document_url ?? '',
    notes: a.notes,
    feature_gates: (a.feature_gates ?? {}) as Record<string, boolean>,
  };
}
