/**
 * useOrgCustomFields — CRUD hook for org_custom_fields.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { handleQueryError, handleMutationError } from '@/lib/errorHandler';
import { withCreatedBy, withUpdatedBy } from '@/lib/auditFields';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

const QUERY_KEY = 'org-custom-fields';

export interface OrgCustomFieldRow {
  id: string;
  organization_id: string;
  tenant_id: string;
  field_name: string;
  field_label: string;
  field_type: string;
  is_required: boolean;
  select_options: Json | null;
  display_order: number;
  applies_to_mode: string;
  is_active: boolean;
}

const SELECT_COLS = 'id, organization_id, tenant_id, field_name, field_label, field_type, is_required, select_options, display_order, applies_to_mode, is_active';

export function useOrgCustomFields(organizationId: string) {
  return useQuery<OrgCustomFieldRow[]>({
    queryKey: [QUERY_KEY, organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('org_custom_fields')
        .select(SELECT_COLS)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('display_order');
      if (error) { handleQueryError(error, { operation: 'fetch_org_custom_fields' }); return []; }
      return (data ?? []) as OrgCustomFieldRow[];
    },
    enabled: !!organizationId,
    staleTime: 5 * 60_000,
  });
}

export interface CustomFieldInput {
  organization_id: string;
  tenant_id: string;
  field_name: string;
  field_label: string;
  field_type?: string;
  is_required?: boolean;
  select_options?: Json;
  display_order?: number;
  applies_to_mode?: string;
}

export function useCreateOrgCustomField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CustomFieldInput) => {
      const payload = await withCreatedBy(input);
      const { error } = await supabase.from('org_custom_fields').insert(payload);
      if (error) throw error;
    },
    onSuccess: (_d, v) => { qc.invalidateQueries({ queryKey: [QUERY_KEY, v.organization_id] }); toast.success('Custom field created'); },
    onError: (e) => handleMutationError(e, { operation: 'create_custom_field' }),
  });
}

export function useUpdateOrgCustomField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, organization_id, ...updates }: Partial<CustomFieldInput> & { id: string; organization_id: string }) => {
      const payload = await withUpdatedBy(updates);
      const { error } = await supabase.from('org_custom_fields').update(payload).eq('id', id);
      if (error) throw error;
      return organization_id;
    },
    onSuccess: (orgId) => { qc.invalidateQueries({ queryKey: [QUERY_KEY, orgId] }); toast.success('Custom field updated'); },
    onError: (e) => handleMutationError(e, { operation: 'update_custom_field' }),
  });
}

export function useDeleteOrgCustomField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, organizationId }: { id: string; organizationId: string }) => {
      const { error } = await supabase.from('org_custom_fields').update({ is_active: false }).eq('id', id);
      if (error) throw error;
      return organizationId;
    },
    onSuccess: (orgId) => { qc.invalidateQueries({ queryKey: [QUERY_KEY, orgId] }); toast.success('Custom field removed'); },
    onError: (e) => handleMutationError(e, { operation: 'delete_custom_field' }),
  });
}
