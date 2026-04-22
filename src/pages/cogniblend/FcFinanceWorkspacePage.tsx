/**
 * FcFinanceWorkspacePage — Per-challenge Finance Coordinator workspace.
 * Route: /cogni/challenges/:id/finance
 *
 * Mirrors LcLegalWorkspacePage: header, step indicator, tabs (Finance
 * Review + Curated Challenge), submit footer. All escrow rules and the
 * complete_financial_review RPC remain unchanged.
 */
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  Shield,
} from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { useUserChallengeRoles } from '@/hooks/cogniblend/useUserChallengeRoles';
import { usePwaStatus } from '@/hooks/cogniblend/usePwaStatus';
import { useEscrowDeposit } from '@/hooks/cogniblend/useEscrowDeposit';
import { useChallengeForFC } from '@/hooks/cogniblend/useFcFinanceData';
import { useFcEscrowConfirm } from '@/hooks/cogniblend/useFcEscrowConfirm';
import { useFcFinanceSubmit } from '@/hooks/cogniblend/useFcFinanceSubmit';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { PwaAcceptanceGate } from '@/components/cogniblend/workforce/PwaAcceptanceGate';
import { WorkflowProgressBanner } from '@/components/cogniblend/WorkflowProgressBanner';
import { FcChallengeDetailView } from '@/components/cogniblend/fc/FcChallengeDetailView';
import { RecommendedEscrowCard } from '@/components/cogniblend/fc/RecommendedEscrowCard';
import { FcFinanceStepIndicator } from '@/components/cogniblend/fc/FcFinanceStepIndicator';
import { FcLegalDocsViewer } from '@/components/cogniblend/fc/FcLegalDocsViewer';
import { FcFinanceSubmitFooter } from '@/components/cogniblend/fc/FcFinanceSubmitFooter';
import { FcEscrowConfirmedSummary } from '@/components/cogniblend/fc/FcEscrowConfirmedSummary';
import { EscrowDepositForm } from '@/pages/cogniblend/EscrowDepositForm';

import { resolveGovernanceMode } from '@/lib/governanceMode';

