/**
 * useOrgFinanceConfig — CRUD hook for org_finance_config.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { handleQueryError, handleMutationError } from '@/lib/errorHandler';
import { withCreatedBy, withUpdatedBy } from '@/lib/auditFields';
import { toast } from 'sonner';

const QUERY_KEY = 'org-finance-config';

export interface OrgFinanceConfigRow {
  id: string;
  organization_id: string;
  tenant_id: string;
  default_bank_name: string | null;
  default_bank_branch: string | null;
  default_bank_address: string | null;
  preferred_escrow_currency: string | null;
  auto_deposit_enabled: boolean;
  budget_approval_url: string | null;
}

const SELECT_COLS = 'id, organization_id, tenant_id, default_bank_name, default_bank_branch, default_bank_address, preferred_escrow_currency, auto_deposit_enabled, budget_approval_url';

export function useOrgFinanceConfig(organizationId: string) {
  return useQuery<OrgFinanceConfigRow | null>({
    queryKey: [QUERY_KEY, organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('org_finance_config')
        .select(SELECT_COLS)
        .eq('organization_id', organizationId)
        .maybeSingle();
      if (error) { handleQueryError(error, { operation: 'fetch_org_finance_config' }); return null; }
      return data as OrgFinanceConfigRow | null;
    },
    enabled: !!organizationId,
    staleTime: 5 * 60_000,
  });
}

export interface OrgFinanceInput {
  organization_id: string;
  tenant_id: string;
  default_bank_name?: string;
  default_bank_branch?: string;
  default_bank_address?: string;
  preferred_escrow_currency?: string;
  auto_deposit_enabled?: boolean;
  budget_approval_url?: string;
}

export function useUpsertOrgFinanceConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: OrgFinanceInput) => {
      const { data: existing } = await supabase
        .from('org_finance_config')
        .select('id')
        .eq('organization_id', input.organization_id)
        .maybeSingle();

      if (existing) {
        const payload = await withUpdatedBy(input);
        const { error } = await supabase.from('org_finance_config').update(payload).eq('id', existing.id);
        if (error) throw error;
      } else {
        const payload = await withCreatedBy(input);
        const { error } = await supabase.from('org_finance_config').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_d, v) => { qc.invalidateQueries({ queryKey: [QUERY_KEY, v.organization_id] }); toast.success('Finance config saved'); },
    onError: (e) => handleMutationError(e, { operation: 'upsert_org_finance_config' }),
  });
}
