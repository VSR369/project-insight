import { MetricCard } from './MetricCard';
import { ShieldCheck, Clock, AlertTriangle, Inbox } from 'lucide-react';
import type { AdminMetricRow } from '@/hooks/queries/useAllAdminMetrics';

interface TeamSummaryKPIBarProps {
  data: AdminMetricRow[];
}

export function TeamSummaryKPIBar({ data }: TeamSummaryKPIBarProps) {
  const totalCompleted = data.reduce((s, d) => s + d.completed_total, 0);
  const totalCompliant = data.reduce((s, d) => s + d.sla_compliant_total, 0);
  const teamSlaRate = totalCompleted > 0
    ? Math.round((totalCompliant / totalCompleted) * 100)
    : 0;

  const totalPending = data.reduce((s, d) => s + d.current_pending, 0);
  const totalAtRisk = data.reduce((s, d) => s + d.sla_at_risk_count, 0);
  const totalQueueClaims = data.reduce((s, d) => s + d.open_queue_claims, 0);

  const slaTrend = teamSlaRate >= 90 ? 'positive' as const
    : teamSlaRate >= 80 ? 'neutral' as const
    : 'negative' as const;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
      <MetricCard
        label="Team SLA Rate"
        value={`${teamSlaRate}%`}
        subtitle={`${totalCompliant}/${totalCompleted} compliant`}
        icon={ShieldCheck}
        trend={slaTrend}
      />
      <MetricCard
        label="Total Pending"
        value={totalPending}
        icon={Clock}
        trend={totalPending > 10 ? 'negative' : 'neutral'}
      />
      <MetricCard
        label="At-Risk"
        value={totalAtRisk}
        icon={AlertTriangle}
        trend={totalAtRisk > 0 ? 'negative' : 'positive'}
      />
      <MetricCard
        label="Queue Claims"
        value={totalQueueClaims}
        icon={Inbox}
        trend="neutral"
      />
    </div>
  );
}
