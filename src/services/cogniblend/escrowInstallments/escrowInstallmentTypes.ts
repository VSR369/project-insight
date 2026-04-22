import type { GovernanceMode } from '@/lib/governanceMode';
import type { Json } from '@/integrations/supabase/types';

export type EscrowFundingRole = 'CU' | 'FC';
export type EscrowInstallmentStatus = 'PENDING' | 'FUNDED' | 'RELEASED' | 'CANCELLED';

export interface RewardMilestoneInput {
  name?: string;
  pct?: number;
  trigger?: string;
}

export interface NormalizedEscrowInstallment {
  installmentNumber: number;
  scheduleLabel: string;
  triggerEvent: string;
  scheduledPct: number;
  scheduledAmount: number;
  currency: string;
}

export interface EscrowInstallmentRecord {
  id: string;
  challenge_id: string;
  escrow_record_id: string | null;
  installment_number: number;
  schedule_label: string;
  trigger_event: string | null;
  scheduled_pct: number;
  scheduled_amount: number;
  currency: string;
  status: EscrowInstallmentStatus;
  funded_by_role: EscrowFundingRole | null;
  bank_name: string | null;
  bank_branch: string | null;
  bank_address: string | null;
  account_number_masked: string | null;
  ifsc_swift_code: string | null;
  deposit_amount: number | null;
  deposit_date: string | null;
  deposit_reference: string | null;
  proof_document_url: string | null;
  proof_file_name: string | null;
  proof_uploaded_at: string | null;
  fc_notes: string | null;
  funded_at: string | null;
  funded_by: string | null;
}

export interface EscrowAggregateSummary {
  totalScheduled: number;
  totalFunded: number;
  remainingAmount: number;
  fundedCount: number;
  pendingCount: number;
  status: 'PENDING' | 'PARTIALLY_FUNDED' | 'FUNDED';
}

export interface EscrowFundingChallenge {
  id: string;
  title: string;
  reward_structure: Json | null;
  currency_code: string | null;
  governance_profile: string | null;
  governance_mode_override: string | null;
  creator_escrow_comments: string | null;
  extended_brief: Json | null;
  fc_compliance_complete: boolean | null;
  lc_compliance_complete: boolean | null;
}

export interface EscrowFundingContextData {
  challenge: EscrowFundingChallenge | null;
  governanceMode: GovernanceMode | null;
  creatorEscrowComments: string | null;
  escrowNotes: string | null;
  normalizedSchedule: NormalizedEscrowInstallment[];
  installments: EscrowInstallmentRecord[];
  aggregate: EscrowAggregateSummary;
  rewardTotal: number;
  currency: string;
  legacyEscrowStatus: string | null;
  legacyEscrowRecord: {
    id: string;
    escrow_status: string;
    deposit_amount: number;
    remaining_amount: number;
    bank_name: string | null;
    currency: string | null;
    deposit_reference: string | null;
    deposit_date: string | null;
  } | null;
}

export interface EscrowFundingFormValues {
  bankName: string;
  bankBranch: string;
  bankAddress: string;
  accountNumber: string;
  ifscSwiftCode: string;
  depositDate: string;
  depositReference: string;
  notes: string;
}