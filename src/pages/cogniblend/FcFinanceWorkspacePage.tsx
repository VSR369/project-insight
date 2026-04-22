import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Banknote, RefreshCcw, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserChallengeRoles } from '@/hooks/cogniblend/useUserChallengeRoles';
import { usePwaStatus } from '@/hooks/cogniblend/usePwaStatus';
import { useEscrowDeposit } from '@/hooks/cogniblend/useEscrowDeposit';
import { useChallengeForFC } from '@/hooks/cogniblend/useFcFinanceData';
import { useFcEscrowConfirm } from '@/hooks/cogniblend/useFcEscrowConfirm';
import { useFcFinanceSubmit } from '@/hooks/cogniblend/useFcFinanceSubmit';
import { useOrgFinanceConfig } from '@/hooks/queries/useOrgFinanceConfig';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PwaAcceptanceGate } from '@/components/cogniblend/workforce/PwaAcceptanceGate';
import { WorkflowProgressBanner } from '@/components/cogniblend/WorkflowProgressBanner';
import { FcChallengeDetailView } from '@/components/cogniblend/fc/FcChallengeDetailView';
import { FcFinanceStepIndicator } from '@/components/cogniblend/fc/FcFinanceStepIndicator';
import { FcFinanceSubmitFooter } from '@/components/cogniblend/fc/FcFinanceSubmitFooter';
import { FcEscrowReviewTab } from '@/components/cogniblend/fc/FcEscrowReviewTab';
import { FcLegalAgreementTab } from '@/components/cogniblend/fc/FcLegalAgreementTab';
import { resolveGovernanceMode } from '@/lib/governanceMode';
import { handleQueryError } from '@/lib/errorHandler';
import { deriveFcWorkspaceViewState } from '@/services/cogniblend/fcFinanceWorkspaceViewService';

