/**
 * useOrgCpaTemplates — CRUD hook for org-level CPA templates (CPA_QUICK, CPA_STRUCTURED, CPA_CONTROLLED).
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { handleQueryError, handleMutationError } from '@/lib/errorHandler';
import { withCreatedBy, withUpdatedBy } from '@/lib/auditFields';
import { toast } from 'sonner';

const QUERY_KEY = 'org-cpa-templates';
const CPA_CODES = ['CPA_QUICK', 'CPA_STRUCTURED', 'CPA_CONTROLLED'];
const SELECT_COLS = 'id, organization_id, tenant_id, document_name, document_code, document_type, description, tier, version, version_status, applies_to_mode, is_mandatory, is_active, template_content, created_at, updated_at';

export interface OrgCpaTemplateRow {
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
  template_content: string | null;
  created_at: string;
  updated_at: string | null;
}

export function useOrgCpaTemplates(organizationId: string) {
  return useQuery<OrgCpaTemplateRow[]>({
    queryKey: [QUERY_KEY, organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('org_legal_document_templates')
        .select(SELECT_COLS)
        .eq('organization_id', organizationId)
        .in('document_code', CPA_CODES)
        .eq('is_active', true)
        .order('document_code', { ascending: true });
      if (error) { handleQueryError(error, { operation: 'fetch_org_cpa_templates' }); return []; }
      return (data ?? []) as OrgCpaTemplateRow[];
    },
    enabled: !!organizationId,
    staleTime: 5 * 60_000,
  });
}

export interface OrgCpaTemplateInput {
  organization_id: string;
  tenant_id: string;
  document_name: string;
  document_code: string;
  document_type?: string;
  description?: string;
  tier?: string;
  version?: string;
  version_status?: string;
  applies_to_mode?: string;
  is_mandatory?: boolean;
  template_content?: string;
}

export function useCreateOrgCpaTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: OrgCpaTemplateInput) => {
      const payload = await withCreatedBy({ ...input, document_type: 'cpa_template', tier: 'challenge' });
      const { error } = await supabase.from('org_legal_document_templates').insert(payload);
      if (error) throw error;
    },
    onSuccess: (_d, v) => { qc.invalidateQueries({ queryKey: [QUERY_KEY, v.organization_id] }); toast.success('CPA template created'); },
    onError: (e) => handleMutationError(e, { operation: 'create_org_cpa_template' }),
  });
}

export function useUpdateOrgCpaTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, organization_id, ...updates }: Partial<OrgCpaTemplateInput> & { id: string; organization_id: string }) => {
      const payload = await withUpdatedBy(updates);
      const { error } = await supabase.from('org_legal_document_templates').update(payload).eq('id', id);
      if (error) throw error;
      return organization_id;
    },
    onSuccess: (orgId) => { qc.invalidateQueries({ queryKey: [QUERY_KEY, orgId] }); toast.success('CPA template updated'); },
    onError: (e) => handleMutationError(e, { operation: 'update_org_cpa_template' }),
  });
}
