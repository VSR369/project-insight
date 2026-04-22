import { Badge } from '@/components/ui/badge';
import type { EscrowFundingContextData } from '@/services/cogniblend/escrowInstallments/escrowInstallmentTypes';

export interface EscrowInstallmentSummaryProps {
  context: EscrowFundingContextData;
}

export function EscrowInstallmentSummary({ context }: EscrowInstallmentSummaryProps) {
  return (
    <div className="space-y-3 rounded-md border border-border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={context.aggregate.status === 'FUNDED' ? 'default' : 'secondary'}>
          {context.aggregate.status.replace(/_/g, ' ')}
        </Badge>
        <span className="text-sm text-muted-foreground">
          {context.aggregate.fundedCount} funded · {context.aggregate.pendingCount} pending
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 text-sm lg:grid-cols-3">
        <div>
          <p className="text-xs text-muted-foreground">Scheduled</p>
          <p className="font-mono font-semibold">{context.currency} {context.aggregate.totalScheduled.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Funded</p>
          <p className="font-mono font-semibold">{context.currency} {context.aggregate.totalFunded.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Remaining</p>
          <p className="font-mono font-semibold">{context.currency} {context.aggregate.remainingAmount.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
