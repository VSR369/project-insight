/**
 * SolverEnrollmentCTA — Enrollment flow component for the public challenge detail page.
 * Replaces the direct "Submit Solution" button with model-aware enrollment steps.
 *
 * Enrollment models:
 *   OPEN  → instant enrollment
 *   DR    → legal acceptance (NDA) → enrollment
 *   OC    → application → pending approval
 *   CE    → L2+ check → legal acceptance → enrollment
 *   IO    → no enroll button; invited see "Accept Invitation"
 *
 * For AGG-model challenges: after NDA, shows Anti-Disintermediation Agreement.
 */

import { useState } from 'react';
import {
  CheckCircle2, Clock, UserPlus, ShieldCheck, Lock,
  Loader2, XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import {
  useSolverEnrollmentStatus,
  useEnrollInChallenge,
  useWithdrawEnrollment,
} from '@/hooks/cogniblend/useSolverEnrollment';
import { useRecordLegalAcceptance } from '@/hooks/cogniblend/useLegalAcceptance';
import { ScrollToAcceptLegal } from './ScrollToAcceptLegal';
import { useLegalGateAction } from '@/hooks/legal/useLegalGateAction';
import { LegalGateModal } from '@/components/legal/LegalGateModal';
import { CpaEnrollmentGate } from './CpaEnrollmentGate';
import { toast } from 'sonner';

/* ─── Types ──────────────────────────────────────────────── */

interface SolverEnrollmentCTAProps {
  challengeId: string;
  tenantId: string;
  enrollmentModel: string;
  isEligible: boolean;
  eligibilityLabel?: string;
  /** Whether this challenge uses the AGG operating model */
  isAggModel?: boolean;
}

/* ─── NDA Legal Content (placeholder) ────────────────────── */

const NDA_CONTENT = `NON-DISCLOSURE AGREEMENT

By enrolling in this challenge, you agree to the following terms:

1. CONFIDENTIALITY: All challenge materials, problem statements, evaluation criteria, and related documentation are confidential and proprietary to the challenge sponsor.

2. NON-DISCLOSURE: You shall not disclose, publish, or otherwise reveal any confidential information received during your participation to any third party without prior written consent.

3. INTELLECTUAL PROPERTY: Your submitted solutions remain your intellectual property until and unless a prize is awarded and accepted, at which point the IP terms specified in the challenge documentation shall apply.

4. DATA PROTECTION: You agree that your enrollment data, submission metadata, and evaluation results may be processed in accordance with the platform's privacy policy.

5. COMPLIANCE: You agree to comply with all applicable laws and regulations in your jurisdiction regarding the subject matter of the challenge.

6. TERMINATION: Either party may terminate participation at any time. Confidentiality obligations survive termination for a period of 2 years.

7. NO WARRANTY: Challenge materials are provided "as-is." The sponsor makes no warranties regarding the accuracy or completeness of challenge documentation.

8. LIMITATION OF LIABILITY: Neither party shall be liable for indirect, incidental, or consequential damages arising from participation.

9. GOVERNING LAW: This agreement shall be governed by the laws of the jurisdiction specified in the challenge documentation.

10. ENTIRE AGREEMENT: This NDA, together with the challenge-specific terms, constitutes the entire agreement between the parties.

By clicking "Accept & Enroll," you acknowledge that you have read, understood, and agree to be bound by these terms.`;

/* ─── Anti-Disintermediation Agreement Content ───────────── */

const AD_AGREEMENT_CONTENT = `ANTI-DISINTERMEDIATION AGREEMENT

This Anti-Disintermediation Agreement ("Agreement") is entered into as a condition of participation in this Aggregator-model challenge.

1. NO OUTSIDE COMMUNICATION: The Solver agrees not to initiate, engage in, or facilitate any direct communication with the Challenge Sponsor (Seeker) outside of the platform's designated communication channels. All communications regarding the challenge must occur exclusively through the platform Q&A system, messaging tools, and official submission channels.

2. NO PLATFORM BYPASS: The Solver agrees not to bypass the platform for direct engagement with the Challenge Sponsor, including but not limited to:
   a) Soliciting or accepting direct contracts related to the challenge subject matter
   b) Sharing contact information (email, phone, social media) with the Sponsor
   c) Arranging meetings, calls, or communications outside the platform
   d) Using third-party intermediaries to circumvent this restriction

3. RESTRICTION PERIOD: This restriction applies from the date of enrollment through 12 months after the challenge conclusion or the Solver's withdrawal, whichever is later.

4. TIERED PENALTIES FOR VIOLATION:

   FIRST OFFENSE — WARNING:
   Upon first verified violation, the Solver will receive a formal written warning. The warning will be recorded in the Solver's platform profile and visible to platform administrators.

   SECOND OFFENSE — CHALLENGE DISQUALIFICATION:
   Upon second verified violation (whether in the same or different challenge), the Solver will be immediately disqualified from the current challenge. Any submitted solutions will be withdrawn. The Solver forfeits eligibility for any awards or compensation.

   THIRD OFFENSE — PLATFORM BAN:
   Upon third verified violation, the Solver's account will be permanently suspended. All active enrollments will be terminated. The Solver will be barred from future participation on the platform.

5. MONITORING: The platform employs automated and manual monitoring of communications to detect potential violations. Flagged communications will be reviewed by the platform compliance team before any enforcement action.

6. REPORTING: Solvers are encouraged to report suspected violations by other participants. Reports are confidential and protected from retaliation.

7. EXCEPTIONS: Platform-facilitated introductions, post-award engagement procedures, and communications expressly authorized by the platform governance team are exempt from this Agreement.

8. ACKNOWLEDGMENT: By accepting this Agreement, the Solver acknowledges understanding of the tiered penalty structure and agrees that enforcement actions are at the platform's reasonable discretion.

By clicking "Accept," you confirm that you have read, understood, and agree to be bound by this Anti-Disintermediation Agreement.`;

/* ─── Legal Acceptance Dialog (BR-LGL-007) ───────────────── */

function LegalAcceptDialog({
  open,
  onOpenChange,
  onAccept,
  isSubmitting,
  showAdAgreement,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAccept: (scrollConfirmed: boolean, adAccepted: boolean) => void;
  isSubmitting: boolean;
  showAdAgreement: boolean;
}) {
  const [step, setStep] = useState<'nda' | 'ad'>('nda');
  const [ndaAccepted, setNdaAccepted] = useState(false);
  const [ndaScrollConfirmed, setNdaScrollConfirmed] = useState(false);
  const [adAccepted, setAdAccepted] = useState(false);
  const [adScrollConfirmed, setAdScrollConfirmed] = useState(false);

  // Reset state when dialog opens/closes
  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setStep('nda');
      setNdaAccepted(false);
      setNdaScrollConfirmed(false);
      setAdAccepted(false);
      setAdScrollConfirmed(false);
    }
    onOpenChange(v);
  };

  const handleNdaNext = () => {
    if (showAdAgreement) {
      setStep('ad');
    } else {
      onAccept(ndaScrollConfirmed, false);
    }
  };

  const handleAdAccept = () => {
    onAccept(ndaScrollConfirmed, true);
  };

  const isNdaStep = step === 'nda';
  const stepLabel = showAdAgreement ? (isNdaStep ? 'Step 1 of 2' : 'Step 2 of 2') : '';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {isNdaStep ? 'Legal Terms & NDA' : 'Anti-Disintermediation Agreement'}
          </DialogTitle>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {isNdaStep
                ? 'Please read the terms below. You must scroll to the bottom before accepting.'
                : 'This AGG-model challenge requires acceptance of anti-disintermediation terms.'}
            </p>
            {stepLabel && (
              <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0 ml-2">
                {stepLabel}
              </span>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto py-2">
          {isNdaStep ? (
            <ScrollToAcceptLegal
              documentContent={NDA_CONTENT}
              accepted={ndaAccepted}
              onAcceptedChange={setNdaAccepted}
              onScrollConfirmed={setNdaScrollConfirmed}
              maxHeight={400}
            />
          ) : (
            <ScrollToAcceptLegal
              documentContent={AD_AGREEMENT_CONTENT}
              accepted={adAccepted}
              onAcceptedChange={setAdAccepted}
              onScrollConfirmed={setAdScrollConfirmed}
              acceptLabel="I have read and agree to the Anti-Disintermediation Agreement and its tiered penalty structure."
              maxHeight={400}
            />
          )}
        </div>

        <DialogFooter className="shrink-0 gap-2">
          {!isNdaStep && (
            <Button variant="outline" size="sm" onClick={() => setStep('nda')}>
              Back
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          {isNdaStep ? (
            <Button
              size="sm"
              disabled={!ndaAccepted || !ndaScrollConfirmed || isSubmitting}
              onClick={handleNdaNext}
            >
              {showAdAgreement ? 'Continue' : (
                <>
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                  Accept & Enroll
                </>
              )}
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={!adAccepted || !adScrollConfirmed || isSubmitting}
              onClick={handleAdAccept}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Accept & Enroll
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Model labels ───────────────────────────────────────── */

const MODEL_LABELS: Record<string, { label: string; description: string }> = {
  OPEN: { label: 'Open Enrollment', description: 'Click to enroll instantly — no approval required.' },
  DR: { label: 'Direct Registration', description: 'Review and accept NDA + IP terms to enroll.' },
  OC: { label: 'Organization-Curated', description: 'Submit an enrollment request for team approval.' },
  CE: { label: 'Curated Expert', description: 'Platform-verified experts (L2+) — accept legal terms to enroll.' },
  IO: { label: 'Invitation Only', description: 'Only invited solvers can participate.' },
};

/* ─── Component ──────────────────────────────────────────── */

export function SolverEnrollmentCTA({
  challengeId,
  tenantId,
  enrollmentModel,
  isEligible,
  eligibilityLabel,
  isAggModel = false,
}: SolverEnrollmentCTAProps) {
  const { user } = useAuth();
  const { data: enrollment, isLoading: statusLoading } = useSolverEnrollmentStatus(challengeId, user?.id);
  const enrollMutation = useEnrollInChallenge();
  const withdrawMutation = useWithdrawEnrollment();
  const legalAcceptanceMutation = useRecordLegalAcceptance();

  const [legalDialogOpen, setLegalDialogOpen] = useState(false);
  const [showCpaGate, setShowCpaGate] = useState(false);

  // Legal gate for SOLVER_ENROLLMENT trigger (PSA acceptance)
  const solverGate = useLegalGateAction({
    triggerEvent: 'SOLVER_ENROLLMENT',
    challengeId,
    userRole: 'SOLVER',
  });

  // Legal gate for CHALLENGE_JOIN trigger (challenge-specific PSA)
  const joinGate = useLegalGateAction({
    triggerEvent: 'CHALLENGE_JOIN',
    challengeId,
    userRole: 'SOLVER',
  });

  const model = enrollmentModel || 'OPEN';
  const modelInfo = MODEL_LABELS[model] ?? MODEL_LABELS.OPEN;

  /* ── Already enrolled ── */
  if (enrollment) {
    const { status } = enrollment;

    if (status === 'APPROVED') {
      return (
        <div className="space-y-2">
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="py-3 px-4 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-emerald-800">Enrolled</p>
                <p className="text-xs text-emerald-600">You are enrolled and can submit solutions.</p>
              </div>
            </CardContent>
          </Card>
          <Button size="lg" className="w-full shrink-0">
            Submit Solution
          </Button>
        </div>
      );
    }

    if (status === 'PENDING') {
      return (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-amber-800">Enrollment Pending</p>
              <p className="text-xs text-amber-600">Your enrollment request is awaiting approval.</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground shrink-0"
              disabled={withdrawMutation.isPending}
              onClick={() => withdrawMutation.mutate({ enrollmentId: enrollment.id, challengeId })}
            >
              Withdraw
            </Button>
          </CardContent>
        </Card>
      );
    }

    if (status === 'REJECTED') {
      return (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <XCircle className="h-5 w-5 text-destructive shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-destructive">Enrollment Declined</p>
              <p className="text-xs text-muted-foreground">Your enrollment request was not approved.</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    // WITHDRAWN — allow re-enrollment
  }

  /* ── Not logged in ── */
  if (!user) {
    return (
      <div className="space-y-2">
        <Button size="lg" className="w-full" disabled>
          <Lock className="h-4 w-4 mr-2" /> Sign in to Enroll
        </Button>
        <p className="text-xs text-muted-foreground text-center">{modelInfo.description}</p>
      </div>
    );
  }

  /* ── IO: Invitation Only ── */
  if (model === 'IO') {
    return (
      <div className="space-y-2">
        <Card className="border-border bg-muted/30">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <Lock className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground">Invitation Only</p>
              <p className="text-xs text-muted-foreground">This challenge is restricted to invited solvers.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ── CE: Check eligibility (L2+) ── */
  if (model === 'CE' && !isEligible) {
    return (
      <div className="space-y-2">
        <Card className="border-border bg-muted/30">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground">Curated Experts Only</p>
              <p className="text-xs text-muted-foreground">
                {eligibilityLabel || 'This challenge requires L2+ certification to enroll.'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ── Loading ── */
  if (statusLoading) {
    return (
      <Button size="lg" className="w-full" disabled>
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Checking…
      </Button>
    );
  }

  /* ── Enrollment actions ── */
  const executeEnroll = () => {
    // Models requiring legal acceptance show dialog first
    if (model === 'DR' || model === 'CE') {
      setLegalDialogOpen(true);
      return;
    }

    // OPEN → instant enrollment
    if (model === 'OPEN') {
      enrollMutation.mutate({
        challengeId,
        solverId: user.id,
        tenantId,
        enrollmentModel: model,
        autoApprove: true,
        legalAccepted: false,
      });
      return;
    }

    // OC → pending approval
    if (model === 'OC') {
      enrollMutation.mutate({
        challengeId,
        solverId: user.id,
        tenantId,
        enrollmentModel: model,
        autoApprove: false,
        legalAccepted: false,
      });
    }
  };

  // Gate enrollment behind SOLVER_ENROLLMENT then CHALLENGE_JOIN legal checks
  const handleEnroll = () => {
    solverGate.gateAction(() => {
      joinGate.gateAction(executeEnroll);
    });
  };

  const handleLegalAccept = (scrollConfirmed: boolean, adAccepted: boolean) => {
    // 1. Record NDA in legal_acceptance_ledger
    legalAcceptanceMutation.mutate({
      challengeId,
      userId: user.id,
      documentType: 'enrollment_nda',
      documentName: 'NDA & IP Terms',
      tier: 'TIER_1',
      scrollConfirmed,
    });

    // 2. Record AD agreement if applicable
    if (isAggModel && adAccepted) {
      legalAcceptanceMutation.mutate({
        challengeId,
        userId: user.id,
        documentType: 'anti_disintermediation',
        documentName: 'Anti-Disintermediation Agreement',
        tier: 'TIER_1',
        scrollConfirmed: true,
      });
    }

    // 3. Create enrollment with ad_accepted flag
    enrollMutation.mutate(
      {
        challengeId,
        solverId: user.id,
        tenantId,
        enrollmentModel: model,
        autoApprove: true,
        legalAccepted: true,
        adAccepted: isAggModel ? adAccepted : false,
      },
      {
        onSuccess: () => setLegalDialogOpen(false),
      }
    );
  };

  const isProcessing = enrollMutation.isPending || legalAcceptanceMutation.isPending;

  const buttonLabel =
    model === 'OC' ? 'Request Enrollment' :
    model === 'DR' || model === 'CE' ? 'Enroll (NDA Required)' :
    'Enroll in Challenge';

  return (
    <div className="space-y-2">
      <Button
        size="lg"
        className="w-full"
        onClick={handleEnroll}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <UserPlus className="h-4 w-4 mr-2" />
        )}
        {buttonLabel}
      </Button>
      <p className="text-xs text-muted-foreground text-center">{modelInfo.description}</p>

      {/* Legal acceptance dialog for DR and CE — uses ScrollToAcceptLegal (BR-LGL-007) */}
      {/* For AGG model: shows Anti-Disintermediation Agreement as step 2 */}
      <LegalAcceptDialog
        open={legalDialogOpen}
        onOpenChange={setLegalDialogOpen}
        onAccept={(scrollConfirmed, adAccepted) => {
          handleLegalAccept(scrollConfirmed, adAccepted);
          setShowCpaGate(true);
        }}
        isSubmitting={isProcessing}
        showAdAgreement={isAggModel}
      />

      {/* CPA Enrollment Gate — shown after NDA acceptance */}
      {showCpaGate && user && (
        <Dialog open={showCpaGate} onOpenChange={setShowCpaGate}>
          <DialogContent className="w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            <CpaEnrollmentGate
              challengeId={challengeId}
              userId={user.id}
              onAccepted={() => setShowCpaGate(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* SOLVER_ENROLLMENT legal gate (PSA) */}
      {solverGate.showGate && (
        <LegalGateModal
          triggerEvent={solverGate.triggerEvent}
          challengeId={challengeId}
          userRole="SOLVER"
          onAllAccepted={solverGate.handleAllAccepted}
          onDeclined={() => {
            solverGate.handleDeclined();
            toast.error('You must accept the legal terms to enroll.');
          }}
        />
      )}

      {/* CHALLENGE_JOIN legal gate (challenge-specific PSA) */}
      {joinGate.showGate && (
        <LegalGateModal
          triggerEvent={joinGate.triggerEvent}
          challengeId={challengeId}
          userRole="SOLVER"
          onAllAccepted={joinGate.handleAllAccepted}
          onDeclined={() => {
            joinGate.handleDeclined();
            toast.error('You must accept the challenge-specific legal terms to enroll.');
          }}
        />
      )}
    </div>
  );
}
