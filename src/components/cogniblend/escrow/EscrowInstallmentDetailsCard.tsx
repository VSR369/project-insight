import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { EscrowInstallmentRecord } from '@/services/cogniblend/escrowInstallments/escrowInstallmentTypes';

interface EscrowInstallmentDetailsCardProps {
  installment: EscrowInstallmentRecord;
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString();
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 lg:flex-row lg:items-start lg:justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground lg:max-w-[60%] lg:text-right">{value || '—'}</span>
    </div>
  );
}

export function EscrowInstallmentDetailsCard({ installment }: EscrowInstallmentDetailsCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Installment {installment.installment_number} details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0 text-sm">
        <DetailRow label="Label" value={installment.schedule_label} />
        <DetailRow label="Trigger" value={installment.trigger_event ?? '—'} />
        <DetailRow label="Amount" value={`${installment.currency} ${installment.scheduled_amount.toLocaleString()}`} />
        <DetailRow label="Bank name" value={installment.bank_name ?? '—'} />
        <DetailRow label="Branch" value={installment.bank_branch ?? '—'} />
        <DetailRow label="Bank address" value={installment.bank_address ?? '—'} />
        <DetailRow label="Account" value={installment.account_number_masked ?? '—'} />
        <DetailRow label="IFSC / SWIFT" value={installment.ifsc_swift_code ?? '—'} />
        <DetailRow label="Deposit date" value={formatDate(installment.deposit_date)} />
        <DetailRow label="Deposit reference" value={installment.deposit_reference ?? '—'} />
        <DetailRow label="Proof file" value={installment.proof_file_name ?? '—'} />
        <DetailRow label="Notes" value={installment.fc_notes ?? '—'} />
        <DetailRow label="Funded by" value={installment.funded_by_role ?? '—'} />
        <DetailRow label="Funded at" value={formatDate(installment.funded_at)} />
      </CardContent>
    </Card>
  );
}