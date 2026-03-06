import { useParams, useNavigate } from 'react-router-dom';
import { useVerificationDetail } from '@/hooks/queries/useVerificationDashboard';
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

/**
 * SCR-03-03: Verification Detail Page
 * Supports 3 states: EDIT (1), READ-ONLY (2), BLOCKED (3)
 */
export default function VerificationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useVerificationDetail(id);

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

  const { verification, checks, history, currentAssignment, viewState, assignedAdminName } = data;
  const org = verification.organization;
  const isEditable = viewState === 1;

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
        <AssignedStateBanner state={viewState} assignedAdminName={assignedAdminName ?? undefined} />
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

      {/* Tabs */}
      <Tabs defaultValue="checks">
        <TabsList>
          <TabsTrigger value="checks">Verification Checks</TabsTrigger>
          <TabsTrigger value="history">Assignment History</TabsTrigger>
        </TabsList>

        <TabsContent value="checks">
          <VerificationChecksPanel
            checks={checks}
            isEditable={isEditable}
          />
        </TabsContent>

        <TabsContent value="history">
          <AssignmentHistoryTab history={history} />
        </TabsContent>
      </Tabs>

      {/* Action Bar — STATE 1 only */}
      {isEditable && (
        <VerificationActionBar
          verificationId={verification.id}
          checks={checks}
          reassignmentCount={verification.reassignment_count}
          currentAssignment={currentAssignment}
        />
      )}
    </div>
  );
}
