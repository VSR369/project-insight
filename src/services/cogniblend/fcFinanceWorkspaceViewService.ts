import type { EscrowRecord } from '@/hooks/cogniblend/useEscrowDeposit';
import type { EscrowFormValues } from '@/pages/cogniblend/EscrowDepositForm';

export interface FcWorkspaceViewState {
  isPreview: boolean;
  isFunded: boolean;
  canEditDepositFields: boolean;
  canUploadProof: boolean;
  canConfirmEscrow: boolean;
  canSubmitFinanceReview: boolean;
  canSubmitEscrow: boolean;
  currentStep: 1 | 2 | 3;
}

export interface OrgFinanceEscrowDefaults {
  default_bank_name?: string | null;
  default_bank_branch?: string | null;
  default_bank_address?: string | null;
  preferred_escrow_currency?: string | null;
}

function getTodayDateValue(): string {
  return new Date().toISOString().split('T')[0] ?? '';
}

function toDateInputValue(value: string | null | undefined): string {
  if (!value) return getTodayDateValue();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return getTodayDateValue();
  return parsed.toISOString().split('T')[0] ?? getTodayDateValue();
}

export function deriveFcWorkspaceViewState(args: {
  currentPhase: number | null | undefined;
  escrowStatus: string | null;
  fcComplianceComplete: boolean;
}): FcWorkspaceViewState {
  const phaseGateOpen = (args.currentPhase ?? 0) >= 3;
  const isPreview = !phaseGateOpen;
  const isFunded = args.escrowStatus === 'FUNDED';
  const canEditDepositFields = !args.fcComplianceComplete && !isFunded;
  const canUploadProof = phaseGateOpen && canEditDepositFields;
  const canConfirmEscrow = phaseGateOpen && canEditDepositFields;
  const canSubmitFinanceReview = phaseGateOpen && isFunded && !args.fcComplianceComplete;
  const canSubmitEscrow = canEditDepositFields;
  const currentStep: 1 | 2 | 3 = isPreview ? 1 : args.fcComplianceComplete || isFunded ? 3 : 2;

  return {
    isPreview,
    isFunded,
    canEditDepositFields,
    canUploadProof,
    canConfirmEscrow,
    canSubmitFinanceReview,
    canSubmitEscrow,
    currentStep,
  };
}

export function buildEscrowFormDefaults(
  escrow: EscrowRecord | null | undefined,
  rewardTotal: number,
  orgDefaults?: OrgFinanceEscrowDefaults | null,
): EscrowFormValues {
  return {
    bank_name: escrow?.bank_name ?? orgDefaults?.default_bank_name ?? '',
    bank_branch: escrow?.bank_branch ?? orgDefaults?.default_bank_branch ?? '',
    bank_address: escrow?.bank_address ?? orgDefaults?.default_bank_address ?? '',
    currency: escrow?.currency ?? orgDefaults?.preferred_escrow_currency ?? 'USD',
    deposit_amount: Number(escrow?.deposit_amount ?? rewardTotal ?? 0),
    deposit_date: toDateInputValue(escrow?.deposit_date),
    deposit_reference: escrow?.deposit_reference ?? '',
    account_number: '',
    ifsc_swift_code: escrow?.ifsc_swift_code ?? '',
    fc_notes: escrow?.fc_notes ?? '',
  };
}
