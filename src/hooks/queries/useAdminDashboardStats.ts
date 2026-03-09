/**
 * useAdminDashboardStats — KPI stats and recent activity for Primary SO Admin dashboard.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth } from 'date-fns';

export interface AdminKpiStats {
  totalAdmins: number;
  activeRoles: number;
  pendingActivations: number;
  thisMonth: number;
}

export interface AuditLogEntry {
  id: string;
  new_status: string;
  previous_status: string;
  change_reason: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

export function useAdminKpiStats(organizationId?: string) {
  return useQuery({
    queryKey: ['admin-dashboard-kpis', organizationId],
    queryFn: async (): Promise<AdminKpiStats> => {
      if (!organizationId) throw new Error('Organization ID required');

      const { data, error } = await supabase
        .from('seeking_org_admins')
        .select('id, status, admin_tier, created_at')
        .eq('organization_id', organizationId);

      if (error) throw new Error(error.message);

      const admins = data ?? [];
      const nonDeactivated = admins.filter((a) => a.status !== 'deactivated');
      const monthStart = startOfMonth(new Date()).toISOString();

      return {
        totalAdmins: nonDeactivated.length,
        activeRoles: nonDeactivated.filter((a) => a.status === 'active').length,
        pendingActivations: nonDeactivated.filter((a) => a.status === 'pending_activation').length,
        thisMonth: nonDeactivated.filter((a) => a.created_at >= monthStart).length,
      };
    },
    enabled: !!organizationId,
    staleTime: 30_000,
  });
}

export function useAdminRecentActivity(organizationId?: string) {
  return useQuery({
    queryKey: ['admin-dashboard-activity', organizationId],
    queryFn: async (): Promise<AuditLogEntry[]> => {
      if (!organizationId) throw new Error('Organization ID required');

      const { data, error } = await supabase
        .from('org_state_audit_log')
        .select('id, new_status, previous_status, change_reason, created_at, metadata')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(8);

      if (error) throw new Error(error.message);
      return (data ?? []) as AuditLogEntry[];
    },
    enabled: !!organizationId,
    staleTime: 30_000,
  });
}
