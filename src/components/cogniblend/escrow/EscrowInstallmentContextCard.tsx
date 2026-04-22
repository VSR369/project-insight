import { Badge } from '@/components/ui/badge';
import type { EscrowFundingContextData, EscrowFundingRole } from '@/services/cogniblend/escrowInstallments/escrowInstallmentTypes';

export interface EscrowInstallmentContextCardProps {
  context: EscrowFundingContextData;
  fundingRole: EscrowFundingRole;
}

export function EscrowInstallmentContextCard({ context, fundingRole }: EscrowInstallmentContextCardProps) {
  return (
    <div className="space-y-3 rounded-md border border-border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{context.governanceMode}</Badge>
        <Badge variant="secondary">Funding owner: {fundingRole}</Badge>
      </div>
      <div className="grid grid-cols-1 gap-3 text-sm lg:grid-cols-2">
        <div>
          <p className="text-xs text-muted-foreground">Reward total</p>
          <p className="font-mono font-semibold">{context.currency} {context.rewardTotal.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Schedule rows</p>
          <p className="font-medium">{context.normalizedSchedule.length}</p>
        </div>
      </div>
      {context.creatorEscrowComments ? (
        <div>
          <p className="text-xs text-muted-foreground">Creator escrow comments</p>
          <p className="text-sm whitespace-pre-line">{context.creatorEscrowComments}</p>
        </div>
      ) : null}
      {context.escrowNotes ? (
        <div>
          <p className="text-xs text-muted-foreground">Curator / Creator notes</p>
          <p className="text-sm whitespace-pre-line">{context.escrowNotes}</p>
        </div>
      ) : null}
    </div>
  );
}
