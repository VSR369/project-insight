import { Card, CardContent } from '@/components/ui/card';
import { Users2, ShieldCheck, ArrowRightLeft, ListTodo } from 'lucide-react';
import { useAvailableAdminCounts } from '@/hooks/queries/useAvailableAdminCounts';
import { useAllAdminMetrics } from '@/hooks/queries/useAllAdminMetrics';
import { usePendingReassignmentCount } from '@/hooks/queries/useReassignmentRequests';
import { Skeleton } from '@/components/ui/skeleton';

interface KpiCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
}

function KpiCard({ label, value, subtitle, icon: Icon }: KpiCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="rounded-md bg-primary/10 p-2">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-xl font-bold tracking-tight">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface TeamOverviewCardsProps {
  openQueueCount: number;
}

export function TeamOverviewCards({ openQueueCount }: TeamOverviewCardsProps) {
  const { data: adminCounts, isLoading: countsLoading } = useAvailableAdminCounts();
  const { data: metrics, isLoading: metricsLoading } = useAllAdminMetrics(30);
  const { data: pendingReassignments, isLoading: reassignLoading } = usePendingReassignmentCount();

  const isLoading = countsLoading || metricsLoading || reassignLoading;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const activeCount = adminCounts?.availableCount ?? 0;
  const totalActive = activeCount + (adminCounts?.supervisorCount ?? 0);

  // Calculate team SLA rate from metrics
  const totalCompleted = metrics?.reduce((s, d) => s + d.completed_total, 0) ?? 0;
  const totalCompliant = metrics?.reduce((s, d) => s + d.sla_compliant_total, 0) ?? 0;
  const teamSlaRate = totalCompleted > 0
    ? ((totalCompliant / totalCompleted) * 100).toFixed(1)
    : '0';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
      <KpiCard
        label="Active Admins"
        value={`${activeCount}/${totalActive}`}
        subtitle="Available / Total"
        icon={Users2}
      />
      <KpiCard
        label="Team SLA"
        value={`${teamSlaRate}%`}
        subtitle={`${totalCompliant}/${totalCompleted} compliant`}
        icon={ShieldCheck}
      />
      <KpiCard
        label="Pending Reassignments"
        value={pendingReassignments ?? 0}
        icon={ArrowRightLeft}
      />
      <KpiCard
        label="Open Queue"
        value={openQueueCount}
        icon={ListTodo}
      />
    </div>
  );
}
