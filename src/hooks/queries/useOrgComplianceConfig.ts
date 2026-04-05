/**
 * useOrgComplianceConfig — CRUD hook for org_compliance_config.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { handleQueryError, handleMutationError } from '@/lib/errorHandler';
import { withCreatedBy, withUpdatedBy } from '@/lib/auditFields';
import { toast } from 'sonner';

const QUERY_KEY = 'org-compliance-config';

export interface OrgComplianceConfigRow {
  id: string;
  organization_id: string;
  tenant_id: string;
  export_control_enabled: boolean;
  controlled_technology_default: boolean;
  data_residency_country: string | null;
  gdpr_dpa_auto_attach: boolean;
  sanctions_screening_level: string;
  compliance_officer_email: string | null;
}

const SELECT_COLS = 'id, organization_id, tenant_id, export_control_enabled, controlled_technology_default, data_residency_country, gdpr_dpa_auto_attach, sanctions_screening_level, compliance_officer_email';

export function useOrgComplianceConfig(organizationId: string) {
  return useQuery<OrgComplianceConfigRow | null>({
    queryKey: [QUERY_KEY, organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('org_compliance_config')
        .select(SELECT_COLS)
        .eq('organization_id', organizationId)
        .maybeSingle();
      if (error) { handleQueryError(error, { operation: 'fetch_org_compliance' }); return null; }
      return data as OrgComplianceConfigRow | null;
    },
    enabled: !!organizationId,
    staleTime: 5 * 60_000,
  });
}

export interface OrgComplianceInput {
  organization_id: string;
  tenant_id: string;
  export_control_enabled?: boolean;
  controlled_technology_default?: boolean;
  data_residency_country?: string;
  gdpr_dpa_auto_attach?: boolean;
  sanctions_screening_level?: string;
  compliance_officer_email?: string;
}

export function useUpsertOrgComplianceConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: OrgComplianceInput) => {
      const { data: existing } = await supabase
        .from('org_compliance_config')
        .select('id')
        .eq('organization_id', input.organization_id)
        .maybeSingle();

      if (existing) {
        const payload = await withUpdatedBy(input);
        const { error } = await supabase.from('org_compliance_config').update(payload).eq('id', existing.id);
        if (error) throw error;
      } else {
        const payload = await withCreatedBy({ ...input, is_active: true });
        const { error } = await supabase.from('org_compliance_config').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_d, v) => { qc.invalidateQueries({ queryKey: [QUERY_KEY, v.organization_id] }); toast.success('Compliance config saved'); },
    onError: (e) => handleMutationError(e, { operation: 'upsert_org_compliance' }),
  });
}
