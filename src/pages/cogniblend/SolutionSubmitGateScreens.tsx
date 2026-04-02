/**
 * SolutionSubmitGateScreens — Conditional gate screens for SolutionSubmitPage.
 * Enrollment required, withdrawn, re-acceptance required, already submitted.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SolutionStatusBadge } from '@/components/cogniblend/SolutionStatusBadge';
import { WithdrawSolutionModal } from '@/components/cogniblend/solver/WithdrawSolutionModal';
import { LegalReAcceptModal } from '@/components/cogniblend/solver/LegalReAcceptModal';
import { ChallengeClarityFeedback } from '@/components/cogniblend/solver/ChallengeClarityFeedback';
import { toast } from 'sonner';
import {
  AlertTriangle, LogOut, ArrowLeft, CheckCircle, FileText,
} from 'lucide-react';

/* ── Loading Screen ────────────────────────────────────── */

export function SolutionSubmitLoading() {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96" />
      <Skeleton className="h-[400px] w-full" />
    </div>
  );
}

/* ── Enrollment Required ───────────────────────────────── */

export function EnrollmentRequiredScreen({ challengeId }: { challengeId?: string }) {
  const navigate = useNavigate();
  return (
    <div className="max-w-3xl mx-auto p-6">
      <Card className="border-destructive/30">
        <CardContent className="p-8 text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
          <h2 className="text-xl font-semibold text-foreground">Enrollment Required</h2>
          <p className="text-muted-foreground">
            You must be enrolled and approved for this challenge before submitting a solution.
          </p>
          <Button onClick={() => navigate(`/cogni/challenges/${challengeId}/view`)}>
            Go to Challenge & Enroll
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Withdrawn Screen ──────────────────────────────────── */

export function WithdrawnScreen({ challengeId }: { challengeId?: string }) {
  const navigate = useNavigate();
  return (
    <div className="max-w-3xl mx-auto p-6">
      <Card className="border-destructive/30">
        <CardContent className="p-8 text-center space-y-4">
          <LogOut className="h-12 w-12 text-destructive mx-auto" />
          <h2 className="text-xl font-semibold text-foreground">Solution Withdrawn</h2>
          <Badge variant="destructive" className="text-sm">Withdrawn</Badge>
          <p className="text-muted-foreground">
            Your solution for this challenge has been withdrawn. This action is permanent.
          </p>
          <Button variant="outline" onClick={() => navigate(`/cogni/challenges/${challengeId}/view`)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Challenge
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Re-Acceptance Required ────────────────────────────── */

interface ReacceptanceScreenProps {
  challengeId: string;
  userId: string;
  record: any;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function ReacceptanceScreen({ challengeId, userId, record, open, onOpenChange }: ReacceptanceScreenProps) {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <Card className="border-[hsl(38,60%,70%)]/40">
        <CardContent className="p-8 text-center space-y-4">
          <FileText className="h-12 w-12 text-[hsl(38,68%,41%)] mx-auto" />
          <h2 className="text-xl font-semibold text-foreground">Legal Re-Acceptance Required</h2>
          <p className="text-muted-foreground">
            The legal terms for this challenge have been updated. You must accept the updated terms before submitting.
          </p>
          <Badge variant="outline" className="text-sm border-[hsl(38,60%,70%)] text-[hsl(38,68%,41%)]">
            {record.days_remaining} day{record.days_remaining !== 1 ? 's' : ''} remaining
          </Badge>
          <div className="pt-2">
            <Button onClick={() => onOpenChange(true)}>Review & Accept Terms</Button>
          </div>
        </CardContent>
      </Card>
      <LegalReAcceptModal
        open={open}
        onOpenChange={onOpenChange}
        challengeId={challengeId}
        userId={userId}
        record={record}
      />
    </div>
  );
}

/* ── Already Submitted Screen ──────────────────────────── */

interface AlreadySubmittedScreenProps {
  challengeId: string;
  userId: string;
  existingSolution: any;
  isEnterprise: boolean;
  withdrawalCtx: any;
  withdrawMutation: any;
}

export function AlreadySubmittedScreen({
  challengeId, userId, existingSolution,
  isEnterprise, withdrawalCtx, withdrawMutation,
}: AlreadySubmittedScreenProps) {
  const navigate = useNavigate();
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);

  const handleWithdrawConfirm = (reason: string) => {
    if (!existingSolution?.id || !challengeId || !userId || !withdrawalCtx) return;
    withdrawMutation.mutate({
      solutionId: existingSolution.id,
      challengeId,
      userId,
      reason,
      tier: withdrawalCtx.tier,
      isMaterialAmendmentWindow: withdrawalCtx.isMaterialAmendmentWindow,
    });
    setWithdrawModalOpen(false);
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <Card className="border-primary/30">
        <CardContent className="p-8 text-center space-y-4">
          <CheckCircle className="h-12 w-12 text-primary mx-auto" />
          <h2 className="text-xl font-semibold text-foreground">
            {isEnterprise ? 'Abstract Submitted' : 'Solution Submitted'}
          </h2>
          <SolutionStatusBadge
            currentPhase={existingSolution?.current_phase ?? null}
            phaseStatus={existingSolution?.phase_status ?? null}
            selectionStatus={existingSolution?.selection_status ?? null}
            className="text-sm"
          />
          <p className="text-muted-foreground">
            Your {isEnterprise ? 'abstract' : 'solution'} was submitted on{' '}
            {existingSolution?.submitted_at
              ? new Date(existingSolution.submitted_at).toLocaleDateString()
              : 'N/A'}.
          </p>
          {isEnterprise && (
            <p className="text-xs text-muted-foreground">
              If shortlisted, you will be notified to upload your full solution.
            </p>
          )}
          <div className="flex flex-col lg:flex-row items-center justify-center gap-3 pt-2">
            <Button variant="outline" onClick={() => navigate(`/cogni/challenges/${challengeId}/view`)}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Challenge
            </Button>
            {withdrawalCtx?.canWithdraw && (
              <Button
                variant="outline"
                className="border-destructive/50 text-destructive hover:bg-destructive/10"
                onClick={() => setWithdrawModalOpen(true)}
                disabled={withdrawMutation.isPending}
              >
                <LogOut className="h-4 w-4 mr-1.5" />
                Withdraw
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {challengeId && userId && (
        <ChallengeClarityFeedback
          challengeId={challengeId}
          solverId={userId}
          onComplete={() => toast.success('Thanks for helping improve challenge quality!')}
          onSkip={() => {}}
        />
      )}

      {withdrawalCtx && (
        <WithdrawSolutionModal
          open={withdrawModalOpen}
          onOpenChange={setWithdrawModalOpen}
          context={withdrawalCtx}
          onConfirm={handleWithdrawConfirm}
          isPending={withdrawMutation.isPending}
        />
      )}
    </div>
  );
}
