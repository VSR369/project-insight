import { Badge } from '@/components/ui/badge';
import { Clock, ShieldCheck, AlertTriangle } from 'lucide-react';
import type { EscrowRecord } from '@/lib/cogniblend/curationTypes';
import type { EscrowAggregateSummary, EscrowInstallmentRecord } from '@/services/cogniblend/escrowInstallments/escrowInstallmentTypes';

interface PreviewEscrowSectionProps {
  escrow: EscrowRecord | null;
  fcComplete: boolean;
  isControlled: boolean;
  installmentSummary?: EscrowAggregateSummary | null;
  installments?: EscrowInstallmentRecord[];
}

export function PreviewEscrowSection({ escrow, fcComplete, isControlled, installmentSummary, installments = [] }: PreviewEscrowSectionProps) {
  if (!isControlled) {
    return <div className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><p className="text-sm text-emerald-700">Escrow not required for this governance mode.</p></div>;
  }

  if (installmentSummary && installments.length > 0) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={installmentSummary.status === 'FUNDED' ? 'default' : 'secondary'}>{installmentSummary.status.replace(/_/g, ' ')}</Badge>
          <span className="text-xs text-muted-foreground">{installmentSummary.fundedCount} funded · {installmentSummary.pendingCount} pending</span>
        </div>
        <div className="grid grid-cols-1 gap-3 text-sm lg:grid-cols-3">
          <div><p className="text-xs text-muted-foreground">Scheduled</p><p className="font-mono font-medium">{installments[0]?.currency ?? escrow?.currency ?? 'USD'} {installmentSummary.totalScheduled.toLocaleString()}</p></div>
          <div><p className="text-xs text-muted-foreground">Funded</p><p className="font-mono font-medium">{installments[0]?.currency ?? escrow?.currency ?? 'USD'} {installmentSummary.totalFunded.toLocaleString()}</p></div>
          <div><p className="text-xs text-muted-foreground">Remaining</p><p className="font-mono font-medium">{installments[0]?.currency ?? escrow?.currency ?? 'USD'} {installmentSummary.remainingAmount.toLocaleString()}</p></div>
        </div>
        <div className="space-y-2">
          {installments.map((installment) => <div key={installment.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"><div><p className="font-medium">{installment.schedule_label}</p><p className="text-xs text-muted-foreground">{installment.trigger_event ?? '—'}</p></div><span className="font-mono">{installment.currency} {installment.scheduled_amount.toLocaleString()} · {installment.status}</span></div>)}
        </div>
      </div>
    );
  }

  if (!fcComplete || !escrow) {
    return <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/30 dark:bg-amber-900/10"><div className="flex items-center gap-2 text-amber-800 dark:text-amber-400"><Clock className="h-4 w-4" /><span className="text-sm font-medium">Escrow Pending</span></div><p className="text-xs text-amber-700 dark:text-amber-300">Finance Coordinator has not yet confirmed the escrow deposit for this CONTROLLED governance challenge.</p></div>;
  }

  const isFunded = escrow.escrow_status === 'FUNDED';
  return <div className="space-y-3"><Badge className={isFunded ? 'bg-emerald-100 text-emerald-800 border-emerald-300 text-xs hover:bg-emerald-100' : 'text-xs text-amber-700 border-amber-300'} variant={isFunded ? 'default' : 'outline'}>{isFunded ? <><ShieldCheck className="mr-1 h-3 w-3" />FUNDED</> : <><AlertTriangle className="mr-1 h-3 w-3" />{escrow.escrow_status}</>}</Badge>{isFunded ? <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm"><div><p className="text-xs text-muted-foreground">Deposit Amount</p><p className="font-medium">{escrow.currency ?? '$'} {escrow.deposit_amount.toLocaleString()}</p></div>{escrow.bank_name ? <div><p className="text-xs text-muted-foreground">Bank</p><p className="font-medium">{escrow.bank_name}</p></div> : null}{escrow.deposit_date ? <div><p className="text-xs text-muted-foreground">Deposit Date</p><p>{new Date(escrow.deposit_date).toLocaleDateString()}</p></div> : null}{escrow.deposit_reference ? <div className="col-span-2"><p className="text-xs text-muted-foreground">Reference</p><p className="font-mono text-xs">{escrow.deposit_reference}</p></div> : null}</div> : null}</div>;
}
