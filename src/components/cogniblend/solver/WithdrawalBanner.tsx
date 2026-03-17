/**
 * WithdrawalBanner — Displays material amendment withdrawal countdown
 * and withdraw button on the solver's challenge view.
 */

import { useState, useEffect } from 'react';
import { AlertTriangle, Loader2, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useWithdrawSolution } from '@/hooks/cogniblend/useSolverAmendmentStatus';

/* ─── Types ──────────────────────────────────────────────── */

interface WithdrawalBannerProps {
  challengeId: string;
  challengeTitle: string;
  userId: string;
  solutionId: string;
  amendmentId: string;
  withdrawalDeadline: string;
  daysRemaining: number;
  scopeAreas: string[];
  reason: string | null;
}

/* ─── Countdown hook ─────────────────────────────────────── */

function useWithdrawalCountdown(deadline: string) {
  const [text, setText] = useState('');

  useEffect(() => {
    const tick = () => {
      const diff = new Date(deadline).getTime() - Date.now();
      if (diff <= 0) {
        setText('Withdrawal window closed');
        return;
      }
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      setText(`${d} day${d !== 1 ? 's' : ''}, ${h} hour${h !== 1 ? 's' : ''} remaining`);
    };
    tick();
    const interval = setInterval(tick, 60_000);
    return () => clearInterval(interval);
  }, [deadline]);

  return text;
}

/* ─── Component ──────────────────────────────────────────── */

export function WithdrawalBanner({
  challengeId,
  challengeTitle,
  userId,
  solutionId,
  amendmentId,
  withdrawalDeadline,
  daysRemaining,
  scopeAreas,
  reason,
}: WithdrawalBannerProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const withdrawMutation = useWithdrawSolution();
  const countdown = useWithdrawalCountdown(withdrawalDeadline);

  const handleWithdraw = () => {
    withdrawMutation.mutate(
      { challengeId, challengeTitle, solutionId, userId, amendmentId },
      { onSuccess: () => setConfirmOpen(false) },
    );
  };

  return (
    <>
      <div className="rounded-xl border-2 border-[hsl(38,60%,60%)] bg-[hsl(38,60%,97%)] p-4 space-y-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-[hsl(38,70%,45%)] shrink-0 mt-0.5" />
          <div className="space-y-1 flex-1">
            <p className="text-sm font-bold text-foreground">
              Material Amendment Made
            </p>
            <p className="text-xs text-muted-foreground">
              Changes to: <span className="font-medium text-foreground">{scopeAreas.join(', ')}</span>
              {reason && (
                <span className="block mt-1">Reason: {reason}</span>
              )}
            </p>
            <p className="text-sm font-semibold text-[hsl(38,70%,40%)] mt-2">
              You have {countdown} to withdraw without penalty.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="border-destructive text-destructive hover:bg-destructive/10"
          onClick={() => setConfirmOpen(true)}
          disabled={withdrawMutation.isPending}
        >
          <LogOut className="h-3.5 w-3.5 mr-1.5" />
          Withdraw
        </Button>
      </div>

      {/* Confirmation dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw from Challenge?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                You are withdrawing from &quot;{challengeTitle}&quot; due to material amendments.
              </span>
              <span className="block font-medium text-foreground">
                This action is permanent. No penalty will be applied.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={withdrawMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleWithdraw}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={withdrawMutation.isPending}
            >
              {withdrawMutation.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Confirm Withdrawal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
