/**
 * React Query hooks for platform admin profiles.
 * Follows project standards: explicit columns, handleMutationError, proper invalidation.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const PLATFORM_ADMIN_COLUMNS = 
  'id, user_id, full_name, email, phone, is_supervisor, admin_tier, industry_expertise, country_region_expertise, org_type_expertise, max_concurrent_verifications, current_active_verifications, availability_status, assignment_priority, leave_start_date, leave_end_date, last_assignment_timestamp, created_at, updated_at';

export function usePlatformAdmins(statusFilter?: string) {
  return useQuery({
    queryKey: ['platform-admins', { statusFilter }],
    queryFn: async () => {
      let query = supabase
        .from('platform_admin_profiles')
        .select(PLATFORM_ADMIN_COLUMNS)
        .order('full_name');

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('availability_status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data;
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function usePlatformAdminProfile(adminId: string | undefined) {
  return useQuery({
    queryKey: ['platform-admins', adminId],
    queryFn: async () => {
      if (!adminId) throw new Error('Admin ID required');
      const { data, error } = await supabase
        .from('platform_admin_profiles')
        .select(PLATFORM_ADMIN_COLUMNS)
        .eq('id', adminId)
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!adminId,
    staleTime: 30 * 1000,
  });
}

export function usePlatformAdminSelf() {
  return useQuery({
    queryKey: ['platform-admins', 'self'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('platform_admin_profiles')
        .select(PLATFORM_ADMIN_COLUMNS)
        .eq('user_id', user.id)
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
