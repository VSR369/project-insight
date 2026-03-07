import { useParams, useNavigate } from 'react-router-dom';
import { useVerificationDetail } from '@/hooks/queries/useVerificationDashboard';
import { FeatureErrorBoundary } from '@/components/ErrorBoundary';
import { SLATimelineBar } from '@/components/admin/verifications/SLATimelineBar';
import { AssignedStateBanner } from '@/components/admin/verifications/AssignedStateBanner';
import { AssignmentMethodBadge } from '@/components/admin/verifications/AssignmentMethodBadge';
import { VerificationChecksPanel } from '@/components/admin/verifications/VerificationChecksPanel';
import { VerificationActionBar } from '@/components/admin/verifications/VerificationActionBar';
import { AssignmentHistoryTab } from '@/components/admin/verifications/AssignmentHistoryTab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Building2, Globe, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * SCR-03-03: Verification Detail Page
 * GAP-8: Supervisor "Reassign to Me" via RPC (GAP-17 fix)
 * GAP-10: Org Details and Registrant Comms stub tabs
 * GAP-15: FeatureErrorBoundary wrapper
 */
function VerificationDetailContent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useVerificationDetail(id);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-destructive">{error?.message ?? 'Verification not found'}</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/admin/verifications')}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const { verification, checks, history, currentAssignment, viewState, assignedAdminName, currentAdminProfileId } = data;
  const org = verification.organization;
  const isEditable = viewState === 1;

  // GAP-17: Supervisor reassign via RPC (proper engine path)
  const handleReassignToMe = async () => {
    if (!id) return;
    try {
      const { data: result, error: rpcErr } = await supabase.rpc('supervisor_reassign_to_self', {
        p_verification_id: id,
      });
      if (rpcErr) throw rpcErr;
      const res = result as { success: boolean; error?: string; assigned_to?: string };
      if (!res.success) throw new Error(res.error ?? 'Reassign failed');
      toast.success('Verification reassigned to you');
      refetch();
    } catch (e: any) {
      toast.error(`Reassign failed: ${e.message}`);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button variant="ghost" size="sm" className="gap-1 -ml-2" onClick={() => navigate('/admin/verifications')}>
          <ArrowLeft className="h-3.5 w-3.5" />
          Verification Dashboard
        </Button>
        <span>/</span>
        <span className="font-medium text-foreground">{org?.organization_name ?? 'Unknown'}</span>
      </div>

      {/* State Banner */}
      {viewState !== 1 && (
        <AssignedStateBanner
          state={viewState}
          assignedAdminName={assignedAdminName ?? undefined}
          onReassignToMe={viewState === 2 ? handleReassignToMe : undefined}
        />
      )}

      {/* SLA Timeline */}
      {verification.sla_start_at && (
        <SLATimelineBar
          slaStartAt={verification.sla_start_at}
          slaPausedHours={verification.sla_paused_duration_hours ?? 0}
          slaDurationSeconds={verification.sla_duration_seconds}
          breachTier={verification.sla_breach_tier ?? 'NONE'}
        />
      )}

      {/* Org Summary Card */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">{org?.organization_name ?? 'Unknown'}</h2>
          </div>
          <AssignmentMethodBadge method={verification.assignment_method} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span>{org?.country?.name ?? '—'}</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span>Reg: {org?.registration_number ?? '—'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Status:</span>
            <span className="capitalize">{verification.status?.replace(/_/g, ' ')}</span>
          </div>
        </div>
      </div>

      {/* Tabs — GAP-10: 4 tabs including stubs */}
      <Tabs defaultValue="checks">
        <TabsList>
          <TabsTrigger value="org-details">Org Details</TabsTrigger>
          <TabsTrigger value="checks">Verification Checks</TabsTrigger>
          <TabsTrigger value="history">Assignment History</TabsTrigger>
          <TabsTrigger value="comms">Registrant Comms</TabsTrigger>
        </TabsList>

        <TabsContent value="org-details">
          <div className="py-8 text-center text-muted-foreground text-sm">
            Organization details will be displayed here in a future release.
          </div>
        </TabsContent>

        <TabsContent value="checks">
          <VerificationChecksPanel
            checks={checks}
            isEditable={isEditable}
          />
        </TabsContent>

        <TabsContent value="history">
          <AssignmentHistoryTab history={history} />
        </TabsContent>

        <TabsContent value="comms">
          <div className="py-8 text-center text-muted-foreground text-sm">
            Registrant communications will be available in a future release.
          </div>
        </TabsContent>
      </Tabs>

      {/* Action Bar — STATE 1 only */}
      {isEditable && (
        <VerificationActionBar
          verificationId={verification.id}
          orgName={org?.organization_name ?? 'Unknown'}
          checks={checks}
          reassignmentCount={verification.reassignment_count}
          currentAssignment={currentAssignment}
        />
      )}
    </div>
  );
}

export default function VerificationDetailPage() {
  return (
    <FeatureErrorBoundary featureName="Verification Detail">
      <VerificationDetailContent />
    </FeatureErrorBoundary>
  );
}
