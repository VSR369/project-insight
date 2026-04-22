/**
 * useEscrowDeposit — compatibility hook for legacy single-row escrow screens.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { CACHE_STANDARD } from '@/config/queryCache';
import { handleMutationError, handleQueryError } from '@/lib/errorHandler';
import { getRewardTotal } from '@/services/cogniblend/escrowInstallments/escrowInstallmentNormalizationService';
import { resolveGovernanceMode } from '@/lib/governanceMode';

export interface EscrowRecord {
  id: string;
  challenge_id: string;
  escrow_status: string;
  deposit_amount: number;
  remaining_amount: number;
  rejection_fee_percentage: number;
  bank_name?: string | null;
  bank_branch?: string | null;
  bank_address?: string | null;
  currency?: string;
  deposit_date?: string | null;
  deposit_reference?: string | null;
  fc_notes?: string | null;
  account_number_masked?: string | null;
  ifsc_swift_code?: string | null;
  proof_file_name?: string | null;
  proof_document_url?: string | null;
  proof_uploaded_at?: string | null;
}

export interface EscrowData {
  escrow: EscrowRecord | null;
  rewardTotal: number;
  canVerify: boolean;
  installmentCount: number;
}

export function useEscrowDeposit(challengeId: string | undefined, userId: string | undefined) {
  return useQuery<EscrowData>({
    queryKey: ['escrow-deposit', challengeId],
    enabled: !!challengeId,
    ...CACHE_STANDARD,
    queryFn: async () => {
      if (!challengeId) throw new Error('Challenge ID required');

      const [escrowResult, challengeResult, roleResult, installmentResult] = await Promise.all([
        supabase
          .from('escrow_records')
          .select('id, challenge_id, escrow_status, deposit_amount, remaining_amount, rejection_fee_percentage, bank_name, bank_branch, bank_address, currency, deposit_date, deposit_reference, fc_notes, account_number_masked, ifsc_swift_code, proof_file_name, proof_document_url, proof_uploaded_at')
          .eq('challenge_id', challengeId)
          .maybeSingle(),
        supabase
          .from('challenges')
          .select('reward_structure, governance_profile, governance_mode_override')
          .eq('id', challengeId)
          .single(),
        userId
          ? supabase.rpc('can_perform', { p_user_id: userId, p_challenge_id: challengeId, p_required_role: 'FC' })
          : Promise.resolve({ data: false, error: null }),
        supabase
          .from('escrow_installments')
          .select('id', { count: 'exact', head: true })
          .eq('challenge_id', challengeId),
      ]);

      if (escrowResult.error) {
        handleQueryError(escrowResult.error, { operation: 'fetch_legacy_escrow_record', component: 'useEscrowDeposit' });
        throw escrowResult.error;
      }
      if (challengeResult.error) {
        handleQueryError(challengeResult.error, { operation: 'fetch_challenge_reward_for_escrow', component: 'useEscrowDeposit' });
        throw challengeResult.error;
      }
      if (roleResult.error) {
        handleQueryError(roleResult.error, { operation: 'check_fc_escrow_permission', component: 'useEscrowDeposit' });
        throw roleResult.error;
      }
      if (installmentResult.error) {
        handleQueryError(installmentResult.error, { operation: 'count_escrow_installments', component: 'useEscrowDeposit' });
        throw installmentResult.error;
      }

      const challenge = challengeResult.data as { reward_structure: unknown; governance_profile: string | null; governance_mode_override: string | null };
      const governanceMode = resolveGovernanceMode(challenge.governance_mode_override ?? challenge.governance_profile);
      const rewardTotal = getRewardTotal(challenge.reward_structure);

      return {
        escrow: escrowResult.data as EscrowRecord | null,
        rewardTotal,
        canVerify: governanceMode === 'CONTROLLED' && roleResult.data === true,
        installmentCount: installmentResult.count ?? 0,
      };
    },
  });
}

export function useVerifyEscrow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ escrowId, challengeId, amount, userId }: { escrowId: string; challengeId: string; amount: number; userId: string }) => {
      const { error } = await supabase
        .from('escrow_records')
        .update({
          escrow_status: 'FUNDED',
          deposit_amount: amount,
          remaining_amount: amount,
          updated_at: new Date().toISOString(),
          updated_by: userId,
        })
        .eq('id', escrowId);
      if (error) throw error;
      return challengeId;
    },
    onSuccess: (challengeId) => {
      toast.success('Escrow deposit verified successfully');
      queryClient.invalidateQueries({ queryKey: ['escrow-deposit', challengeId] });
      queryClient.invalidateQueries({ queryKey: ['publication-readiness', challengeId] });
    },
    onError: (error) => handleMutationError(error, { operation: 'verify_escrow', component: 'useVerifyEscrow' }),
  });
}
