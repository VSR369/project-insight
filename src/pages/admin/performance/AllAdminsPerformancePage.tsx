import { useState, useMemo } from 'react';
import { FeatureErrorBoundary } from '@/components/ErrorBoundary';
import { useAllAdminMetrics } from '@/hooks/queries/useAllAdminMetrics';
import { TeamSummaryKPIBar } from '@/components/admin/performance/TeamSummaryKPIBar';
import { AdminPerformanceTable } from '@/components/admin/performance/AdminPerformanceTable';
import { PerformanceFilters } from '@/components/admin/performance/PerformanceFilters';
import { Skeleton } from '@/components/ui/skeleton';

function AllAdminsPerformanceContent() {
  const { data, isLoading } = useAllAdminMetrics();
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

      switch (sortBy) {
        case 'sla_asc': return slaA - slaB;
        case 'sla_desc': return slaB - slaA;
        case 'pending_desc': return b.current_pending - a.current_pending;
        case 'completed_desc': return b.completed_total - a.completed_total;
        case 'name_asc': return a.full_name.localeCompare(b.full_name);
        default: return 0;
      }
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
