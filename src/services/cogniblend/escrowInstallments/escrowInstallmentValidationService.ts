import type {
  EscrowFundingRole,
  EscrowFundingFormValues,
  EscrowFundingContextData,
  EscrowInstallmentRecord,
} from './escrowInstallmentTypes';
import type { GovernanceMode } from '@/lib/governanceMode';

export interface EscrowFundingValidationResult {
  isValid: boolean;
  errors: string[];
}

function normalizeAmount(value: number | null | undefined): number {
  return Math.round(Number(value ?? 0) * 100) / 100;
}

export function resolveExpectedFundingRole(governanceMode: GovernanceMode | null): EscrowFundingRole | null {
  if (governanceMode === 'STRUCTURED') return 'CU';
  if (governanceMode === 'CONTROLLED') return 'FC';
  return null;
}

export function isLegacyEscrowOnly(context: EscrowFundingContextData | null | undefined): boolean {
  if (!context) return false;
  return !!context.legacyEscrowRecord && context.installments.length === 0;
}

export function canSeedInstallments(context: EscrowFundingContextData | null | undefined): boolean {
  if (!context) return false;
  if (context.governanceMode === 'QUICK') return false;
  if (context.installments.length > 0) return false;
  return context.normalizedSchedule.length > 0;
}

export function canCompleteEscrowPath(context: EscrowFundingContextData | null | undefined): boolean {
  if (!context) return false;
  if (isLegacyEscrowOnly(context)) {
    return context.legacyEscrowStatus === 'FUNDED';
  }
  return context.aggregate.status === 'FUNDED';
}

export function canFundInstallment(args: {
  governanceMode: GovernanceMode | null;
  fundingRole: EscrowFundingRole;
  installment: EscrowInstallmentRecord | null | undefined;
}): boolean {
  const expectedRole = resolveExpectedFundingRole(args.governanceMode);
  if (!expectedRole || expectedRole !== args.fundingRole) return false;
  if (!args.installment) return false;
  return args.installment.status === 'PENDING';
}

export function canSelectInstallment(args: {
  governanceMode: GovernanceMode | null;
  fundingRole: EscrowFundingRole;
  installment: EscrowInstallmentRecord | null | undefined;
}): boolean {
  const expectedRole = resolveExpectedFundingRole(args.governanceMode);
  if (!expectedRole || expectedRole !== args.fundingRole) return false;
  if (!args.installment) return false;
  return args.installment.status === 'PENDING' || args.installment.status === 'FUNDED';
}

export function canEditFundedInstallmentBeforeFinalSubmit(args: {
  governanceMode: GovernanceMode | null;
  fundingRole: EscrowFundingRole;
  installment: EscrowInstallmentRecord | null | undefined;
  isFinalReadOnly: boolean;
}): boolean {
  if (args.isFinalReadOnly) return false;
  if (!canSelectInstallment(args)) return false;
  return args.installment?.status === 'FUNDED';
}

export function isInstallmentLockedForEditing(args: {
  governanceMode: GovernanceMode | null;
  fundingRole: EscrowFundingRole;
  installment: EscrowInstallmentRecord | null | undefined;
  isFinalReadOnly: boolean;
}): boolean {
  if (args.isFinalReadOnly) return true;
  if (!canSelectInstallment(args)) return true;
  return args.installment?.status !== 'PENDING' && !canEditFundedInstallmentBeforeFinalSubmit(args);
}

export function validateInstallmentFunding(args: {
  governanceMode: GovernanceMode | null;
  fundingRole: EscrowFundingRole;
  installment: EscrowInstallmentRecord | null | undefined;
  values: EscrowFundingFormValues;
  isFinalReadOnly: boolean;
  hasProofFile: boolean;
  existingProofFileName?: string | null;
}): EscrowFundingValidationResult {
  const errors: string[] = [];
  const { governanceMode, fundingRole, installment, values, isFinalReadOnly, hasProofFile, existingProofFileName } = args;
  const expectedRole = resolveExpectedFundingRole(governanceMode);

  if (!installment) {
    errors.push('Select a pending installment before confirming funding.');
  }

  if (!expectedRole) {
    errors.push('Escrow funding is not available for this governance mode.');
  } else if (expectedRole !== fundingRole) {
    errors.push(`This escrow path must be completed by ${expectedRole}.`);
  }

  if (installment && isInstallmentLockedForEditing({ governanceMode, fundingRole, installment, isFinalReadOnly })) {
    errors.push('This installment is locked and can no longer be edited.');
  }

  if (installment?.status && installment.status !== 'PENDING' && installment.status !== 'FUNDED') {
    errors.push('Only pending or funded installments can be edited in this workspace.');
  }

  if (installment) {
    const enteredAmount = normalizeAmount(installment.scheduled_amount);
    const submittedAmount = normalizeAmount(values.depositAmount);
    if (enteredAmount !== submittedAmount) {
      errors.push('Deposit amount must exactly match the selected installment amount.');
    }
  }

  if (!values.bankName.trim()) errors.push('Bank name is required.');
  if (!values.depositDate.trim()) errors.push('Deposit date is required.');
  if (!values.depositReference.trim()) errors.push('Deposit reference is required.');
  if (!values.accountNumber.trim() && !installment?.account_number_raw && !installment?.account_number_masked) {
    errors.push('Account number is required before funding this installment.');
  }
  if (!values.ifscSwiftCode.trim()) errors.push('IFSC / SWIFT code is required.');
  if (!hasProofFile && !existingProofFileName) {
    errors.push('Proof of deposit is required before marking an installment as funded.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
