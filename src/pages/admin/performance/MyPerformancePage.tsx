import { useState } from 'react';
import { FeatureErrorBoundary } from '@/components/ErrorBoundary';
import { useMyMetrics } from '@/hooks/queries/useMyMetrics';
import { MetricCard } from '@/components/admin/performance/MetricCard';
import { AdminStatusBadge } from '@/components/admin/platform-admins/AdminStatusBadge';
import { SLAComplianceTimeline } from '@/components/admin/performance/SLAComplianceTimeline';
import { WorkloadBreakdown } from '@/components/admin/performance/WorkloadBreakdown';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
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

  const queueClaimPct = data.completed_total > 0
    ? Math.round((data.open_queue_claims / data.completed_total) * 100)
    : 0;

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">My Performance</h1>
            {data.full_name && (
              <span className="text-lg text-muted-foreground">· {data.full_name}</span>
            )}
            {data.availability_status && (
              <AdminStatusBadge status={data.availability_status} />
            )}
          </div>
          <p className="text-sm text-muted-foreground">Your personal verification metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Period:</span>
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
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
        <MetricCard
          label="SLA Rate"
          value={slaRate !== null ? `${slaRate}%` : '—'}
          subtitle={`${data.sla_compliant_total}/${data.completed_total} within SLA`}
          icon={ShieldCheck}
          trend={slaTrend}
          borderColor="border-emerald-500"
        />
        <MetricCard
          label="Completed"
          value={data.completed_total}
          subtitle="approved + rejected + returned"
          icon={CheckCircle}
          trend="neutral"
          borderColor="border-blue-500"
        />
        <MetricCard
          label="Avg Time"
          value={data.avg_processing_hours !== null ? `${data.avg_processing_hours}h` : '—'}
          subtitle="excl. correction periods"
          icon={Clock}
          trend="neutral"
          borderColor="border-violet-500"
        />
        <MetricCard
          label="Pending Now"
          value={data.current_pending}
          subtitle="currently assigned"
          icon={Loader2}
          trend={data.current_pending > 5 ? 'negative' : 'neutral'}
          borderColor="border-amber-500"
        />
        <MetricCard
          label="At Risk Now"
          value={data.sla_at_risk_count}
          subtitle="past 80% SLA"
          icon={AlertTriangle}
          trend={data.sla_at_risk_count > 0 ? 'negative' : 'positive'}
          borderColor="border-red-500"
        />
        <MetricCard
          label="Queue Claims"
          value={data.open_queue_claims}
          subtitle="claimed from Open Queue"
          icon={Inbox}
          trend="neutral"
          borderColor="border-cyan-500"
        />
      </div>

      {/* SLA Timeline + Workload Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SLAComplianceTimeline />
        <WorkloadBreakdown
          currentPending={data.current_pending}
          maxConcurrent={data.max_concurrent_verifications}
        />
      </div>

      {/* Bottom Summary Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 space-y-2">
            <p className="text-sm font-semibold">Reassignment Summary</p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-sm">
                <ArrowDownLeft className="h-4 w-4 text-muted-foreground" />
                <span>Received <strong>{data.reassignments_received}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                <span>Sent <strong>{data.reassignments_sent}</strong></span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-2">
            <p className="text-sm font-semibold">Queue Claims Context</p>
            <p className="text-sm text-muted-foreground">
              {data.open_queue_claims} of {data.completed_total} completions · {queueClaimPct}% from Open Queue
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-2">
            <p className="text-sm font-semibold">Processing Time</p>
            <p className="text-sm text-muted-foreground">
              Your avg: <strong>{data.avg_processing_hours ?? '—'}h</strong> · excl. correction periods
            </p>
          </CardContent>
        </Card>
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
