/**
 * Query hook to fetch counts of available admins and supervisors
 * for BR-MPA-001/002 pre-guard checks.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AdminCounts {
  availableCount: number;
  supervisorCount: number;
}

export function useAvailableAdminCounts() {
  return useQuery<AdminCounts>({
    queryKey: ['platform-admins', 'counts'],
    queryFn: async () => {
      const [availableRes, supervisorRes] = await Promise.all([
        supabase
          .from('platform_admin_profiles')
          .select('id', { count: 'exact', head: true })
          .eq('availability_status', 'Available'),
        supabase
          .from('platform_admin_profiles')
          .select('id', { count: 'exact', head: true })
          .eq('is_supervisor', true)
          .neq('availability_status', 'Inactive'),
      ]);

      return {
        availableCount: availableRes.count ?? 0,
        supervisorCount: supervisorRes.count ?? 0,
      };
    },
    staleTime: 15 * 1000,
  });
}
