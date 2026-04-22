import type { EscrowAggregateSummary, EscrowInstallmentRecord } from './escrowInstallmentTypes';

function sumAmounts(installments: EscrowInstallmentRecord[], field: 'scheduled_amount' | 'deposit_amount'): number {
  return installments.reduce((sum, installment) => sum + Number(installment[field] ?? 0), 0);
}

export function deriveEscrowAggregateSummary(
  installments: EscrowInstallmentRecord[],
): EscrowAggregateSummary {
  const totalScheduled = sumAmounts(installments, 'scheduled_amount');
  const fundedInstallments = installments.filter((installment) => installment.status === 'FUNDED');
  const totalFunded = sumAmounts(fundedInstallments, 'deposit_amount');
  const fundedCount = fundedInstallments.length;
  const pendingCount = installments.filter((installment) => installment.status !== 'FUNDED').length;

  const status = fundedCount === 0
    ? 'PENDING'
    : pendingCount === 0
      ? 'FUNDED'
      : 'PARTIALLY_FUNDED';

  return {
    totalScheduled,
    totalFunded,
    remainingAmount: Math.max(totalScheduled - totalFunded, 0),
    fundedCount,
    pendingCount,
    status,
  };
}