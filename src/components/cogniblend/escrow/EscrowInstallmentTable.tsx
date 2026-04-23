import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { EscrowInstallmentRecord } from '@/services/cogniblend/escrowInstallments/escrowInstallmentTypes';

export interface EscrowInstallmentTableProps {
  installments: EscrowInstallmentRecord[];
  selectedInstallmentId: string | null;
  onSelect: (installment: EscrowInstallmentRecord) => void;
  canSelect: boolean;
  editableInstallmentIds: string[];
  isFinalReadOnly: boolean;
}

export function EscrowInstallmentTable({ installments, selectedInstallmentId, onSelect, canSelect, editableInstallmentIds, isFinalReadOnly }: EscrowInstallmentTableProps) {
  return (
    <div className="relative w-full overflow-auto rounded-md border border-border">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="bg-muted/40 text-left">
          <tr>
            <th className="px-3 py-2 font-medium">#</th>
            <th className="px-3 py-2 font-medium">Label</th>
            <th className="px-3 py-2 font-medium">Trigger</th>
            <th className="px-3 py-2 font-medium">Pct</th>
            <th className="px-3 py-2 font-medium">Amount</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Funded by</th>
            <th className="px-3 py-2 font-medium text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {installments.map((installment) => {
            const isSelected = installment.id === selectedInstallmentId;
            const isPending = installment.status === 'PENDING';
            const isEditable = editableInstallmentIds.includes(installment.id);
            const actionLabel = isPending ? 'Enter details' : isEditable ? 'View / Edit' : 'View';
            return (
              <tr key={installment.id} className={isSelected ? 'bg-muted/40' : 'border-t'}>
                <td className="px-3 py-3">{installment.installment_number}</td>
                <td className="px-3 py-3 font-medium">{installment.schedule_label}</td>
                <td className="px-3 py-3 text-muted-foreground">{installment.trigger_event ?? '—'}</td>
                <td className="px-3 py-3">{installment.scheduled_pct}%</td>
                <td className="px-3 py-3 font-mono">{installment.currency} {installment.scheduled_amount.toLocaleString()}</td>
                <td className="px-3 py-3">
                  <Badge variant={isPending ? 'secondary' : 'default'}>{installment.status}</Badge>
                </td>
                <td className="px-3 py-3">{installment.funded_by_role ?? '—'}</td>
                <td className="px-3 py-3 text-right">
                  <Button
                    type="button"
                    size="sm"
                    variant={isSelected ? 'default' : 'outline'}
                    disabled={!canSelect}
                    onClick={() => onSelect(installment)}
                  >
                    {isSelected ? 'Selected' : isFinalReadOnly && !isPending ? 'View' : actionLabel}
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
