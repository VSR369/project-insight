import { useQuery } from '@tanstack/react-query';
import type { Json } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { CACHE_FREQUENT } from '@/config/queryCache';
import { handleQueryError } from '@/lib/errorHandler';
import { resolveGovernanceMode } from '@/lib/governanceMode';
import { deriveEscrowAggregateSummary } from '@/services/cogniblend/escrowInstallments/escrowInstallmentAggregateService';
import {
  getEscrowCurrency,
  getRewardTotal,
  normalizeEscrowInstallments,
} from '@/services/cogniblend/escrowInstallments/escrowInstallmentNormalizationService';
import type {
  EscrowFundingChallenge,
  EscrowFundingContextData,
  EscrowInstallmentRecord,
} from '@/services/cogniblend/escrowInstallments/escrowInstallmentTypes';

type ChallengeRow = EscrowFundingChallenge & {
  reward_structure: Json | null;
  extended_brief: Json | null;
};

function readExtendedBriefRecord(value: Json | null): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  return {};
}

function mapInstallments(rows: Array<Record<string, unknown>>): EscrowInstallmentRecord[] {
  return rows as unknown as EscrowInstallmentRecord[];
}

export function useEscrowFundingContext(challengeId: string | undefined) {
  return useQuery<EscrowFundingContextData | null>({
    queryKey: ['escrow-funding-context', challengeId],
    enabled: !!challengeId,
    ...CACHE_FREQUENT,
    queryFn: async () => {
      if (!challengeId) return null;

      const [challengeResult, installmentResult, legacyResult] = await Promise.all([
        supabase
          .from('challenges')
          .select('id, title, reward_structure, currency_code, governance_profile, governance_mode_override, creator_escrow_comments, extended_brief, fc_compliance_complete, lc_compliance_complete')
          .eq('id', challengeId)
          .single(),
        supabase
          .from('escrow_installments')
          .select('id, challenge_id, escrow_record_id, installment_number, schedule_label, trigger_event, scheduled_pct, scheduled_amount, currency, status, funded_by_role, bank_name, bank_branch, bank_address, account_number_raw, account_number_masked, ifsc_swift_code, deposit_amount, deposit_date, deposit_reference, proof_document_url, proof_file_name, proof_uploaded_at, fc_notes, funded_at, funded_by')
          .eq('challenge_id', challengeId)
          .order('installment_number', { ascending: true }),
        supabase
          .from('escrow_records')
          .select('id, escrow_status, deposit_amount, remaining_amount, bank_name, currency, deposit_reference, deposit_date')
          .eq('challenge_id', challengeId)
          .maybeSingle(),
      ]);

      if (challengeResult.error) {
        handleQueryError(challengeResult.error, { operation: 'fetch_escrow_funding_context', component: 'useEscrowFundingContext' });
        throw challengeResult.error;
      }
      if (installmentResult.error) {
        handleQueryError(installmentResult.error, { operation: 'fetch_escrow_installments_for_context', component: 'useEscrowFundingContext' });
        throw installmentResult.error;
      }
      if (legacyResult.error) {
        handleQueryError(legacyResult.error, { operation: 'fetch_legacy_escrow_for_context', component: 'useEscrowFundingContext' });
        throw legacyResult.error;
      }

      const challenge = challengeResult.data as unknown as ChallengeRow;
      const governanceMode = resolveGovernanceMode(challenge.governance_mode_override ?? challenge.governance_profile);
      const normalizedSchedule = normalizeEscrowInstallments(challenge.reward_structure, challenge.currency_code);
      const installments = mapInstallments((installmentResult.data ?? []) as Array<Record<string, unknown>>);
      const aggregate = deriveEscrowAggregateSummary(installments);
      const extendedBrief = readExtendedBriefRecord(challenge.extended_brief);
      const currency = getEscrowCurrency(challenge.reward_structure, challenge.currency_code);

      return {
        challenge,
        governanceMode,
        creatorEscrowComments: challenge.creator_escrow_comments,
        escrowNotes: typeof extendedBrief.escrow_notes === 'string' ? extendedBrief.escrow_notes : null,
        normalizedSchedule,
        installments,
        aggregate,
        rewardTotal: getRewardTotal(challenge.reward_structure),
        currency,
        legacyEscrowStatus: legacyResult.data?.escrow_status ?? null,
        legacyEscrowRecord: legacyResult.data ?? null,
      };
    },
  });
}
