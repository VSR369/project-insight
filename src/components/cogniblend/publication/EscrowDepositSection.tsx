/**
 * EscrowDepositSection — Displays escrow status for Enterprise challenges
 * on the Publication Readiness page. FC role can verify deposits.
 */

import { useState } from 'react';
import { ShieldCheck, AlertTriangle, DollarSign, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useEscrowDeposit, useVerifyEscrow } from '@/hooks/cogniblend/useEscrowDeposit';

/* ─── Props ──────────────────────────────────────────────── */

interface EscrowDepositSectionProps {
  challengeId: string;
  userId: string | undefined;
}

/* ─── Component ──────────────────────────────────────────── */

export function EscrowDepositSection({ challengeId, userId }: EscrowDepositSectionProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data, isLoading } = useEscrowDeposit(challengeId, userId);
  const verifyMutation = useVerifyEscrow();

  if (isLoading) {
    return (
      <Card className="border-border">
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const { escrow, rewardTotal, canVerify } = data;
  const isFunded = escrow?.escrow_status === 'FUNDED';
  const displayAmount = isFunded ? escrow!.deposit_amount : rewardTotal;
  const formattedAmount = displayAmount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const handleVerify = () => {
    if (!escrow || !userId) return;
    verifyMutation.mutate({
      escrowId: escrow.id,
      challengeId,
      amount: rewardTotal,
      userId,
    });
    setConfirmOpen(false);
  };

  return (
    <>
      <Card className={cn(
        'border',
        isFunded
          ? 'border-emerald-200 bg-emerald-50/50'
          : 'border-amber-200 bg-amber-50/50'
      )}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <DollarSign className={cn(
              'h-4 w-4',
              isFunded ? 'text-emerald-600' : 'text-amber-600'
            )} />
            Escrow Deposit
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {isFunded ? (
            /* ─── Funded state ─── */
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
              <div className="flex-1 min-w-0 space-y-2">
                <p className="text-sm font-semibold text-emerald-800">
                  Escrow verified: ${formattedAmount} deposited
                </p>
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold hover:bg-emerald-100">
                    <ShieldCheck className="h-3 w-3 mr-1" />
                    Solution Provider Protected
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    This badge will be displayed on the published challenge.
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* ─── Pending state ─── */
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
              <div className="flex-1 min-w-0 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-amber-800">
                    Escrow deposit required: ${formattedAmount}
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    Finance Coordinator must verify the deposit before publication.
                  </p>
                </div>
                {canVerify && (
                  <Button
                    size="sm"
                    onClick={() => setConfirmOpen(true)}
                    disabled={verifyMutation.isPending}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    {verifyMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <DollarSign className="h-4 w-4 mr-1" />
                    )}
                    Verify Escrow Deposit
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Confirmation Modal ─── */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">
              Confirm Escrow Deposit
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Confirm that the escrow deposit of{' '}
              <span className="font-semibold text-foreground">${formattedAmount}</span>{' '}
              has been received?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-muted-foreground">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleVerify}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Confirm Deposit Received
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
