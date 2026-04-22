import { format } from 'date-fns';
import { CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { EscrowRecord } from '@/hooks/cogniblend/useEscrowDeposit';

interface FcEscrowConfirmedSummaryProps {
  escrow: EscrowRecord | null | undefined;
}

function formatMoney(currency: string | undefined, amount: number): string {
  return `${currency ?? 'USD'} ${amount.toLocaleString()}`;
}

export function FcEscrowConfirmedSummary({ escrow }: FcEscrowConfirmedSummaryProps) {
  if (!escrow) return null;

  const amount = Number(escrow.deposit_amount ?? 0);
  const details = [
    { label: 'Bank', value: escrow.bank_name ?? '—' },
    { label: 'Branch', value: escrow.bank_branch ?? '—' },
    { label: 'Reference', value: escrow.deposit_reference ?? '—' },
    { label: 'Account ref', value: escrow.account_number_masked ?? '—' },
    { label: 'IFSC / SWIFT', value: escrow.ifsc_swift_code ?? '—' },
    {
      label: 'Deposit date',
      value: escrow.deposit_date ? format(new Date(escrow.deposit_date), 'MMM d, yyyy') : '—',
    },
  ];

  return (
    <Card>
      <CardContent className="space-y-4 py-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Escrow Deposit Confirmed</p>
            <p className="text-sm text-muted-foreground">
              {formatMoney(escrow.currency, amount)} deposited{escrow.bank_name ? ` via ${escrow.bank_name}` : ''}.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 text-sm lg:grid-cols-2">
          {details.map((detail) => (
            <div key={detail.label} className="rounded-md border bg-muted/30 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{detail.label}</p>
              <p className="mt-1 font-medium text-foreground">{detail.value}</p>
            </div>
          ))}
        </div>

        {escrow.fc_notes && (
          <div className="rounded-md border bg-muted/30 px-3 py-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">FC notes</p>
            <p className="mt-1 whitespace-pre-line text-sm text-foreground">{escrow.fc_notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default FcEscrowConfirmedSummary;
