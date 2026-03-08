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
  const [atRiskOnly, setAtRiskOnly] = useState(false);
  const { data: requests, isLoading } = useReassignmentRequests(tab);

  // Modal state
  const [assignModal, setAssignModal] = useState<{
    verificationId: string;
    orgName: string;
    requestId: string;
    adminReason: string;
    currentAdminId: string | null;
  } | null>(null);

  const filtered = atRiskOnly
    ? (requests ?? []).filter(r => r.verification?.sla_breach_tier && r.verification.sla_breach_tier !== 'NONE')
    : (requests ?? []);

  // Sort: breach tier DESC, then created_at ASC for PENDING
  const sorted = [...filtered].sort((a, b) => {
    const tierOrder: Record<string, number> = { TIER3: 3, TIER2: 2, TIER1: 1, NONE: 0 };
    const aTier = tierOrder[a.verification?.sla_breach_tier ?? 'NONE'] ?? 0;
    const bTier = tierOrder[b.verification?.sla_breach_tier ?? 'NONE'] ?? 0;
    if (bTier !== aTier) return bTier - aTier;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  const pendingCount = tab === 'PENDING' ? sorted.length : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reassignment Requests</h1>
        {pendingCount !== undefined && pendingCount > 0 && (
          <p className="text-sm text-muted-foreground mt-1">
            {pendingCount} pending request{pendingCount !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList>
            <TabsTrigger value="PENDING">Pending</TabsTrigger>
            <TabsTrigger value="APPROVED">Approved</TabsTrigger>
            <TabsTrigger value="DECLINED">Declined</TabsTrigger>
          </TabsList>

          {tab === 'PENDING' && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={atRiskOnly}
                onChange={(e) => setAtRiskOnly(e.target.checked)}
                className="rounded border-input"
              />
              At-Risk Only
            </label>
          )}
        </div>

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
                      currentAdminId: request.verification?.id
                        ? null
                        : null,
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
