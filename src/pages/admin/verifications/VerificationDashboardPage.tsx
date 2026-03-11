import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useMyAssignments, useOpenQueue } from '@/hooks/queries/useVerificationDashboard';
import { FeatureErrorBoundary } from '@/components/ErrorBoundary';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, ListTodo, AlertTriangle, ShieldAlert } from 'lucide-react';
import { MyAssignmentsTab } from '@/components/admin/verifications/MyAssignmentsTab';
import { OpenQueueTab } from '@/components/admin/verifications/OpenQueueTab';
import { TeamOverviewCards } from '@/components/admin/verifications/TeamOverviewCards';
import { useAdminTier } from '@/hooks/useAdminTier';
import { supabase } from '@/integrations/supabase/client';

/**
 * SCR-03-01 & SCR-03-02: Verification Dashboard
 * GAP-1: Tab count badges
 * GAP-2: Tier warning/breach banners
 * GAP-19: Realtime subscriptions
 */
function VerificationDashboardContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'mine';
  const queryClient = useQueryClient();
  const { isSupervisor } = useAdminTier();

  const { data: assignments } = useMyAssignments();
  const { data: queueEntries } = useOpenQueue();

  // GAP-19: Realtime subscriptions replace polling
  useEffect(() => {
    const channel = supabase
      .channel('verification-dashboard-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'platform_admin_verifications',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['verifications', 'my-assignments'] });
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'open_queue_entries',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['verifications', 'open-queue'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const myCount = assignments?.length ?? 0;
  const queueCount = queueEntries?.length ?? 0;

  // GAP-2: Tier-based banners
  const tier1Count = assignments?.filter(a => a.sla_breach_tier === 'TIER1').length ?? 0;
  const tier2PlusCount = assignments?.filter(a =>
    a.sla_breach_tier === 'TIER2' || a.sla_breach_tier === 'TIER3'
  ).length ?? 0;

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Verification Dashboard</h1>
        <p className="text-muted-foreground">
          Manage organization verifications and open queue entries.
        </p>
      </div>

      {/* GAP-1: Supervisor Team Overview KPI cards */}
      {isSupervisor && <TeamOverviewCards openQueueCount={queueCount} />}

      {/* GAP-2: Tier warning banners */}
      {tier1Count > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            <strong>{tier1Count}</strong> verification{tier1Count > 1 ? 's' : ''} approaching SLA deadline.
          </span>
        </div>
      )}
      {tier2PlusCount > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>
            <strong>{tier2PlusCount}</strong> SLA-breached verification{tier2PlusCount > 1 ? 's' : ''} require immediate attention.
          </span>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="mine" className="gap-1.5">
            <ClipboardList className="h-4 w-4" />
            My Assignments
            {myCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5 text-[10px]">
                {myCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="queue" className="gap-1.5">
            <ListTodo className="h-4 w-4" />
            Open Queue
            {queueCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5 text-[10px]">
                {queueCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mine">
          <MyAssignmentsTab />
        </TabsContent>

        <TabsContent value="queue">
          <OpenQueueTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function VerificationDashboardPage() {
  return (
    <FeatureErrorBoundary featureName="Verification Dashboard">
      <VerificationDashboardContent />
    </FeatureErrorBoundary>
  );
}
