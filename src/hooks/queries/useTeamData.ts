import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';

/**
 * Fetch org users for a given organization
 */
export function useOrgUsers(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['org-users', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('org_users')
        .select('id, user_id, role, is_active, joined_at, invitation_status, org_role_id, subsidiary_org_id, created_at')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('joined_at', { ascending: true });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!organizationId,
    staleTime: 30 * 1000,
  });
}

/**
 * Fetch org roles for a tenant
 */
export function useOrgRoles(tenantId: string | undefined) {
  return useQuery({
    queryKey: ['org-roles', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('org_roles')
        .select('id, name, code, description, is_system_role, is_active, permissions, display_order')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('display_order');
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Invite a user to the organization
 */
export function useInviteOrgUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      tenantId: string;
      organizationId: string;
      userId: string;
      role: string;
      orgRoleId?: string;
    }) => {
      const { data, error } = await supabase
        .from('org_users')
        .insert({
          tenant_id: params.tenantId,
          organization_id: params.organizationId,
          user_id: params.userId,
          role: params.role,
          org_role_id: params.orgRoleId ?? null,
          invitation_status: 'active',
          invited_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['org-users', vars.organizationId] });
      toast.success('Team member added successfully');
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'invite_org_user' });
    },
  });
}

/**
 * Update a user's role
 */
export function useUpdateOrgUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; role: string; orgRoleId?: string; organizationId: string }) => {
      const { error } = await supabase
        .from('org_users')
        .update({ role: params.role, org_role_id: params.orgRoleId ?? null, updated_at: new Date().toISOString() })
        .eq('id', params.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['org-users', vars.organizationId] });
      toast.success('Role updated successfully');
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'update_org_user_role' });
    },
  });
}

/**
 * Deactivate a user from the organization
 */
export function useDeactivateOrgUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; organizationId: string }) => {
      const { error } = await supabase
        .from('org_users')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', params.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['org-users', vars.organizationId] });
      toast.success('Team member removed');
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'deactivate_org_user' });
    },
  });
}

/**
 * Create a custom org role (Premium only)
 */
export function useCreateOrgRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      tenantId: string;
      name: string;
      code: string;
      description?: string;
      permissions: Record<string, boolean>;
    }) => {
      const { data, error } = await supabase
        .from('org_roles')
        .insert({
          tenant_id: params.tenantId,
          name: params.name,
          code: params.code,
          description: params.description ?? null,
          permissions: params.permissions,
          is_system_role: false,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['org-roles', vars.tenantId] });
      toast.success('Custom role created');
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'create_org_role' });
    },
  });
}
