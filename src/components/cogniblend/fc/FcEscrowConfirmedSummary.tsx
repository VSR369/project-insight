/**
 * FcEscrowConfirmedSummary — Read-only success card shown after the
 * escrow deposit has been confirmed (escrow_status = 'FUNDED').
 */
import { CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { EscrowRecord } from '@/hooks/cogniblend/useEscrowDeposit';

interface FcEscrowConfirmedSummaryProps {
  escrow: EscrowRecord | null | undefined;
}

export function FcEscrowConfirmedSummary({ escrow }: FcEscrowConfirmedSummaryProps) {
  if (!escrow) return null;
  const currency = escrow.currency ?? 'USD';
  const amount = Number(escrow.deposit_amount ?? 0);

  return (
    <Card className="border-emerald-200 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/30">
      <CardContent className="py-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
              Escrow Deposit Confirmed
            </p>
            <p className="text-sm text-emerald-800 dark:text-emerald-300">
              <span className="font-mono font-semibold">
                {currency} {amount.toLocaleString()}
              </span>{' '}
              deposited
              {escrow.bank_name && <> via <span className="font-medium">{escrow.bank_name}</span></>}
              {escrow.deposit_reference && (
                <> · Ref: <span className="font-mono">{escrow.deposit_reference}</span></>
              )}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default FcEscrowConfirmedSummary;
