/**
 * useOrgGovernanceOverrides — CRUD hook for org_governance_overrides.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { handleQueryError, handleMutationError } from '@/lib/errorHandler';
import { withCreatedBy, withUpdatedBy } from '@/lib/auditFields';
import { toast } from 'sonner';

const QUERY_KEY = 'org-governance-overrides';

export interface OrgGovernanceOverrideRow {
  id: string;
  organization_id: string;
  governance_mode: string;
  legal_review_threshold_override: number | null;
  escrow_deposit_pct_override: number | null;
  curation_checklist_override: number | null;
  is_active: boolean;
}

const SELECT_COLS = 'id, organization_id, governance_mode, legal_review_threshold_override, escrow_deposit_pct_override, curation_checklist_override, is_active';

export function useOrgGovernanceOverrides(organizationId: string) {
  return useQuery<OrgGovernanceOverrideRow[]>({
    queryKey: [QUERY_KEY, organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('org_governance_overrides')
        .select(SELECT_COLS)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('governance_mode');
      if (error) { handleQueryError(error, { operation: 'fetch_org_governance_overrides' }); return []; }
      return (data ?? []) as OrgGovernanceOverrideRow[];
    },
    enabled: !!organizationId,
    staleTime: 5 * 60_000,
  });
}

export interface OverrideInput {
  organization_id: string;
  governance_mode: string;
  legal_review_threshold_override?: number | null;
  escrow_deposit_pct_override?: number | null;
  curation_checklist_override?: number | null;
}

export function useUpsertOrgGovernanceOverride() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: OverrideInput) => {
      const { data: existing } = await supabase
        .from('org_governance_overrides')
        .select('id')
        .eq('organization_id', input.organization_id)
        .eq('governance_mode', input.governance_mode)
        .maybeSingle();

      if (existing) {
        const payload = await withUpdatedBy(input);
        const { error } = await supabase.from('org_governance_overrides').update(payload).eq('id', existing.id);
        if (error) throw error;
      } else {
        const payload = await withCreatedBy({ ...input, is_active: true });
        const { error } = await supabase.from('org_governance_overrides').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_d, v) => { qc.invalidateQueries({ queryKey: [QUERY_KEY, v.organization_id] }); toast.success('Override saved'); },
    onError: (e) => handleMutationError(e, { operation: 'upsert_governance_override' }),
  });
}
