/**
 * Hook for SCR-05-02: My Performance (Self-View)
 * Fetches own metrics only via RPC + stored metrics
 * Uses cached admin profile to eliminate redundant auth lookups
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentAdminProfile } from './useCurrentAdminProfile';
import { useVisibilityPollingInterval } from '@/lib/useVisibilityPolling';
import type { AdminMetricRow } from './useAllAdminMetrics';

export function useMyMetrics(periodDays: number = 30) {
  const { data: profile } = useCurrentAdminProfile();
  const refetchInterval = useVisibilityPollingInterval(300_000);

  return useQuery({
    queryKey: ['admin-metrics', 'self', periodDays, profile?.id],
    queryFn: async () => {
      if (!profile) throw new Error('No admin profile found');

      const [realtimeResult, storedResult] = await Promise.all([
        supabase.rpc('get_realtime_admin_metrics', { p_admin_id: profile.id, p_period_days: periodDays }),
        supabase
          .from('admin_performance_metrics')
          .select('admin_id, avg_processing_hours, sla_compliance_rate_pct, open_queue_claims, reassignments_received, reassignments_sent')
          .eq('admin_id', profile.id)
          .maybeSingle(),
      ]);

      if (realtimeResult.error) throw new Error(realtimeResult.error.message);

      const rt = (realtimeResult.data as Record<string, unknown>[])?.[0];
      if (!rt) return null;

      const stored = storedResult.data;

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
      } as AdminMetricRow;
    },
    enabled: !!profile?.id,
    staleTime: 300_000,
    gcTime: 600_000,
    refetchInterval: 300_000,
  });
}
