/**
 * useDelegatedAdmins — CRUD hooks for Delegated Seeking Org Admins
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { withCreatedBy, withUpdatedBy } from '@/lib/auditFields';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';

export interface DomainScope {
  industry_segment_ids: string[];
  proficiency_area_ids: string[];
  sub_domain_ids: string[];
  speciality_ids: string[];
  department_ids: string[];
  functional_area_ids: string[];
}

export const EMPTY_SCOPE: DomainScope = {
  industry_segment_ids: [],
  proficiency_area_ids: [],
  sub_domain_ids: [],
  speciality_ids: [],
  department_ids: [],
  functional_area_ids: [],
};

export interface DelegatedAdmin {
  id: string;
  organization_id: string;
  user_id: string | null;
  admin_tier: string;
  status: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  title: string | null;
  domain_scope: DomainScope;
  designation_method: string | null;
  activated_at: string | null;
  created_at: string;
}

// ─── List delegated admins for an org ───
export function useDelegatedAdmins(organizationId?: string) {
  return useQuery({
    queryKey: ['delegated-admins', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('seeking_org_admins')
        .select('id, organization_id, user_id, admin_tier, status, full_name, email, phone, title, domain_scope, designation_method, activated_at, created_at')
        .eq('organization_id', organizationId)
        .eq('admin_tier', 'DELEGATED')
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as DelegatedAdmin[];
    },
    enabled: !!organizationId,
    staleTime: 30_000,
  });
}

// ─── Get current user's admin record (PRIMARY) ───
export function useCurrentSeekerAdmin(organizationId?: string) {
  return useQuery({
    queryKey: ['seeker-admin-current', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const { data, error } = await supabase
        .from('seeking_org_admins')
        .select('id, admin_tier, status, full_name, email')
        .eq('organization_id', organizationId)
        .eq('admin_tier', 'PRIMARY')
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!organizationId,
    staleTime: 60_000,
  });
}

// ─── Get max delegated admins config ───
export function useMaxDelegatedAdmins() {
  return useQuery({
    queryKey: ['mpa-config', 'max_delegated_admins_per_org'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('md_mpa_config')
        .select('param_value')
        .eq('param_key', 'max_delegated_admins_per_org')
        .maybeSingle();
      if (error) throw new Error(error.message);
      return parseInt(data?.param_value ?? '5', 10);
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Create delegated admin ───
export function useCreateDelegatedAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      organization_id: string;
      full_name: string;
      email: string;
      phone: string;
      title?: string;
      domain_scope: DomainScope;
      temp_password: string;
    }) => {
      // 1. Check for duplicate email in this org
      const { data: existing } = await supabase
        .from('seeking_org_admins')
        .select('id')
        .eq('organization_id', params.organization_id)
        .eq('email', params.email)
        .neq('status', 'deactivated')
        .limit(1);

      if (existing && existing.length > 0) {
        throw new Error('An admin with this email already exists in your organization');
      }

      // 2. Insert seeking_org_admins record
      const record = await withCreatedBy({
        organization_id: params.organization_id,
        admin_tier: 'DELEGATED',
        status: 'pending_activation',
        designation_method: 'DELEGATED',
        full_name: params.full_name,
        email: params.email,
        phone: params.phone,
        title: params.title ?? null,
        domain_scope: params.domain_scope,
      });

      const { data: soaRecord, error: soaError } = await supabase
        .from('seeking_org_admins')
        .insert(record as any)
        .select('id')
        .single();
      if (soaError) throw new Error(soaError.message);

      // 3. Create auth user via edge function
      const nameParts = params.full_name.split(' ');
      const { error: efError } = await supabase.functions.invoke('create-org-admin', {
        body: {
          email: params.email,
          password: params.temp_password,
          first_name: nameParts[0] ?? '',
          last_name: nameParts.slice(1).join(' ') ?? '',
          organization_id: params.organization_id,
          tenant_id: params.organization_id,
        },
      });
      if (efError) {
        console.error('create-org-admin failed for delegated admin:', efError);
      }

      // 4. Generate activation link
      const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
      await supabase
        .from('admin_activation_links')
        .insert({
          organization_id: params.organization_id,
          admin_id: soaRecord.id,
          expires_at: expiresAt,
          status: 'pending',
        } as any);

      return soaRecord;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['delegated-admins', variables.organization_id] });
      toast.success(`Delegated Admin created. Activation email sent to ${variables.email}`);
    },
    onError: (error: Error) => handleMutationError(error, { operation: 'create_delegated_admin' }),
  });
}

// ─── Update delegated admin scope ───
export function useUpdateDelegatedAdminScope() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ adminId, organizationId, domain_scope }: {
      adminId: string;
      organizationId: string;
      domain_scope: DomainScope;
    }) => {
      const updateData = await withUpdatedBy({ domain_scope });
      const { error } = await supabase
        .from('seeking_org_admins')
        .update(updateData as any)
        .eq('id', adminId);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['delegated-admins', variables.organizationId] });
      toast.success('Admin scope updated successfully');
    },
    onError: (error: Error) => handleMutationError(error, { operation: 'update_delegated_admin_scope' }),
  });
}

// ─── Deactivate delegated admin ───
export function useDeactivateDelegatedAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ adminId, organizationId }: { adminId: string; organizationId: string }) => {
      const { data, error } = await supabase.functions.invoke('deactivate-delegated-admin', {
        body: { admin_id: adminId },
      });
      if (error) throw error;
      const result = data as { success: boolean; error?: { message: string } };
      if (!result.success) throw new Error(result.error?.message ?? 'Deactivation failed');
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['delegated-admins', variables.organizationId] });
      toast.success('Delegated Admin deactivated');
    },
    onError: (error: Error) => handleMutationError(error, { operation: 'deactivate_delegated_admin' }),
  });
}
