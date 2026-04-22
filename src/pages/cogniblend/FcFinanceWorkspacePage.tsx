import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Banknote, RefreshCcw, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserChallengeRoles } from '@/hooks/cogniblend/useUserChallengeRoles';
import { usePwaStatus } from '@/hooks/cogniblend/usePwaStatus';
import { useChallengeForFC } from '@/hooks/cogniblend/useFcFinanceData';
import { useEscrowFundingContext } from '@/hooks/cogniblend/useEscrowFundingContext';
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
import { handleQueryError } from '@/lib/errorHandler';
import { resolveGovernanceMode } from '@/lib/governanceMode';
import { deriveFcWorkspaceViewState } from '@/services/cogniblend/fcFinanceWorkspaceViewService';

export default function FcFinanceWorkspacePage() {
  const { id: challengeId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: roles } = useUserChallengeRoles(user?.id, challengeId);
  const challengeQuery = useChallengeForFC(challengeId);
  const escrowContextQuery = useEscrowFundingContext(challengeId);
  const orgFinanceQuery = useOrgFinanceConfig(challengeQuery.data?.organization_id ?? '');
  const { data: hasPwa, isLoading: pwaLoading } = usePwaStatus(user?.id);
  const [pwaAccepted, setPwaAccepted] = useState(false);

  const challenge = challengeQuery.data;
  const fundingContext = escrowContextQuery.data;
  const rewardTotal = fundingContext?.rewardTotal ?? 0;
  const escrowStatus = fundingContext?.aggregate.status ?? fundingContext?.legacyEscrowStatus ?? null;
  const fcDone = !!challenge?.fc_compliance_complete;
  const hasAccess = roles?.includes('FC') ?? false;
  const govMode = resolveGovernanceMode(challenge?.governance_mode_override ?? challenge?.governance_profile);
  const workspaceState = deriveFcWorkspaceViewState({ currentPhase: challenge?.current_phase, escrowStatus, fcComplianceComplete: fcDone });
  const canSubmitPath = fundingContext ? (fundingContext.installments.length > 0 ? fundingContext.aggregate.status === 'FUNDED' : fundingContext.legacyEscrowStatus === 'FUNDED') : false;
  const { submit, submitting, gateFailures } = useFcFinanceSubmit({ challengeId, userId: user?.id, canSubmitPath });

  const pageError = useMemo(() => {
    if (challengeQuery.error) return handleQueryError(challengeQuery.error, { operation: 'fetch_fc_workspace_challenge', component: 'FcFinanceWorkspacePage' }, false);
    if (escrowContextQuery.error) return handleQueryError(escrowContextQuery.error, { operation: 'fetch_fc_workspace_escrow_context', component: 'FcFinanceWorkspacePage' }, false);
    return null;
  }, [challengeQuery.error, escrowContextQuery.error]);

  if (challengeQuery.isLoading || escrowContextQuery.isLoading || pwaLoading || orgFinanceQuery.isLoading) {
    return <div className="mx-auto max-w-5xl space-y-4 p-6"><Skeleton className="h-8 w-64" /><Skeleton className="h-40 w-full" /><Skeleton className="h-40 w-full" /></div>;
  }

  if (pageError) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <Card><CardContent className="py-10 text-center"><AlertCircle className="mx-auto mb-3 h-10 w-10 text-destructive" /><p className="text-lg font-semibold">Could not load the finance workspace</p><p className="mt-1 text-sm text-muted-foreground">Retry the page data fetch. Reference ID: {pageError.correlationId}</p><Button variant="outline" className="mt-4" onClick={() => { void challengeQuery.refetch(); void escrowContextQuery.refetch(); }}><RefreshCcw className="mr-2 h-4 w-4" />Retry</Button></CardContent></Card>
      </div>
    );
  }

  if (!hasPwa && !pwaAccepted) return <div className="mx-auto max-w-2xl p-6"><PwaAcceptanceGate userId={user?.id ?? ''} onAccepted={() => setPwaAccepted(true)} /></div>;
  if (!hasAccess) return <div className="mx-auto max-w-5xl p-6"><Card><CardContent className="py-10 text-center"><AlertCircle className="mx-auto mb-3 h-10 w-10 text-destructive" /><p className="text-lg font-semibold">Access Denied</p><p className="mt-1 text-sm text-muted-foreground">You need the Finance Coordinator (FC) role to access this workspace.</p><Button variant="outline" className="mt-4" onClick={() => navigate('/cogni/dashboard')}>Return to Dashboard</Button></CardContent></Card></div>;
  if (govMode === 'QUICK' || govMode === 'STRUCTURED') return <div className="mx-auto max-w-5xl p-6"><Card><CardContent className="py-10 text-center"><Shield className="mx-auto mb-3 h-10 w-10 text-muted-foreground" /><p className="text-lg font-semibold text-foreground">Not applicable for {govMode.charAt(0) + govMode.slice(1).toLowerCase()} governance</p><p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{govMode === 'STRUCTURED' ? 'In Structured governance, escrow is handled by the Curator. Finance Coordinator workflow applies only to Controlled governance.' : 'Finance Coordinator workflow applies only to Controlled governance.'}</p><Button variant="outline" className="mt-4" onClick={() => navigate('/cogni/fc-queue')}><ArrowLeft className="mr-1.5 h-4 w-4" />Back to FC Queue</Button></CardContent></Card></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 lg:p-6">
      <div className="flex items-center gap-3">
        <Link to="/cogni/fc-queue" className="text-muted-foreground hover:text-foreground" aria-label="Back to FC queue"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="flex-1"><h1 className="flex items-center gap-2 text-xl font-bold text-foreground"><Banknote className="h-5 w-5 text-primary" />Finance Workspace</h1><p className="text-sm text-muted-foreground">Challenge: <span className="font-medium text-foreground">{challenge?.title ?? 'Untitled'}</span></p></div>
      </div>
      {fcDone ? <Alert><Banknote className="h-4 w-4" /><AlertTitle>Financial Review Complete — Read Only</AlertTitle><AlertDescription>You have submitted your escrow confirmation for this challenge.</AlertDescription></Alert> : null}
      <div className="rounded-lg border bg-card p-3"><FcFinanceStepIndicator currentStep={workspaceState.currentStep} /></div>
      <WorkflowProgressBanner step={3} />
      <Tabs defaultValue="escrow" className="w-full">
        <TabsList className="grid w-full grid-cols-1 lg:inline-grid lg:w-auto lg:grid-cols-3">
          <TabsTrigger value="escrow">Escrow Review</TabsTrigger>
          <TabsTrigger value="challenge">Curated Challenge</TabsTrigger>
          <TabsTrigger value="legal">Legal Agreement</TabsTrigger>
        </TabsList>
        <TabsContent value="escrow" className="mt-4">
          <FcEscrowReviewTab challengeId={challengeId ?? ''} userId={user?.id ?? ''} governanceMode={govMode} currentPhase={challenge?.current_phase} rewardTotal={rewardTotal} isPreview={workspaceState.isPreview} isFunded={canSubmitPath} fcDone={fcDone} />
        </TabsContent>
        <TabsContent value="challenge" className="mt-4"><FcChallengeDetailView challengeId={challengeId ?? ''} defaultOpen /></TabsContent>
        <TabsContent value="legal" className="mt-4"><FcLegalAgreementTab challengeId={challengeId ?? ''} /></TabsContent>
      </Tabs>
      <Separator />
      {gateFailures.length > 0 ? <div className="space-y-3">{gateFailures.map((failure) => <Alert key={failure} variant="destructive" className="border-destructive/30"><AlertCircle className="h-4 w-4" /><AlertTitle className="text-sm font-semibold">Validation Failed</AlertTitle><AlertDescription><p className="text-sm">{failure}</p></AlertDescription></Alert>)}</div> : null}
      <FcFinanceSubmitFooter challengeId={challengeId ?? ''} userId={user?.id ?? ''} escrowStatus={escrowStatus} fcComplianceComplete={challenge?.fc_compliance_complete} canSubmitPath={canSubmitPath} submitting={submitting} onSubmit={submit} />
    </div>
  );
}
