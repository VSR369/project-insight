/**
 * Hook for SCR-05-03: Admin Performance Detail (Supervisor drill-down)
 * Fetches single admin metrics + SLA breach history with enriched data
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AdminMetricRow } from './useAllAdminMetrics';

export interface SlaBreachRecord {
  id: string;
  organization_id: string;
  organization_name: string | null;
  sla_breach_tier: string | null;
  completed_at: string | null;
  sla_start_at: string | null;
  sla_paused_duration_hours: number | null;
  status: string;
  sla_target_hours: number;
  reassignment_count: number;
}

const SLA_TARGET_HOURS = 72; // Default SLA target

export function useAdminMetricsDetail(adminId: string | undefined, periodDays: number = 30) {
  const metricsQuery = useQuery({
    queryKey: ['admin-metrics', 'detail', adminId, periodDays],
    queryFn: async () => {
      if (!adminId) return null;

      const [realtimeResult, storedResult, profileResult] = await Promise.all([
        supabase.rpc('get_realtime_admin_metrics', { p_admin_id: adminId, p_period_days: periodDays }),
        supabase
          .from('admin_performance_metrics')
          .select('admin_id, avg_processing_hours, sla_compliance_rate_pct, open_queue_claims, reassignments_received, reassignments_sent')
          .eq('admin_id', adminId)
          .maybeSingle(),
        supabase
          .from('platform_admin_profiles')
          .select('id, full_name, admin_tier, availability_status, current_active_verifications, max_concurrent_verifications, assignment_priority, industry_expertise, country_region_expertise, org_type_expertise')
          .eq('id', adminId)
          .maybeSingle(),
      ]);

      if (realtimeResult.error) throw new Error(realtimeResult.error.message);

      const rt = (realtimeResult.data as Record<string, unknown>[])?.[0];
      const stored = storedResult.data;
      const profile = profileResult.data;

      return {
        metrics: rt ? {
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
        } as AdminMetricRow : null,
        profile,
      };
    },
    enabled: !!adminId,
    staleTime: 30 * 1000,
  });

  const breachQuery = useQuery({
    queryKey: ['admin-metrics', 'breaches', adminId],
    queryFn: async () => {
      if (!adminId) return [];

      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      // Fetch breaches
      const { data, error } = await supabase
        .from('platform_admin_verifications')
        .select('id, organization_id, sla_breach_tier, completed_at, sla_start_at, sla_paused_duration_hours, status, seeker_organizations(organization_name)')
        .eq('completed_by_admin_id', adminId)
        .eq('sla_breached', true)
        .gte('completed_at', ninetyDaysAgo.toISOString())
        .order('completed_at', { ascending: false })
        .limit(20);

      if (error) throw new Error(error.message);

      // Fetch reassignment counts for these verifications
      const verificationIds = (data || []).map((r: Record<string, unknown>) => r.id as string);
      let reassignmentMap = new Map<string, number>();

      if (verificationIds.length > 0) {
        const { data: logData } = await supabase
          .from('verification_assignment_log')
          .select('verification_id')
          .in('verification_id', verificationIds)
          .eq('event_type', 'reassignment');

        if (logData) {
          for (const log of logData) {
            const vid = (log as Record<string, unknown>).verification_id as string;
            reassignmentMap.set(vid, (reassignmentMap.get(vid) || 0) + 1);
          }
        }
      }

      return (data || []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        organization_id: row.organization_id as string,
        organization_name: (row.seeker_organizations as Record<string, unknown> | null)?.organization_name as string | null,
        sla_breach_tier: row.sla_breach_tier as string | null,
        completed_at: row.completed_at as string | null,
        sla_start_at: row.sla_start_at as string | null,
        sla_paused_duration_hours: row.sla_paused_duration_hours as number | null,
        status: row.status as string,
        sla_target_hours: SLA_TARGET_HOURS,
        reassignment_count: reassignmentMap.get(row.id as string) || 0,
      })) as SlaBreachRecord[];
    },
    enabled: !!adminId,
    staleTime: 60 * 1000,
  });

  return { metricsQuery, breachQuery };
}
