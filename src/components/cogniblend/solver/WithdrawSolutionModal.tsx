/**
 * WithdrawSolutionModal — Context-aware withdrawal dialog.
 *
 * Three tiers:
 * - FREE: Pre-shortlist, no penalty
 * - NOTICE: Post-shortlist, forfeits spot
 * - PENALTY: Post-payment, potential payment return
 *
 * Material amendment window overrides penalty messaging.
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Loader2, ShieldAlert, DollarSign } from 'lucide-react';
import type { WithdrawalContext } from '@/hooks/cogniblend/useWithdrawSolution';

interface WithdrawSolutionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: WithdrawalContext;
  onConfirm: (reason: string) => void;
  isPending: boolean;
}

const MIN_REASON_CHARS = 20;

export function WithdrawSolutionModal({
  open,
  onOpenChange,
  context,
  onConfirm,
  isPending,
}: WithdrawSolutionModalProps) {
  const [reason, setReason] = useState('');
  const isValid = reason.trim().length >= MIN_REASON_CHARS;

  const handleConfirm = () => {
    onConfirm(reason.trim());
    setReason('');
  };

  const handleClose = (openState: boolean) => {
    if (!openState) setReason('');
    onOpenChange(openState);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>Withdraw Solution</DialogTitle>
          <DialogDescription className="sr-only">
            Confirm withdrawal of your solution submission.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto py-2 space-y-4">
          {/* Tier-specific warning */}
          {context.tier === 'FREE' && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-foreground">
                Withdraw your abstract? This is permanent for this challenge. You will not be
                able to re-submit once withdrawn.
              </p>
            </div>
          )}

          {context.tier === 'NOTICE' && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <ShieldAlert className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm text-foreground font-medium">
                  You have been shortlisted.
                </p>
                <p className="text-sm text-foreground">
                  Withdrawing now will forfeit your spot on the shortlist. The challenge
                  team will be notified. This action is permanent.
                </p>
              </div>
            </div>
          )}

          {context.tier === 'PENALTY' && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <DollarSign className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm text-foreground font-medium">
                  You have received a partial payment
                  {context.paymentAmount != null && ` of $${context.paymentAmount.toLocaleString()}`}.
                </p>

                {context.isMaterialAmendmentWindow ? (
                  <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20">
                    <p className="text-sm text-foreground">
                      This withdrawal is within the material amendment window
                      {context.amendmentDeadline && (
                        <span className="text-muted-foreground">
                          {' '}(until {new Date(context.amendmentDeadline).toLocaleDateString()})
                        </span>
                      )}. <strong>No payment return required.</strong>
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-foreground">
                    You may be required to return the partial payment. This withdrawal will
                    be flagged for Finance Coordinator review.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Reason input */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Withdrawal Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please explain why you are withdrawing (min 20 characters)..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              {reason.trim().length}/{MIN_REASON_CHARS} characters minimum
            </p>
          </div>
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isValid || isPending}
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
            {isPending ? 'Withdrawing...' : 'Confirm Withdrawal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
