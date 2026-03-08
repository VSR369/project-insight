/**
 * Hook to get the current platform admin's tier (supervisor, senior_admin, admin)
 * and their effective permissions from the tier_permissions table.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type AdminTier = 'supervisor' | 'senior_admin' | 'admin';

interface AdminTierResult {
  tier: AdminTier | null;
  isSupervisor: boolean;
  isSeniorAdmin: boolean;
  isLoading: boolean;
  /** Check if the current admin's tier has a specific permission enabled */
  hasPermission: (permissionKey: string) => boolean;
  permissions: Record<string, boolean>;
}

export function useAdminTier(): AdminTierResult {
  const { data, isLoading } = useQuery({
    queryKey: ['platform-admins', 'self-tier-with-permissions'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch tier and permissions in parallel
      const [profileResult, permissionsResult] = await Promise.all([
        supabase
          .from('platform_admin_profiles')
          .select('admin_tier')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('tier_permissions')
          .select('permission_key, is_enabled, tier'),
      ]);

      if (profileResult.error) throw new Error(profileResult.error.message);
      if (permissionsResult.error) throw new Error(permissionsResult.error.message);

      const tier = (profileResult.data?.admin_tier as AdminTier) ?? null;

      // Build permissions map for the user's tier
      const perms: Record<string, boolean> = {};
      if (tier && permissionsResult.data) {
        for (const p of permissionsResult.data) {
          if (p.tier === tier) {
            perms[p.permission_key] = p.is_enabled;
          }
        }
      }

      return { tier, permissions: perms };
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const tier = data?.tier ?? null;
  const permissions = data?.permissions ?? {};

  return {
    tier,
    isSupervisor: tier === 'supervisor',
    isSeniorAdmin: tier === 'senior_admin',
    isLoading,
    hasPermission: (key: string) => permissions[key] ?? false,
    permissions,
  };
}
