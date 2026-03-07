import { useParams } from 'react-router-dom';
import { FeatureErrorBoundary } from '@/components/ErrorBoundary';
import { useAdminMetricsDetail } from '@/hooks/queries/useAdminMetricsDetail';
import { AdminHeaderCard } from '@/components/admin/performance/AdminHeaderCard';
import { MetricCard } from '@/components/admin/performance/MetricCard';
import { SlaBreachHistory } from '@/components/admin/performance/SlaBreachHistory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CheckCircle, ShieldCheck, Clock, Loader2, AlertTriangle, Inbox,
  ArrowDownLeft, ArrowUpRight,
} from 'lucide-react';

function DetailContent() {
  const { adminId } = useParams<{ adminId: string }>();
  const { metricsQuery, breachQuery } = useAdminMetricsDetail(adminId);

  if (metricsQuery.isLoading) {
    return (
      <div className="space-y-4 p-4 lg:p-6">
        <Skeleton className="h-32" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  const { metrics, profile } = metricsQuery.data || {};

  if (!metrics || !profile) {
    return <div className="text-center py-12 text-muted-foreground p-4">Admin not found.</div>;
  }

  const slaRate = metrics.completed_total > 0
    ? Math.round((metrics.sla_compliant_total / metrics.completed_total) * 100)
    : null;

  const slaTrend = slaRate === null ? 'neutral' as const
    : slaRate >= 90 ? 'positive' as const
    : slaRate >= 80 ? 'neutral' as const
    : 'negative' as const;

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <AdminHeaderCard profile={profile} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <MetricCard label="Completed (M1)" value={metrics.completed_total} icon={CheckCircle} trend="neutral" />
        <MetricCard
          label="SLA Rate (M2)"
          value={slaRate !== null ? `${slaRate}%` : '—'}
          subtitle={`${metrics.sla_compliant_total}/${metrics.completed_total}`}
          icon={ShieldCheck}
          trend={slaTrend}
        />
        <MetricCard
          label="Avg Time (M3)"
          value={metrics.avg_processing_hours !== null ? `${metrics.avg_processing_hours}h` : '—'}
          icon={Clock}
          trend="neutral"
        />
        <MetricCard
          label="Pending (M4)"
          value={metrics.current_pending}
          icon={Loader2}
          trend={metrics.current_pending > 5 ? 'negative' : 'neutral'}
        />
        <MetricCard
          label="At-Risk (M5)"
          value={metrics.sla_at_risk_count}
          icon={AlertTriangle}
          trend={metrics.sla_at_risk_count > 0 ? 'negative' : 'positive'}
        />
        <MetricCard label="Queue Claims (M6)" value={metrics.open_queue_claims} icon={Inbox} trend="neutral" />
        <MetricCard label="Reassign In (M7)" value={metrics.reassignments_received} icon={ArrowDownLeft} trend="neutral" />
        <MetricCard label="Reassign Out (M8)" value={metrics.reassignments_sent} icon={ArrowUpRight} trend="neutral" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">SLA Breach History (90 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <SlaBreachHistory
            data={breachQuery.data || []}
            isLoading={breachQuery.isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminPerformanceDetailPage() {
  return (
    <FeatureErrorBoundary featureName="Admin Performance Detail">
      <DetailContent />
    </FeatureErrorBoundary>
  );
}
