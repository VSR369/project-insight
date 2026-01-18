import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface UserRolesResult {
  roles: AppRole[] | undefined;
  isLoading: boolean;
  error: Error | null;
  hasRole: (role: AppRole) => boolean;
  isAdmin: boolean;
  isProvider: boolean;
  isSeeker: boolean;
  isTenantAdmin: boolean;
  isReviewer: boolean;
}

export function useUserRoles(): UserRolesResult {
  const { user } = useAuth();

  const { data: roles, isLoading, error } = useQuery({
    queryKey: ['user-roles', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data?.map(r => r.role) || [];
    },
    enabled: !!user?.id,
    staleTime: 60000, // 1 minute - roles don't change often
  });

  const hasRole = (role: AppRole): boolean => {
    return roles?.includes(role) ?? false;
  };

  return {
    roles,
    isLoading,
    error: error as Error | null,
    hasRole,
    isAdmin: hasRole('platform_admin'),
    isProvider: hasRole('solution_provider'),
    isSeeker: hasRole('seeker'),
    isTenantAdmin: hasRole('tenant_admin'),
    isReviewer: hasRole('panel_reviewer'),
  };
}
