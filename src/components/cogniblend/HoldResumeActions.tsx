/**
 * HoldResumeActions — Reusable On Hold / Resume / Cancel button group with modals.
 *
 * Props:
 *   - challengeId, challengeTitle, currentPhase, phaseStatus
 *   - userId (authenticated user)
 *   - userRoleCodes — role codes the user holds for this challenge (for cancel gating)
 *
 * Renders:
 *   - "Put On Hold" (amber outline, Pause icon) when phase_status = 'ACTIVE'
 *   - "Resume" (green, Play icon) when phase_status = 'ON_HOLD'
 *   - "Cancel Challenge" (red outline, X icon) when ACTIVE or ON_HOLD + role permitted
 *   - On Hold modal with required reason text area (min 50 chars)
 *   - Cancel modal with red warning and required reason (min 100 chars)
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Pause, Play, X, Loader2, AlertTriangle } from 'lucide-react';
import { usePutOnHold, useResumeChallenge } from '@/hooks/cogniblend/useChallengeHold';
import { useCancelChallenge, canCancelChallenge } from '@/hooks/cogniblend/useCancelChallenge';

/* ── Props ────────────────────────────────────────────────── */

interface HoldResumeActionsProps {
  challengeId: string;
  challengeTitle: string;
  currentPhase: number;
  phaseStatus: string | null;
  userId: string;
  /** Role codes the user holds for this challenge. Required for cancel permission. */
  userRoleCodes?: string[];
}

/* ── Component ───────────────────────────────────────────── */

export function HoldResumeActions({
  challengeId,
  challengeTitle,
  currentPhase,
  phaseStatus,
  userId,
  userRoleCodes = [],
}: HoldResumeActionsProps) {
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [holdReason, setHoldReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const putOnHold = usePutOnHold();
  const resumeChallenge = useResumeChallenge();
  const cancelChallenge = useCancelChallenge();

  const isActive = phaseStatus === 'ACTIVE';
  const isOnHold = phaseStatus === 'ON_HOLD';
  const canCancel = (isActive || isOnHold) && canCancelChallenge(currentPhase, userRoleCodes);

  const handleConfirmHold = () => {
    putOnHold.mutate(
      {
        challengeId,
        challengeTitle,
        currentPhase,
        userId,
        reason: holdReason.trim(),
      },
      {
        onSuccess: () => {
          setShowHoldModal(false);
          setHoldReason('');
        },
      },
    );
  };

  const handleResume = () => {
    resumeChallenge.mutate({
      challengeId,
      challengeTitle,
      currentPhase,
      userId,
    });
  };

  const handleConfirmCancel = () => {
    cancelChallenge.mutate(
      {
        challengeId,
        challengeTitle,
        currentPhase,
        userId,
        reason: cancelReason.trim(),
      },
      {
        onSuccess: () => {
          setShowCancelModal(false);
          setCancelReason('');
        },
      },
    );
  };

  const holdReasonValid = holdReason.trim().length >= 50;
  const cancelReasonValid = cancelReason.trim().length >= 100;

  return (
    <>
      {/* Put On Hold button — visible when ACTIVE */}
      {isActive && (
        <Button
          variant="outline"
          size="sm"
          className="border-[hsl(38,80%,50%)] text-[hsl(38,68%,35%)] hover:bg-[hsl(38,80%,50%)]/10"
          onClick={() => setShowHoldModal(true)}
        >
          <Pause className="h-4 w-4 mr-1.5" />
          <span className="hidden lg:inline">Put On Hold</span>
        </Button>
      )}

      {/* Resume button — visible when ON_HOLD */}
      {isOnHold && (
        <Button
          size="sm"
          className="bg-[hsl(142,60%,40%)] text-white hover:bg-[hsl(142,60%,35%)]"
          onClick={handleResume}
          disabled={resumeChallenge.isPending}
        >
          {resumeChallenge.isPending ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <Play className="h-4 w-4 mr-1.5" />
          )}
          <span className="hidden lg:inline">Resume</span>
        </Button>
      )}

      {/* Cancel Challenge button — visible when ACTIVE or ON_HOLD + role permitted */}
      {canCancel && (
        <Button
          variant="outline"
          size="sm"
          className="border-destructive text-destructive hover:bg-destructive/10"
          onClick={() => setShowCancelModal(true)}
        >
          <X className="h-4 w-4 mr-1.5" />
          <span className="hidden lg:inline">Cancel Challenge</span>
        </Button>
      )}

      {/* ── Hold Modal ────────────────────────────────────── */}
      <Dialog open={showHoldModal} onOpenChange={setShowHoldModal}>
        <DialogContent className="w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle>Put Challenge On Hold</DialogTitle>
            <DialogDescription>
              This will pause the challenge and all active SLA timers. All role
              holders will be notified.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto py-4 space-y-3">
            <div className="space-y-2">
              <Label htmlFor="hold-reason">
                Reason <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="hold-reason"
                placeholder="Explain why this challenge is being put on hold (min 50 characters)..."
                value={holdReason}
                onChange={(e) => setHoldReason(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">
                {holdReason.trim().length} / 50 min
              </p>
            </div>
          </div>

          <DialogFooter className="shrink-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowHoldModal(false);
                setHoldReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-[hsl(38,80%,50%)] text-white hover:bg-[hsl(38,80%,45%)]"
              onClick={handleConfirmHold}
              disabled={!holdReasonValid || putOnHold.isPending}
            >
              {putOnHold.isPending ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Pause className="h-4 w-4 mr-1.5" />
              )}
              Confirm Hold
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Cancel Modal ──────────────────────────────────── */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent className="w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Cancel Challenge
            </DialogTitle>
            <DialogDescription>
              This action is permanent. The challenge cannot be restarted.
            </DialogDescription>
          </DialogHeader>

          {/* Red warning banner */}
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3">
            <p className="text-sm font-medium text-destructive">
              Cancel this challenge? This action is permanent. The challenge
              cannot be restarted. All role holders will be notified.
            </p>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto py-4 space-y-3">
            <div className="space-y-2">
              <Label htmlFor="cancel-reason">
                Cancellation Reason <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="cancel-reason"
                placeholder="Provide a detailed reason for cancellation (min 100 characters)..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={5}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">
                {cancelReason.trim().length} / 100 min
              </p>
            </div>
          </div>

          <DialogFooter className="shrink-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowCancelModal(false);
                setCancelReason('');
              }}
            >
              Go Back
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmCancel}
              disabled={!cancelReasonValid || cancelChallenge.isPending}
            >
              {cancelChallenge.isPending ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <X className="h-4 w-4 mr-1.5" />
              )}
              Confirm Cancellation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
