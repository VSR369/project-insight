/**
 * SCR-06-01: Reassignment Requests Inbox Page
 * Supervisor-only view for managing reassignment requests
 */
import { useState } from 'react';
import { FeatureErrorBoundary } from '@/components/ErrorBoundary';
import { useReassignmentRequests } from '@/hooks/queries/useReassignmentRequests';
import { ReassignmentRequestCard } from '@/components/admin/reassignments/ReassignmentRequestCard';
import { SupervisorReassignModal } from '@/components/admin/reassignments/SupervisorReassignModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { InboxIcon } from 'lucide-react';

function ReassignmentInboxContent() {
  const [tab, setTab] = useState<'PENDING' | 'APPROVED' | 'DECLINED'>('PENDING');
  const { data: requests, isLoading } = useReassignmentRequests(tab);
  const { data: pendingRequests } = useReassignmentRequests('PENDING');

  // Modal state
  const [assignModal, setAssignModal] = useState<{
    verificationId: string;
    orgName: string;
    requestId: string;
    adminReason: string;
    currentAdminId: string | null;
    currentAdminName: string | null;
    currentAdminAvailability: string | null;
    currentAdminPendingCount: number | null;
    hqCountry: string;
    reassignmentCount: number;
    slaBreachTier?: string;
    slaStartAt?: string | null;
    slaDurationSeconds?: number | null;
  } | null>(null);

  // Sort: breach tier DESC, then created_at ASC for PENDING
  const sorted = [...(requests ?? [])].sort((a, b) => {
    const tierOrder: Record<string, number> = { TIER3: 3, TIER2: 2, TIER1: 1, NONE: 0 };
    const aTier = tierOrder[a.verification?.sla_breach_tier ?? 'NONE'] ?? 0;
    const bTier = tierOrder[b.verification?.sla_breach_tier ?? 'NONE'] ?? 0;
    if (bTier !== aTier) return bTier - aTier;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  const pendingCount = pendingRequests?.length ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        Reassignment Requests
        {pendingCount > 0 && (
          <span className="text-muted-foreground font-normal text-lg ml-2">
            ({pendingCount} pending)
          </span>
        )}
      </h1>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="PENDING">Pending{pendingCount > 0 ? ` (${pendingCount})` : ''}</TabsTrigger>
          <TabsTrigger value="APPROVED">Approved</TabsTrigger>
          <TabsTrigger value="DECLINED">Declined</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <InboxIcon className="h-12 w-12 mb-3 opacity-40" />
              <p className="text-sm">No {tab.toLowerCase()} requests</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sorted.map(request => (
                <ReassignmentRequestCard
                  key={request.id}
                  request={request}
                  isPending={tab === 'PENDING'}
                  onAssign={() =>
                    setAssignModal({
                      verificationId: request.verification_id,
                      orgName: request.verification?.organization?.organization_name ?? 'Unknown',
                      requestId: request.id,
                      adminReason: request.reason,
                      currentAdminId: request.requesting_admin_id,
                      currentAdminName: request.requesting_admin?.full_name ?? null,
                      currentAdminAvailability: request.requesting_admin?.availability_status ?? null,
                      currentAdminPendingCount: (request.requesting_admin as any)?.current_active_verifications ?? null,
                      hqCountry: request.verification?.organization?.hq_country_id ?? '',
                      reassignmentCount: request.verification?.reassignment_count ?? 0,
                      slaBreachTier: request.verification?.sla_breach_tier ?? undefined,
                      slaStartAt: request.verification?.sla_start_at,
                      slaDurationSeconds: request.verification?.sla_duration_seconds,
                    })
                  }
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {assignModal && (
        <SupervisorReassignModal
          open={!!assignModal}
          onOpenChange={(open) => { if (!open) setAssignModal(null); }}
          verificationId={assignModal.verificationId}
          orgName={assignModal.orgName}
          requestId={assignModal.requestId}
          adminReason={assignModal.adminReason}
          hqCountry={assignModal.hqCountry}
          currentAdminId={assignModal.currentAdminId ?? undefined}
          currentAdminName={assignModal.currentAdminName ?? undefined}
          currentAdminAvailability={assignModal.currentAdminAvailability ?? undefined}
          currentAdminPendingCount={assignModal.currentAdminPendingCount ?? undefined}
          reassignmentCount={assignModal.reassignmentCount}
          slaBreachTier={assignModal.slaBreachTier}
          slaStartAt={assignModal.slaStartAt}
          slaDurationSeconds={assignModal.slaDurationSeconds}
        />
      )}
    </div>
  );
}

export default function ReassignmentInboxPage() {
  return (
    <FeatureErrorBoundary featureName="Reassignment Inbox">
      <ReassignmentInboxContent />
    </FeatureErrorBoundary>
  );
}
