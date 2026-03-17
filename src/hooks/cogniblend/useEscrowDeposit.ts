/**
 * useEscrowDeposit — Fetches escrow status for a challenge and provides
 * a mutation to verify the deposit (FC role only).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';
import { CACHE_STANDARD } from '@/config/queryCache';

/* ─── Types ──────────────────────────────────────────────── */

export interface EscrowRecord {
  id: string;
  challenge_id: string;
  escrow_status: string;
  deposit_amount: number;
  remaining_amount: number;
  rejection_fee_percentage: number;
}

export interface EscrowData {
  escrow: EscrowRecord | null;
  rewardTotal: number;
  canVerify: boolean;
}

/* ─── Fetch hook ─────────────────────────────────────────── */

export function useEscrowDeposit(challengeId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ['escrow-deposit', challengeId],
    queryFn: async (): Promise<EscrowData> => {
      if (!challengeId) throw new Error('Challenge ID required');

      // Fetch escrow record
      const { data: escrow } = await supabase
        .from('escrow_records')
        .select('id, challenge_id, escrow_status, deposit_amount, remaining_amount, rejection_fee_percentage')
        .eq('challenge_id', challengeId)
        .maybeSingle();

      // Fetch reward_structure to calculate total
      const { data: challenge } = await supabase
        .from('challenges')
        .select('reward_structure')
        .eq('id', challengeId)
        .single();

      const rs = challenge?.reward_structure as Record<string, unknown> | null;
      let rewardTotal = 0;
      if (rs) {
        const platinum = Number(rs.platinum_award ?? rs.budget_max ?? 0);
        const gold = Number(rs.gold_award ?? 0);
        const silver = Number(rs.silver_award ?? 0);
        rewardTotal = platinum + gold + silver;
        if (rewardTotal === 0) rewardTotal = Number(rs.budget_max ?? rs.budget_min ?? 0);
      }

      // Check FC permission
      let canVerify = false;
      if (userId && challengeId) {
        const { data: canDo } = await supabase.rpc('can_perform', {
          p_user_id: userId,
          p_challenge_id: challengeId,
          p_required_role: 'FC',
        });
        canVerify = canDo === true;
      }

      return {
        escrow: escrow as EscrowRecord | null,
        rewardTotal,
        canVerify,
      };
    },
    enabled: !!challengeId,
    ...CACHE_STANDARD,
  });
}

/* ─── Verify mutation ────────────────────────────────────── */

export function useVerifyEscrow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      escrowId,
      challengeId,
      amount,
      userId,
    }: {
      escrowId: string;
      challengeId: string;
      amount: number;
      userId: string;
    }) => {
      // Update escrow record
      const { error: escrowErr } = await supabase
        .from('escrow_records')
        .update({
          escrow_status: 'FUNDED',
          deposit_amount: amount,
          remaining_amount: amount,
          updated_at: new Date().toISOString(),
          updated_by: userId,
        })
        .eq('id', escrowId);

      if (escrowErr) throw new Error(escrowErr.message);

      // Log audit
      const { error: auditErr } = await supabase.rpc('log_audit' as any, {
        p_user_id: userId,
        p_challenge_id: challengeId,
        p_action: 'ESCROW_VERIFIED',
        p_method: 'MANUAL',
        p_details: JSON.stringify({ amount, escrow_id: escrowId }),
      });

      if (auditErr) {
        // Fallback: insert directly
        await supabase.from('audit_trail').insert({
          user_id: userId,
          challenge_id: challengeId,
          action: 'ESCROW_VERIFIED',
          method: 'MANUAL',
          details: { amount, escrow_id: escrowId },
        } as any);
      }

      // Notify the Innovation Director (ID)
      // Find active ID for this challenge
      const { data: idRoles } = await supabase
        .from('user_challenge_roles' as any)
        .select('user_id')
        .eq('challenge_id', challengeId)
        .eq('role_code', 'ID')
        .eq('is_active', true);

      const idUsers = ((idRoles ?? []) as unknown as Array<{ user_id: string }>);
      if (idUsers.length > 0) {
        const notifications = idUsers.map((r) => ({
          user_id: r.user_id,
          notification_type: 'ESCROW_VERIFIED',
          title: 'Escrow verified',
          message: `Escrow deposit of $${amount.toLocaleString()} has been verified. Challenge is ready to publish.`,
          challenge_id: challengeId,
        }));

        await supabase.from('cogni_notifications').insert(notifications);
      }
    },
    onSuccess: (_data, variables) => {
      toast.success('Escrow deposit verified successfully');
      queryClient.invalidateQueries({ queryKey: ['escrow-deposit', variables.challengeId] });
      queryClient.invalidateQueries({ queryKey: ['publication-readiness', variables.challengeId] });
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'verify_escrow' });
    },
  });
}
