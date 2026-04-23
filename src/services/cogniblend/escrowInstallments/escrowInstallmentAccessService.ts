import type {
  EscrowFundingContextData,
  EscrowFundingRole,
  EscrowInstallmentRecord,
} from './escrowInstallmentTypes';
import {
  canCompleteEscrowPath,
  canEditFundedInstallmentBeforeFinalSubmit,
  canSelectInstallment,
} from './escrowInstallmentValidationService';

export interface EscrowInstallmentAccessState {
  canSeed: boolean;
  canSubmitChanges: boolean;
  canSubmitPath: boolean;
  selectableInstallments: EscrowInstallmentRecord[];
  editableInstallments: EscrowInstallmentRecord[];
  pendingInstallments: EscrowInstallmentRecord[];
  fundedInstallments: EscrowInstallmentRecord[];
  isFinalReadOnly: boolean;
}

export function deriveEscrowInstallmentAccessState(args: {
  context: EscrowFundingContextData | null | undefined;
  fundingRole: EscrowFundingRole;
  isReadOnly: boolean;
}): EscrowInstallmentAccessState {
  const installments = args.context?.installments ?? [];
  const isFinalReadOnly = args.isReadOnly;
  const pendingInstallments = installments.filter((installment) => installment.status === 'PENDING');
  const fundedInstallments = installments.filter((installment) => installment.status === 'FUNDED');
  const selectableInstallments = installments.filter((installment) => canSelectInstallment({
    governanceMode: args.context?.governanceMode ?? null,
    fundingRole: args.fundingRole,
    installment,
  }));
  const editableInstallments = selectableInstallments.filter((installment) => installment.status === 'PENDING' || canEditFundedInstallmentBeforeFinalSubmit({
    governanceMode: args.context?.governanceMode ?? null,
    fundingRole: args.fundingRole,
    installment,
    isFinalReadOnly,
  }));

  return {
    canSeed: !isFinalReadOnly && !!args.context && args.context.installments.length === 0 && args.context.normalizedSchedule.length > 0,
    canSubmitChanges: !isFinalReadOnly && editableInstallments.length > 0,
    canSubmitPath: canCompleteEscrowPath(args.context),
    selectableInstallments,
    editableInstallments,
    pendingInstallments,
    fundedInstallments,
    isFinalReadOnly,
  };
}
