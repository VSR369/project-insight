/** Post-publication challenge management for assigned role holders. */
import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { GovernanceProfileBadge } from '@/components/cogniblend/GovernanceProfileBadge';
import { useManageChallenge } from '@/hooks/cogniblend/useManageChallenge';
import { useAuth } from '@/hooks/useAuth';
import { ExtendDeadlineModal } from '@/components/cogniblend/manage/ExtendDeadlineModal';
import { ManageSubmissionsCard } from '@/components/cogniblend/manage/ManageSubmissionsCard';
import { ChallengePackageCard } from '@/components/cogniblend/manage/ChallengePackageCard';
import { WorkflowProgressBanner } from '@/components/cogniblend/WorkflowProgressBanner';
import { AmendmentCard } from '@/components/cogniblend/manage/AmendmentCard';
import { QAManagementCard } from '@/components/cogniblend/manage/QAManagementCard';
import { DuplicateReviewPanel } from '@/components/cogniblend/DuplicateReviewPanel';
import { CreatorApprovalCard } from '@/components/cogniblend/manage/CreatorApprovalCard';
import { generateCorrelationId } from '@/lib/errorHandler';

export default function ChallengeManagePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = useManageChallenge(id, user?.id);
  const [extendModalOpen, setExtendModalOpen] = useState(false);
  const errorCorrelationId = useMemo(() => error ? generateCorrelationId() : null, [error]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6" aria-label="Loading challenge management">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <p className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : 'Failed to load challenge data.'}
        </p>
        {errorCorrelationId && <p className="text-xs text-muted-foreground">Reference: {errorCorrelationId}</p>}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 lg:py-8">
      <WorkflowProgressBanner step={6} />
      <Button variant="ghost" size="sm" onClick={() => navigate('/cogni/portfolio')} className="gap-1.5">
        <ArrowLeft className="h-4 w-4" /> Portfolio
      </Button>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-4">
        <h1 className="text-lg font-bold leading-tight text-foreground lg:text-xl">{data.title}</h1>
        <GovernanceProfileBadge profile={data.governanceProfile} compact />
        <Badge variant="secondary" className="w-fit text-[11px]">{data.masterStatus}</Badge>
      </div>

      {id && <DuplicateReviewPanel challengeId={id} />}
      <ManageSubmissionsCard
        submissions={data.submissions}
        submissionCount={data.submissionCount}
        submissionDeadline={data.submissionDeadline}
        governanceProfile={data.governanceProfile}
        canExtendDeadline={data.canExtendDeadline}
        onExtend={() => setExtendModalOpen(true)}
      />
      <ChallengePackageCard versions={data.packageVersions} />
      <CreatorApprovalCard
        challengeId={data.challengeId}
        operatingModel={data.operatingModel}
        currentPhase={data.currentPhase}
        extendedBrief={data.extendedBrief as import('@/integrations/supabase/types').Json | null}
        userId={user?.id ?? ''}
      />
      <AmendmentCard
        challengeId={data.challengeId}
        challengeTitle={data.title}
        userId={user?.id ?? ''}
        canInitiate={data.canExtendDeadline}
      />
      <QAManagementCard
        challengeId={data.challengeId}
        challengeTitle={data.title}
        userId={user?.id ?? ''}
        governanceProfile={data.governanceProfile}
      />
      <ExtendDeadlineModal
        open={extendModalOpen}
        onOpenChange={setExtendModalOpen}
        challengeId={data.challengeId}
        stageCount={data.stageCount}
        abstractDeadline={data.abstractDeadline}
        solutionDeadline={data.solutionDeadline}
      />
    </div>
  );
}
