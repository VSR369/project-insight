/**
 * useConfigAuditLog — fetches config change audit trail (API-07-06).
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ConfigAuditEntry {
  id: string;
  param_key: string;
  previous_value: string | null;
  new_value: string;
  changed_by_id: string;
  changed_at: string;
  change_reason: string | null;
  ip_address: string | null;
  admin_name?: string;
}

export function useConfigAuditLog(paramKey?: string) {
  return useQuery({
    queryKey: ['config-audit', paramKey ?? 'all'],
    queryFn: async () => {
      let query = supabase
        .from('md_mpa_config_audit')
        .select('id, param_key, previous_value, new_value, changed_by_id, changed_at, change_reason, ip_address')
        .order('changed_at', { ascending: false })
        .limit(100);

      if (paramKey) {
        query = query.eq('param_key', paramKey);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      // Fetch admin names for display
      const adminIds = [...new Set((data ?? []).map((d) => d.changed_by_id))];
      let adminMap: Record<string, string> = {};

      if (adminIds.length > 0) {
        const { data: admins } = await supabase
          .from('platform_admin_profiles')
          .select('id, full_name')
          .in('id', adminIds);

        adminMap = (admins ?? []).reduce((acc, a) => {
          acc[a.id] = a.full_name || 'Unknown';
          return acc;
        }, {} as Record<string, string>);
      }

      return (data ?? []).map((entry) => ({
        ...entry,
        admin_name: adminMap[entry.changed_by_id] ?? 'Unknown',
      })) as ConfigAuditEntry[];
    },
    staleTime: 30 * 1000,
  });
}
