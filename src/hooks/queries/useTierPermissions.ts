/**
 * useTierPermissions — fetches and mutates the tier permission matrix.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TierPermission {
  id: string;
  tier: string;
  permission_key: string;
  is_enabled: boolean;
  updated_at: string | null;
  updated_by: string | null;
}

export interface PermissionAuditEntry {
  id: string;
  permission_key: string;
  tier: string;
  previous_value: boolean | null;
  new_value: boolean;
  changed_by_id: string;
  changed_at: string;
  change_reason: string | null;
  admin_name?: string;
}

export function useTierPermissions() {
  return useQuery({
    queryKey: ['tier-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tier_permissions')
        .select('id, tier, permission_key, is_enabled, updated_at, updated_by')
        .order('permission_key')
        .order('tier');

      if (error) throw new Error(error.message);
      return (data ?? []) as TierPermission[];
    },
    staleTime: 60_000,
    gcTime: 300_000,
  });
}

export function useUpdateTierPermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_enabled }: { id: string; is_enabled: boolean }) => {
      const { error } = await supabase
        .from('tier_permissions')
        .update({ is_enabled })
        .eq('id', id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tier-permissions'] });
      toast.success('Permission updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update permission: ${error.message}`);
    },
  });
}

export function usePermissionAuditLog() {
  return useQuery({
    queryKey: ['tier-permissions-audit'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tier_permissions_audit')
        .select('id, permission_key, tier, previous_value, new_value, changed_by_id, changed_at, change_reason')
        .order('changed_at', { ascending: false })
        .limit(50);

      if (error) throw new Error(error.message);

      // Fetch admin names
      const adminIds = [...new Set((data ?? []).map((d) => d.changed_by_id))];
      let adminMap: Record<string, string> = {};

      if (adminIds.length > 0) {
        const { data: admins } = await supabase
          .from('platform_admin_profiles')
          .select('user_id, full_name')
          .in('user_id', adminIds);

        adminMap = (admins ?? []).reduce((acc, a) => {
          acc[a.user_id] = a.full_name || 'Unknown';
          return acc;
        }, {} as Record<string, string>);
      }

      return (data ?? []).map((entry) => ({
        ...entry,
        admin_name: adminMap[entry.changed_by_id] ?? 'Unknown',
      })) as PermissionAuditEntry[];
    },
    staleTime: 60_000,
    gcTime: 300_000,
  });
}

/** Helper: build a lookup map from the permissions array */
export function buildPermissionMap(permissions: TierPermission[]): Record<string, Record<string, { id: string; is_enabled: boolean }>> {
  const map: Record<string, Record<string, { id: string; is_enabled: boolean }>> = {};
  for (const p of permissions) {
    if (!map[p.permission_key]) map[p.permission_key] = {};
    map[p.permission_key][p.tier] = { id: p.id, is_enabled: p.is_enabled };
  }
  return map;
}
