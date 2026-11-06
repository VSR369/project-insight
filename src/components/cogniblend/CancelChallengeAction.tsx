/**
 * CancelChallengeAction — Cancel button + confirmation dialog.
 *
 * Visibility is driven by the agreed cancel-rights rule (see
 * cancelRights.ts); the cancel_challenge RPC enforces the same rule
 * server-side. The cancellation reason is the written request and is
 * recorded in the audit trail.
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
import { X, Loader2, AlertTriangle } from 'lucide-react';
import { useConfigNumber } from '@/hooks/queries/useMpaConfig';
import { useCancelChallenge } from '@/hooks/cogniblend/useCancelChallenge';
import { useCancelRights } from '@/hooks/queries/useCancelRights';
import { CANCEL_DENIAL_MESSAGES } from '@/services/cogniblend/lifecycle/cancelRights';

/* ── Props ────────────────────────────────────────────────── */

interface CancelChallengeActionProps {
  challengeId: string;
  challengeTitle: string;
  userId: string;
  /** Outer gate from the parent (e.g. phase ACTIVE or ON_HOLD). */
  visible: boolean;
}

/* ── Component ───────────────────────────────────────────── */

export function CancelChallengeAction({
  challengeId,
  challengeTitle,
  userId,
  visible,
}: CancelChallengeActionProps) {
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const minCancelReason = useConfigNumber('cancel_reason_min_length');

  const cancelRights = useCancelRights(challengeId, userId);
  const cancelChallenge = useCancelChallenge();

  const handleConfirmCancel = () => {
    cancelChallenge.mutate(
      { challengeId, reason: cancelReason.trim() },
      {
        onSuccess: () => {
          setShowCancelModal(false);
          setCancelReason('');
        },
      },
    );
  };

  const cancelReasonValid = cancelReason.trim().length >= minCancelReason;
  const rights = cancelRights.data;

  if (!visible || !rights?.allowed) return null;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="border-destructive text-destructive hover:bg-destructive/10"
        onClick={() => setShowCancelModal(true)}
      >
        <X className="h-4 w-4 mr-1.5" />
        <span className="hidden lg:inline">Cancel Challenge</span>
      </Button>

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
                placeholder={`Provide a detailed reason for cancellation (min ${minCancelReason} characters)...`}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={5}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">
                {cancelReason.trim().length} / {minCancelReason} min
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

export { CANCEL_DENIAL_MESSAGES };
