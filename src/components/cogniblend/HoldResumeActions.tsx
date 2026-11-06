/**
 * HoldResumeActions — Reusable On Hold / Resume / Cancel button group.
 *
 * Props:
 *   - challengeId, challengeTitle, currentPhase, phaseStatus
 *   - userId (authenticated user)
 *
 * Renders:
 *   - "Put On Hold" (amber outline, Pause icon) when phase_status = 'ACTIVE'
 *   - "Resume" (green, Play icon) when phase_status = 'ON_HOLD'
 *   - CancelChallengeAction — cancel rights per the agreed rule
 *     (see services/cogniblend/lifecycle/cancelRights.ts)
 *   - On Hold modal with required reason text area (min 50 chars)
 */

import { useConfigNumber } from '@/hooks/queries/useMpaConfig';
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
import { Pause, Play, Loader2 } from 'lucide-react';
import { usePutOnHold, useResumeChallenge } from '@/hooks/cogniblend/useChallengeHold';
import { CancelChallengeAction } from '@/components/cogniblend/CancelChallengeAction';

/* ── Props ────────────────────────────────────────────────── */

interface HoldResumeActionsProps {
  challengeId: string;
  challengeTitle: string;
  currentPhase: number;
  phaseStatus: string | null;
  userId: string;
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
  const minHoldReason = useConfigNumber('hold_reason_min_length');

  const putOnHold = usePutOnHold();
  const resumeChallenge = useResumeChallenge();

  const isActive = phaseStatus === 'ACTIVE';
  const isOnHold = phaseStatus === 'ON_HOLD';

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

  const holdReasonValid = holdReason.trim().length >= minHoldReason;

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

      {/* Cancel Challenge — gated by the agreed cancel-rights rule */}
      <CancelChallengeAction
        challengeId={challengeId}
        challengeTitle={challengeTitle}
        userId={userId}
        visible={isActive || isOnHold}
      />

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
                placeholder={`Explain why this challenge is being put on hold (min ${minHoldReason} characters)...`}
                value={holdReason}
                onChange={(e) => setHoldReason(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">
                {holdReason.trim().length} / {minHoldReason} min
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

    </>
  );
}
