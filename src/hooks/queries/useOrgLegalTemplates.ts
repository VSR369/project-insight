/**
 * useOrgLegalTemplates — CRUD hook for org_legal_document_templates.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { handleQueryError, handleMutationError } from '@/lib/errorHandler';
import { withCreatedBy, withUpdatedBy } from '@/lib/auditFields';
import { toast } from 'sonner';

const QUERY_KEY = 'org-legal-templates';
const SELECT_COLS = 'id, organization_id, tenant_id, document_name, document_code, document_type, description, tier, version, version_status, applies_to_mode, is_mandatory, is_active, created_at';

export interface OrgLegalTemplateRow {
  id: string;
  organization_id: string;
  tenant_id: string;
  document_name: string;
  document_code: string | null;
  document_type: string;
  description: string | null;
  tier: string;
  version: string;
  version_status: string;
  applies_to_mode: string;
  is_mandatory: boolean;
  is_active: boolean;
  created_at: string;
}

export function useOrgLegalTemplates(organizationId: string) {
  return useQuery<OrgLegalTemplateRow[]>({
    queryKey: [QUERY_KEY, organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('org_legal_document_templates')
        .select(SELECT_COLS)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) { handleQueryError(error, { operation: 'fetch_org_legal_templates' }); return []; }
      return (data ?? []) as OrgLegalTemplateRow[];
    },
    enabled: !!organizationId,
    staleTime: 5 * 60_000,
  });
}

export interface OrgLegalTemplateInput {
  organization_id: string;
  tenant_id: string;
  document_name: string;
  document_code?: string;
  document_type?: string;
  description?: string;
  tier?: string;
  version?: string;
  version_status?: string;
  applies_to_mode?: string;
  is_mandatory?: boolean;
}

export function useCreateOrgLegalTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: OrgLegalTemplateInput) => {
      const payload = await withCreatedBy(input);
      const { error } = await supabase.from('org_legal_document_templates').insert(payload);
      if (error) throw error;
    },
    onSuccess: (_d, v) => { qc.invalidateQueries({ queryKey: [QUERY_KEY, v.organization_id] }); toast.success('Template created'); },
    onError: (e) => handleMutationError(e, { operation: 'create_org_legal_template' }),
  });
}

export function useUpdateOrgLegalTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, organization_id, ...updates }: Partial<OrgLegalTemplateInput> & { id: string; organization_id: string }) => {
      const payload = await withUpdatedBy(updates);
      const { error } = await supabase.from('org_legal_document_templates').update(payload).eq('id', id);
      if (error) throw error;
      return organization_id;
    },
    onSuccess: (orgId) => { qc.invalidateQueries({ queryKey: [QUERY_KEY, orgId] }); toast.success('Template updated'); },
    onError: (e) => handleMutationError(e, { operation: 'update_org_legal_template' }),
  });
}
