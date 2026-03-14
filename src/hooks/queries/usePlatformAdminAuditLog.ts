/**
 * React Query hook for platform admin profile audit log.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CACHE_FREQUENT } from '@/config/queryCache';

const AUDIT_LOG_COLUMNS = 'id, admin_id, event_type, actor_id, actor_type, field_changed, old_value, new_value, ip_address, created_at';

export function usePlatformAdminAuditLog(adminId: string | undefined, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ['platform-admin-audit-log', adminId, { page, pageSize }],
    queryFn: async () => {
      if (!adminId) throw new Error('Admin ID required');
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await supabase
        .from('platform_admin_profile_audit_log')
        .select(AUDIT_LOG_COLUMNS, { count: 'exact' })
        .eq('admin_id', adminId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw new Error(error.message);
      return { data: data ?? [], total: count ?? 0, page, pageSize };
    },
    enabled: !!adminId,
    staleTime: CACHE_FREQUENT.staleTime,
  });
}
