/**
 * Hook to get the current platform admin's tier (supervisor, senior_admin, admin)
 * and their effective permissions from the tier_permissions table.
 * 
 * Derives admin_tier from useCurrentAdminProfile (cached) to avoid duplicate profile lookups.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentAdminProfile } from '@/hooks/queries/useCurrentAdminProfile';

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
  const { data: profile, isLoading: profileLoading } = useCurrentAdminProfile();

  const tier = (profile?.admin_tier as AdminTier) ?? null;

  // Only fetch tier_permissions (the genuinely separate data)
  const { data: permissions, isLoading: permsLoading } = useQuery({
    queryKey: ['tier-permissions', tier],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tier_permissions')
        .select('permission_key, is_enabled, tier');

      if (error) throw new Error(error.message);

      const perms: Record<string, boolean> = {};
      if (tier && data) {
        for (const p of data) {
          if (p.tier === tier) {
            perms[p.permission_key] = p.is_enabled;
          }
        }
      }
      return perms;
    },
    enabled: !!tier,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const permsMap = permissions ?? {};

  return {
    tier,
    isSupervisor: tier === 'supervisor',
    isSeniorAdmin: tier === 'senior_admin',
    isLoading: profileLoading || permsLoading,
    hasPermission: (key: string) => permsMap[key] ?? false,
    permissions: permsMap,
  };
}
