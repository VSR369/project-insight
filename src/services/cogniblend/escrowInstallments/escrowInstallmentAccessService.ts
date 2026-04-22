import type {
  EscrowFundingContextData,
  EscrowFundingRole,
  EscrowInstallmentRecord,
} from './escrowInstallmentTypes';
import { canCompleteEscrowPath, canFundInstallment } from './escrowInstallmentValidationService';

export interface EscrowInstallmentAccessState {
  canSeed: boolean;
  canFund: boolean;
  canSubmitPath: boolean;
  actionableInstallments: EscrowInstallmentRecord[];
  pendingInstallments: EscrowInstallmentRecord[];
  fundedInstallments: EscrowInstallmentRecord[];
}

export function deriveEscrowInstallmentAccessState(args: {
  context: EscrowFundingContextData | null | undefined;
  fundingRole: EscrowFundingRole;
  isReadOnly: boolean;
}): EscrowInstallmentAccessState {
  const installments = args.context?.installments ?? [];
  const pendingInstallments = installments.filter((installment) => installment.status === 'PENDING');
  const fundedInstallments = installments.filter((installment) => installment.status === 'FUNDED');
  const actionableInstallments = pendingInstallments.filter((installment) => canFundInstallment({
    governanceMode: args.context?.governanceMode ?? null,
    fundingRole: args.fundingRole,
    installment,
  }));

  return {
    canSeed: !args.isReadOnly && !!args.context && args.context.installments.length === 0 && args.context.normalizedSchedule.length > 0,
    canFund: !args.isReadOnly && actionableInstallments.length > 0,
    canSubmitPath: canCompleteEscrowPath(args.context),
    actionableInstallments,
    pendingInstallments,
    fundedInstallments,
  };
}
