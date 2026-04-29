/**
 * useOrgBillingInfo — CRUD on `seeker_billing_info` (the registered billing
 * entity, address, PO number, and tax ID for an org).
 *
 * Read returns the active row (or null). Upsert performs an insert if none
 * exists yet, otherwise an update.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { withCreatedBy, withUpdatedBy } from '@/lib/auditFields';
import { handleMutationError, handleQueryError } from '@/lib/errorHandler';
import { toast } from 'sonner';

const SELECT_COLS =
  'id, organization_id, tenant_id, billing_entity_name, billing_email, ' +
  'billing_address_line1, billing_address_line2, billing_city, billing_postal_code, ' +
  'billing_country_id, billing_state_province_id, po_number, tax_id, tax_id_verified, ' +
  'billing_verification_status';

export interface OrgBillingInfoRow {
  id: string;
  organization_id: string;
  tenant_id: string;
  billing_entity_name: string | null;
  billing_email: string | null;
  billing_address_line1: string | null;
  billing_address_line2: string | null;
  billing_city: string | null;
  billing_postal_code: string | null;
  billing_country_id: string | null;
  billing_state_province_id: string | null;
  po_number: string | null;
  tax_id: string | null;
  tax_id_verified: boolean;
  billing_verification_status: string;
}

export function useOrgBillingInfo(organizationId: string | null | undefined) {
  return useQuery({
    queryKey: ['org_billing_info', organizationId],
    queryFn: async (): Promise<OrgBillingInfoRow | null> => {
      if (!organizationId) return null;
      const { data, error } = await supabase
        .from('seeker_billing_info')
        .select(SELECT_COLS)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .maybeSingle();
      if (error) {
        handleQueryError(error, { operation: 'fetch_org_billing_info' });
        return null;
      }
      return data as unknown as OrgBillingInfoRow | null;
    },
    enabled: !!organizationId,
    staleTime: 60 * 1000,
  });
}

export interface OrgBillingInfoInput {
  organization_id: string;
  tenant_id: string;
  billing_entity_name?: string | null;
  billing_email?: string | null;
  billing_address_line1?: string | null;
  billing_address_line2?: string | null;
  billing_city?: string | null;
  billing_postal_code?: string | null;
  po_number?: string | null;
  tax_id?: string | null;
}

export function useUpsertOrgBillingInfo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: OrgBillingInfoInput) => {
      const { data: existing } = await supabase
        .from('seeker_billing_info')
        .select('id')
        .eq('organization_id', input.organization_id)
        .eq('is_active', true)
        .maybeSingle();
      if (existing) {
        const payload = await withUpdatedBy(input);
        const { error } = await supabase
          .from('seeker_billing_info')
          .update(payload)
          .eq('id', existing.id);
        if (error) throw new Error(error.message);
      } else {
        const payload = await withCreatedBy({ ...input, is_active: true });
        const { error } = await supabase.from('seeker_billing_info').insert(payload);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['org_billing_info', v.organization_id] });
      toast.success('Billing information saved');
    },
    onError: (e) =>
      handleMutationError(e, { operation: 'upsert_org_billing_info', component: 'BillingInfoCard' }),
  });
}