export default function FcFinanceWorkspacePage() {
  const { id: challengeId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: roles } = useUserChallengeRoles(user?.id, challengeId);
  const challengeQuery = useChallengeForFC(challengeId);
  const escrowQuery = useEscrowDeposit(challengeId, user?.id);
  const orgFinanceQuery = useOrgFinanceConfig(challengeQuery.data?.organization_id ?? '');
  const { data: hasPwa, isLoading: pwaLoading } = usePwaStatus(user?.id);
  const [pwaAccepted, setPwaAccepted] = useState(false);

  const challenge = challengeQuery.data;
  const escrowData = escrowQuery.data;
  const rewardTotal = escrowData?.rewardTotal ?? 0;
  const escrowRecord = escrowData?.escrow ?? null;
  const escrowStatus = escrowRecord?.escrow_status ?? null;
  const fcDone = !!challenge?.fc_compliance_complete;
  const hasAccess = roles?.includes('FC') ?? false;
  const govMode = resolveGovernanceMode(
    challenge?.governance_mode_override ?? challenge?.governance_profile,
  );
  const workspaceState = deriveFcWorkspaceViewState({
    currentPhase: challenge?.current_phase,
    escrowStatus,
    fcComplianceComplete: fcDone,
  });

  const escrow = useFcEscrowConfirm({
    challengeId: challengeId ?? '',
    userId: user?.id,
    escrowId: escrowRecord?.id ?? null,
    escrowRecord,
    rewardTotal,
    orgFinanceDefaults: orgFinanceQuery.data,
  });
  const { submit, submitting, gateFailures } = useFcFinanceSubmit({ challengeId, userId: user?.id });

  const pageError = useMemo(() => {
    if (challengeQuery.error) {
      return handleQueryError(
        challengeQuery.error,
        { operation: 'fetch_fc_workspace_challenge', component: 'FcFinanceWorkspacePage' },
        false,
      );
    }
    if (escrowQuery.error) {
      return handleQueryError(
        escrowQuery.error,
        { operation: 'fetch_fc_workspace_escrow', component: 'FcFinanceWorkspacePage' },
        false,
      );
    }
    return null;
  }, [challengeQuery.error, escrowQuery.error]);

  if (challengeQuery.isLoading || escrowQuery.isLoading || pwaLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <Card>
          <CardContent className="py-10 text-center">
            <AlertCircle className="mx-auto mb-3 h-10 w-10 text-destructive" />
            <p className="text-lg font-semibold">Could not load the finance workspace</p>
            <p className="mt-1 text-sm text-muted-foreground">Retry the page data fetch. Reference ID: {pageError.correlationId}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                void challengeQuery.refetch();
                void escrowQuery.refetch();
              }}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasPwa && !pwaAccepted) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <PwaAcceptanceGate userId={user?.id ?? ''} onAccepted={() => setPwaAccepted(true)} />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <Card>
          <CardContent className="py-10 text-center">
            <AlertCircle className="mx-auto mb-3 h-10 w-10 text-destructive" />
            <p className="text-lg font-semibold">Access Denied</p>
            <p className="mt-1 text-sm text-muted-foreground">You need the Finance Coordinator (FC) role to access this workspace.</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/cogni/dashboard')}>Return to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (govMode === 'QUICK' || govMode === 'STRUCTURED') {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <Card>
          <CardContent className="py-10 text-center">
            <Shield className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-lg font-semibold text-foreground">Not applicable for {govMode.charAt(0) + govMode.slice(1).toLowerCase()} governance</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Finance Coordinator review is only required for Controlled or Enterprise governance modes.</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/cogni/fc-queue')}>
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back to FC Queue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 lg:p-6">
      <div className="flex items-center gap-3">
        <Link to="/cogni/fc-queue" className="text-muted-foreground hover:text-foreground" aria-label="Back to FC queue">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="flex items-center gap-2 text-xl font-bold text-foreground">
            <Banknote className="h-5 w-5 text-primary" />
            Finance Workspace
          </h1>
          <p className="text-sm text-muted-foreground">Challenge: <span className="font-medium text-foreground">{challenge?.title ?? 'Untitled'}</span></p>
        </div>
      </div>

      {fcDone && (
        <Alert>
          <Banknote className="h-4 w-4" />
          <AlertTitle>Financial Review Complete — Read Only</AlertTitle>
          <AlertDescription>You have submitted your escrow confirmation for this challenge.</AlertDescription>
        </Alert>
      )}

      <div className="rounded-lg border bg-card p-3">
        <FcFinanceStepIndicator currentStep={workspaceState.currentStep} />
      </div>

      <WorkflowProgressBanner step={3} />

      <Tabs defaultValue="escrow" className="w-full">
        <TabsList className="grid w-full grid-cols-1 lg:inline-grid lg:w-auto lg:grid-cols-3">
          <TabsTrigger value="escrow">Escrow Review</TabsTrigger>
          <TabsTrigger value="challenge">Curated Challenge</TabsTrigger>
          <TabsTrigger value="legal">Legal Agreement</TabsTrigger>
        </TabsList>

        <TabsContent value="escrow" className="mt-4">
          <FcEscrowReviewTab
            challengeId={challengeId ?? ''}
            governanceMode={govMode}
            currentPhase={challenge?.current_phase}
            rewardTotal={rewardTotal}
            escrowRecord={escrowRecord}
            isPreview={workspaceState.isPreview}
            canEditDepositFields={workspaceState.canEditDepositFields}
            canUploadProof={workspaceState.canUploadProof}
            canConfirmEscrow={workspaceState.canConfirmEscrow}
            isFunded={workspaceState.isFunded}
            fcDone={fcDone}
            form={escrow.form}
            onSubmit={escrow.handleConfirmSubmit}
            onSaveDraft={escrow.handleDraftSubmit}
            isSavingDraft={escrow.saveDraft.isPending}
            isPending={escrow.confirmEscrow.isPending}
            proofFile={escrow.proofFile}
            onProofFileChange={escrow.setProofFile}
            proofUploading={escrow.proofUploading}
          />
        </TabsContent>
        <TabsContent value="challenge" className="mt-4">
          <FcChallengeDetailView challengeId={challengeId ?? ''} defaultOpen />
        </TabsContent>
        <TabsContent value="legal" className="mt-4">
          <FcLegalAgreementTab challengeId={challengeId ?? ''} />
        </TabsContent>
      </Tabs>

      <Separator />

      {gateFailures.length > 0 && (
        <div className="space-y-3">
          {gateFailures.map((failure) => (
            <Alert key={failure} variant="destructive" className="border-destructive/30">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="text-sm font-semibold">Validation Failed</AlertTitle>
              <AlertDescription><p className="text-sm">{failure}</p></AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      <FcFinanceSubmitFooter
        challengeId={challengeId ?? ''}
        userId={user?.id ?? ''}
        escrowStatus={escrowStatus}
        currentPhase={challenge?.current_phase}
        fcComplianceComplete={challenge?.fc_compliance_complete}
        submitting={submitting}
        onSubmit={submit}
      />
    </div>
  );
}
