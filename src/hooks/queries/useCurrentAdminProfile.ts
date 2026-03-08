/**
 * Cached admin profile hook — eliminates redundant getUser() + profile lookups
 * across useMyAssignments, useVerificationDetail, useOpenQueue, etc.
 * 
 * staleTime: 10 minutes (profile rarely changes mid-session)
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface CurrentAdminProfile {
  id: string;
  admin_tier: string | null;
  is_supervisor: boolean;
  full_name: string | null;
  current_active_verifications: number;
  max_concurrent_verifications: number;
}

export function useCurrentAdminProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['platform-admins', 'current-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_admin_profiles')
        .select('id, admin_tier, is_supervisor, full_name, current_active_verifications, max_concurrent_verifications')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return data as CurrentAdminProfile | null;
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000,   // 10 minutes
    gcTime: 30 * 60 * 1000,      // 30 minutes
  });
}
