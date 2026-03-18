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

/* ─── Types ──────────────────────────────────────────────── */

interface SolverEnrollmentCTAProps {
  challengeId: string;
  tenantId: string;
  enrollmentModel: string;
  isEligible: boolean;
  eligibilityLabel?: string;
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

/* ─── Legal Acceptance Dialog (BR-LGL-007) ───────────────── */

function LegalAcceptDialog({
  open,
  onOpenChange,
  onAccept,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAccept: (scrollConfirmed: boolean) => void;
  isSubmitting: boolean;
}) {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [scrollConfirmed, setScrollConfirmed] = useState(false);

  // Reset state when dialog opens/closes
  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setTermsAccepted(false);
      setScrollConfirmed(false);
    }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Legal Terms & NDA
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Please read the terms below. You must scroll to the bottom before accepting.
          </p>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto py-2">
          <ScrollToAcceptLegal
            documentContent={NDA_CONTENT}
            accepted={termsAccepted}
            onAcceptedChange={setTermsAccepted}
            onScrollConfirmed={setScrollConfirmed}
            maxHeight={400}
          />
        </div>

        <DialogFooter className="shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!termsAccepted || !scrollConfirmed || isSubmitting}
            onClick={() => onAccept(scrollConfirmed)}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Accept & Enroll
          </Button>
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
}: SolverEnrollmentCTAProps) {
  const { user } = useAuth();
  const { data: enrollment, isLoading: statusLoading } = useSolverEnrollmentStatus(challengeId, user?.id);
  const enrollMutation = useEnrollInChallenge();
  const withdrawMutation = useWithdrawEnrollment();
  const legalAcceptanceMutation = useRecordLegalAcceptance();

  const [legalDialogOpen, setLegalDialogOpen] = useState(false);

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
  const handleEnroll = () => {
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

  const handleLegalAccept = (scrollConfirmed: boolean) => {
    // 1. Record in legal_acceptance_ledger with scroll_confirmed + IP
    legalAcceptanceMutation.mutate({
      challengeId,
      userId: user.id,
      documentType: 'enrollment_nda',
      documentName: 'NDA & IP Terms',
      tier: 'TIER_1',
      scrollConfirmed,
    });

    // 2. Create enrollment
    enrollMutation.mutate(
      {
        challengeId,
        solverId: user.id,
        tenantId,
        enrollmentModel: model,
        autoApprove: true,
        legalAccepted: true,
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
      <LegalAcceptDialog
        open={legalDialogOpen}
        onOpenChange={setLegalDialogOpen}
        onAccept={handleLegalAccept}
        isSubmitting={isProcessing}
      />
    </div>
  );
}
