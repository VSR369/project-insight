import { useState, useMemo } from 'react';
import { FeatureErrorBoundary } from '@/components/ErrorBoundary';
import { useAllAdminMetrics } from '@/hooks/queries/useAllAdminMetrics';
import { TeamSummaryKPIBar } from '@/components/admin/performance/TeamSummaryKPIBar';
import { AdminPerformanceTable } from '@/components/admin/performance/AdminPerformanceTable';
import { PerformanceFilters } from '@/components/admin/performance/PerformanceFilters';
import { Skeleton } from '@/components/ui/skeleton';

function AllAdminsPerformanceContent() {
  const [period, setPeriod] = useState(30);
  const { data, isLoading } = useAllAdminMetrics(period);
  const [availability, setAvailability] = useState('all');
  const [sortBy, setSortBy] = useState('sla_asc');

  const filtered = useMemo(() => {
    if (!data) return [];
    let result = [...data];

    if (availability !== 'all') {
      result = result.filter((d) => d.availability_status === availability);
    }

    result.sort((a, b) => {
      const slaA = a.completed_total > 0 ? (a.sla_compliant_total / a.completed_total) * 100 : -1;
      const slaB = b.completed_total > 0 ? (b.sla_compliant_total / b.completed_total) * 100 : -1;

      let primary = 0;
      switch (sortBy) {
        case 'sla_asc': primary = slaA - slaB; break;
        case 'sla_desc': primary = slaB - slaA; break;
        case 'pending_desc': primary = b.current_pending - a.current_pending; break;
        case 'completed_desc': primary = b.completed_total - a.completed_total; break;
        case 'at_risk_desc': primary = b.sla_at_risk_count - a.sla_at_risk_count; break;
        case 'avg_time_desc': primary = (b.avg_processing_hours ?? 0) - (a.avg_processing_hours ?? 0); break;
        case 'name_asc': primary = a.full_name.localeCompare(b.full_name); break;
        default: primary = 0;
      }
      // Secondary sort by full_name ASC
      return primary !== 0 ? primary : a.full_name.localeCompare(b.full_name);
    });

    return result;
  }, [data, availability, sortBy]);

  if (isLoading) {
    return (
      <div className="space-y-4 p-4 lg:p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div>
        <h1 className="text-2xl font-bold">Team Performance</h1>
        <p className="text-sm text-muted-foreground">Real-time performance metrics for all platform admins</p>
      </div>

      <TeamSummaryKPIBar data={filtered} />

      <PerformanceFilters
        availability={availability}
        onAvailabilityChange={setAvailability}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        period={period}
        onPeriodChange={setPeriod}
        data={filtered}
      />

      <AdminPerformanceTable data={filtered} />
    </div>
  );
}

export default function AllAdminsPerformancePage() {
  return (
    <FeatureErrorBoundary featureName="Team Performance Dashboard">
      <AllAdminsPerformanceContent />
    </FeatureErrorBoundary>
  );
}
