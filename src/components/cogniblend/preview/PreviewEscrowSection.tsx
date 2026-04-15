/**
 * PreviewEscrowSection — Conditional FC section rendering.
 */

import { Badge } from '@/components/ui/badge';
import { Clock, ShieldCheck, AlertTriangle } from 'lucide-react';
import type { EscrowRecord } from '@/lib/cogniblend/curationTypes';

interface PreviewEscrowSectionProps {
  escrow: EscrowRecord | null;
  fcComplete: boolean;
  isControlled: boolean;
}

export function PreviewEscrowSection({ escrow, fcComplete, isControlled }: PreviewEscrowSectionProps) {
  if (!isControlled) {
    return (
      <div className="flex items-start gap-2">
        <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
        <p className="text-sm text-emerald-700">Escrow not required for this governance mode.</p>
      </div>
    );
  }

  if (!fcComplete || !escrow) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800/30 p-4 space-y-2">
        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
          <Clock className="h-4 w-4" />
          <span className="font-medium text-sm">Escrow Pending</span>
        </div>
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Finance Coordinator has not yet confirmed the escrow deposit for this CONTROLLED governance challenge.
        </p>
      </div>
    );
  }

  const isFunded = escrow.escrow_status === 'FUNDED';

  return (
    <div className="space-y-3">
      <Badge className={isFunded
        ? 'bg-emerald-100 text-emerald-800 border-emerald-300 text-xs hover:bg-emerald-100'
        : 'text-xs text-amber-700 border-amber-300'
      } variant={isFunded ? 'default' : 'outline'}>
        {isFunded ? <><ShieldCheck className="h-3 w-3 mr-1" />FUNDED</> : <><AlertTriangle className="h-3 w-3 mr-1" />{escrow.escrow_status}</>}
      </Badge>
      {isFunded && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div><p className="text-xs text-muted-foreground">Deposit Amount</p><p className="font-medium">{escrow.currency ?? '$'} {escrow.deposit_amount.toLocaleString()}</p></div>
          {escrow.bank_name && <div><p className="text-xs text-muted-foreground">Bank</p><p className="font-medium">{escrow.bank_name}</p></div>}
          {escrow.deposit_date && <div><p className="text-xs text-muted-foreground">Deposit Date</p><p>{new Date(escrow.deposit_date).toLocaleDateString()}</p></div>}
          {escrow.deposit_reference && <div className="col-span-2"><p className="text-xs text-muted-foreground">Reference</p><p className="font-mono text-xs">{escrow.deposit_reference}</p></div>}
        </div>
      )}
    </div>
  );
}
