/**
 * Hook for SCR-05-01: All Admins Performance Dashboard (Supervisor)
 * Fetches admin_performance_metrics + realtime RPC in parallel
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AdminMetricRow {
  admin_id: string;
  full_name: string;
  admin_tier: string;
  availability_status: string;
  current_active_verifications: number;
  max_concurrent_verifications: number;
  assignment_priority: number;
  current_pending: number;
  sla_at_risk_count: number;
  completed_total: number;
  sla_compliant_total: number;
  sla_breached_total: number;
  avg_processing_hours: number | null;
  sla_compliance_rate_pct: number | null;
  open_queue_claims: number;
  reassignments_received: number;
  reassignments_sent: number;
}

export function useAllAdminMetrics(periodDays: number = 30) {
  return useQuery({
    queryKey: ['admin-metrics', 'all', periodDays],
    queryFn: async () => {
      const [realtimeResult, storedResult] = await Promise.all([
        supabase.rpc('get_realtime_admin_metrics', { p_period_days: periodDays }),
        supabase
          .from('admin_performance_metrics')
          .select('admin_id, avg_processing_hours, sla_compliance_rate_pct, open_queue_claims, reassignments_received, reassignments_sent'),
      ]);

      if (realtimeResult.error) throw new Error(realtimeResult.error.message);
      if (storedResult.error) throw new Error(storedResult.error.message);

      const storedMap = new Map(
        (storedResult.data || []).map((s) => [s.admin_id, s])
      );

      return (realtimeResult.data || []).map((rt: Record<string, unknown>): AdminMetricRow => {
        const stored = storedMap.get(rt.admin_id as string);
        return {
          admin_id: rt.admin_id as string,
          full_name: rt.full_name as string,
          admin_tier: rt.admin_tier as string,
          availability_status: rt.availability_status as string,
          current_active_verifications: rt.current_active_verifications as number,
          max_concurrent_verifications: rt.max_concurrent_verifications as number,
          assignment_priority: rt.assignment_priority as number,
          current_pending: Number(rt.current_pending),
          sla_at_risk_count: Number(rt.sla_at_risk_count),
          completed_total: Number(rt.completed_total),
          sla_compliant_total: Number(rt.sla_compliant_total),
          sla_breached_total: Number(rt.sla_breached_total),
          avg_processing_hours: stored?.avg_processing_hours ?? null,
          sla_compliance_rate_pct: stored?.sla_compliance_rate_pct ?? null,
          open_queue_claims: stored?.open_queue_claims ?? 0,
          reassignments_received: stored?.reassignments_received ?? 0,
          reassignments_sent: stored?.reassignments_sent ?? 0,
        };
      });
    },
    staleTime: 60_000,
    gcTime: 300_000,
  });
}
