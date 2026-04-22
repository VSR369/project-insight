import type { EscrowFundingContextData } from '@/services/cogniblend/escrowInstallments/escrowInstallmentTypes';

export interface EscrowLegacySummaryProps {
  context: EscrowFundingContextData;
}

export function EscrowLegacySummary({ context }: EscrowLegacySummaryProps) {
  if (!context.legacyEscrowRecord) return null;

  return (
    <div className="space-y-3 rounded-md border border-border p-4">
      <div>
        <p className="text-sm font-semibold">Legacy escrow record</p>
        <p className="text-xs text-muted-foreground">This challenge still uses the original single-record funding model.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 text-sm lg:grid-cols-2">
        <div>
          <p className="text-xs text-muted-foreground">Status</p>
          <p className="font-medium">{context.legacyEscrowRecord.escrow_status}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Amount</p>
          <p className="font-mono font-medium">{context.legacyEscrowRecord.currency ?? context.currency} {context.legacyEscrowRecord.deposit_amount.toLocaleString()}</p>
        </div>
        {context.legacyEscrowRecord.bank_name ? (
          <div>
            <p className="text-xs text-muted-foreground">Bank</p>
            <p>{context.legacyEscrowRecord.bank_name}</p>
          </div>
        ) : null}
        {context.legacyEscrowRecord.deposit_reference ? (
          <div>
            <p className="text-xs text-muted-foreground">Reference</p>
            <p className="font-mono text-xs">{context.legacyEscrowRecord.deposit_reference}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
