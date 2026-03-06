/**
 * Hook to get the current platform admin's tier (supervisor, senior_admin, admin).
 * Replaces ad-hoc is_supervisor checks.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type AdminTier = 'supervisor' | 'senior_admin' | 'admin';

interface AdminTierResult {
  tier: AdminTier | null;
  isSupervisor: boolean;
  isSeniorAdmin: boolean;
  isLoading: boolean;
}

export function useAdminTier(): AdminTierResult {
  const { data, isLoading } = useQuery({
    queryKey: ['platform-admins', 'self-tier'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile, error } = await supabase
        .from('platform_admin_profiles')
        .select('admin_tier')
        .eq('user_id', user.id)
        .single();

      if (error) throw new Error(error.message);
      return profile?.admin_tier as AdminTier;
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  return {
    tier: data ?? null,
    isSupervisor: data === 'supervisor',
    isSeniorAdmin: data === 'senior_admin',
    isLoading,
  };
}
