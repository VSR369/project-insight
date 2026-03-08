import { useState } from 'react';
import { FeatureErrorBoundary } from '@/components/ErrorBoundary';
import { useMyMetrics } from '@/hooks/queries/useMyMetrics';
import { MetricCard } from '@/components/admin/performance/MetricCard';
import { WorkloadBar } from '@/components/admin/platform-admins/WorkloadBar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CheckCircle, ShieldCheck, Clock, Loader2, AlertTriangle, Inbox,
  ArrowDownLeft, ArrowUpRight,
} from 'lucide-react';

function MyPerformanceContent() {
  const [period, setPeriod] = useState(30);
  const { data, isLoading } = useMyMetrics(period);

  if (isLoading) {
    return (
      <div className="space-y-4 p-4 lg:p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-muted-foreground p-4">
        No performance data available yet.
      </div>
    );
  }

  const slaRate = data.completed_total > 0
    ? Math.round((data.sla_compliant_total / data.completed_total) * 100)
    : null;

  const slaTrend = slaRate === null ? 'neutral' as const
    : slaRate >= 95 ? 'positive' as const
    : slaRate >= 80 ? 'neutral' as const
    : 'negative' as const;

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">My Performance</h1>
          <p className="text-sm text-muted-foreground">Your personal verification metrics</p>
        </div>
        <Select value={String(period)} onValueChange={(v) => setPeriod(Number(v))}>
          <SelectTrigger className="w-full lg:w-[160px]">
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
        <MetricCard
          label="Completed (M1)"
          value={data.completed_total}
          icon={CheckCircle}
          trend="neutral"
        />
        <MetricCard
          label="SLA Rate (M2)"
          value={slaRate !== null ? `${slaRate}%` : '—'}
          subtitle={`${data.sla_compliant_total} compliant / ${data.sla_breached_total} breached`}
          icon={ShieldCheck}
          trend={slaTrend}
        />
        <MetricCard
          label="Avg Time (M3)"
          value={data.avg_processing_hours !== null ? `${data.avg_processing_hours}h` : '—'}
          subtitle="Updated daily"
          icon={Clock}
          trend="neutral"
        />
        <MetricCard
          label="Pending (M4)"
          value={data.current_pending}
          icon={Loader2}
          trend={data.current_pending > 5 ? 'negative' : 'neutral'}
        />
        <MetricCard
          label="At-Risk (M5)"
          value={data.sla_at_risk_count}
          icon={AlertTriangle}
          trend={data.sla_at_risk_count > 0 ? 'negative' : 'positive'}
        />
        <MetricCard
          label="Queue Claims (M6)"
          value={data.open_queue_claims}
          subtitle="Updated daily"
          icon={Inbox}
          trend="neutral"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MetricCard
          label="Reassignments Received (M7)"
          value={data.reassignments_received}
          subtitle="Updated daily"
          icon={ArrowDownLeft}
          trend="neutral"
        />
        <MetricCard
          label="Reassignments Sent (M8)"
          value={data.reassignments_sent}
          subtitle="Updated daily"
          icon={ArrowUpRight}
          trend="neutral"
        />
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Current Workload:</span>
        <WorkloadBar
          current={data.current_active_verifications}
          max={data.max_concurrent_verifications}
        />
      </div>
    </div>
  );
}

export default function MyPerformancePage() {
  return (
    <FeatureErrorBoundary featureName="My Performance">
      <MyPerformanceContent />
    </FeatureErrorBoundary>
  );
}