export default function FcFinanceWorkspacePage() {
  /* ── 1. Routing & auth ──────────────────────────────────── */
  const { id: challengeId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  /* ── 2. Data fetches ────────────────────────────────────── */
  const { data: roles } = useUserChallengeRoles(user?.id, challengeId);
  const { data: challenge, isLoading: challengeLoading } = useChallengeForFC(challengeId);
  const { data: escrowData } = useEscrowDeposit(challengeId, user?.id);
  const { data: hasPwa, isLoading: pwaLoading } = usePwaStatus(user?.id);

  /* ── 3. Local UI state ──────────────────────────────────── */
  const [pwaAccepted, setPwaAccepted] = useState(false);

  /* ── 4. Derived values needed by hooks ──────────────────── */
  const rewardTotal = escrowData?.rewardTotal ?? 0;
  const escrowRecord = escrowData?.escrow ?? null;
  const escrowStatus = escrowRecord?.escrow_status ?? null;
  const isFunded = escrowStatus === 'FUNDED';
  const fcDone = !!challenge?.fc_compliance_complete;

  /* ── 5. Mutations / submission hooks ────────────────────── */
  const escrow = useFcEscrowConfirm({
    challengeId: challengeId ?? '',
    userId: user?.id,
    escrowId: escrowRecord?.id ?? null,
    rewardTotal,
  });
  const { submit, submitting, gateFailures } = useFcFinanceSubmit({
    challengeId,
    userId: user?.id,
  });

  /* ── 6. Memoised display values ─────────────────────────── */
  const govMode = useMemo(
    () =>
      resolveGovernanceMode(
        challenge?.governance_mode_override ?? challenge?.governance_profile,
      ),
    [challenge?.governance_mode_override, challenge?.governance_profile],
  );

  const currentStep: 1 | 2 | 3 = fcDone ? 3 : isFunded ? 3 : 2;
  const hasAccess = roles?.includes('FC') ?? false;

  /* ── 7. Conditional returns (after all hooks) ───────────── */
  if (challengeLoading || pwaLoading) {
    return (
      <div className="p-6 space-y-4 max-w-5xl mx-auto">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!hasPwa && !pwaAccepted) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <PwaAcceptanceGate userId={user?.id ?? ''} onAccepted={() => setPwaAccepted(true)} />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <Card>
          <CardContent className="py-10 text-center">
            <AlertCircle className="h-10 w-10 mx-auto text-destructive mb-3" />
            <p className="text-lg font-semibold">Access Denied</p>
            <p className="text-sm text-muted-foreground mt-1">
              You need the Finance Coordinator (FC) role to access this workspace.
            </p>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/cogni/dashboard')}>
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (govMode === 'QUICK' || govMode === 'STRUCTURED') {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <Card>
          <CardContent className="py-10 text-center">
            <Shield className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-lg font-semibold text-foreground">
              Not applicable for {govMode.charAt(0) + govMode.slice(1).toLowerCase()} governance
            </p>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              Finance Coordinator review is only required for Controlled or Enterprise
              governance modes.
            </p>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/cogni/fc-queue')}>
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to FC Queue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if ((challenge?.current_phase ?? 0) < 3) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <Card>
          <CardContent className="py-10 text-center">
            <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-lg font-semibold text-foreground">
              Challenge not ready for finance review
            </p>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              Currently at Phase {challenge?.current_phase ?? '?'}. Finance review applies once
              the challenge reaches Phase 3.
            </p>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/cogni/fc-queue')}>
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to FC Queue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ── 8. Render ──────────────────────────────────────────── */
  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Link
          to="/cogni/fc-queue"
          className="text-muted-foreground hover:text-foreground"
          aria-label="Back to FC queue"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Banknote className="h-5 w-5 text-primary" />
            Finance Workspace
          </h1>
          <p className="text-sm text-muted-foreground">
            Challenge:{' '}
            <span className="font-medium text-foreground">{challenge?.title ?? 'Untitled'}</span>
          </p>
        </div>
      </div>

      {fcDone && (
        <Alert className="border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
          <Banknote className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <AlertTitle>Financial Review Complete — Read Only</AlertTitle>
          <AlertDescription className="text-emerald-800 dark:text-emerald-300">
            You have submitted your escrow confirmation for this challenge.
          </AlertDescription>
        </Alert>
      )}

      <div className="rounded-lg border bg-card p-3">
        <FcFinanceStepIndicator currentStep={currentStep} />
      </div>

      <WorkflowProgressBanner step={3} />

      <Tabs defaultValue="finance" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-flex">
          <TabsTrigger value="finance">Finance Review</TabsTrigger>
          <TabsTrigger value="challenge">Curated Challenge</TabsTrigger>
        </TabsList>

        <TabsContent value="finance" className="space-y-6 mt-4">
          <FcLegalDocsViewer challengeId={challengeId!} />

          <RecommendedEscrowCard challengeId={challengeId!} />

          {!fcDone && !isFunded && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-primary" />
                  Escrow Deposit Confirmation
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Confirm the escrow deposit details. The deposit amount must exactly match
                  the challenge reward total.
                </p>
              </CardHeader>
              <CardContent>
                <EscrowDepositForm
                  form={escrow.form}
                  onSubmit={escrow.handleSubmit}
                  isPending={escrow.confirmEscrow.isPending}
                  proofFile={escrow.proofFile}
                  onProofFileChange={escrow.setProofFile}
                  proofUploading={escrow.proofUploading}
                  governanceMode={govMode}
                />
              </CardContent>
            </Card>
          )}

          {(fcDone || isFunded) && <FcEscrowConfirmedSummary escrow={escrowRecord} />}
        </TabsContent>

        <TabsContent value="challenge" className="mt-4">
          <FcChallengeDetailView challengeId={challengeId!} defaultOpen />
        </TabsContent>
      </Tabs>

      <Separator />

      {gateFailures.length > 0 && (
        <div className="space-y-3">
          {gateFailures.map((failure, idx) => (
            <Alert key={idx} variant="destructive" className="border-destructive/30">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="text-sm font-semibold">Validation Failed</AlertTitle>
              <AlertDescription>
                <p className="text-sm">{failure}</p>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      <FcFinanceSubmitFooter
        challengeId={challengeId!}
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
