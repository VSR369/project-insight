/**
 * useLegalReacceptance — Checks for pending legal re-acceptance records
 * and provides accept mutation. Used on PublicChallengeDetailPage and SolutionSubmitPage.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CACHE_FREQUENT } from '@/config/queryCache';
import { toast } from 'sonner';
import { handleMutationError, logInfo } from '@/lib/errorHandler';

/* ─── Types ──────────────────────────────────────────────── */

export interface PendingReacceptance {
  id: string;
  challenge_id: string;
  amendment_id: string;
  deadline_at: string;
  days_remaining: number;
  amendment_number: number | null;
}

export interface ReacceptanceStatus {
  /** Whether the solver has a pending re-acceptance for this challenge */
  hasPending: boolean;
  /** The pending record details */
  record: PendingReacceptance | null;
}

/* ─── Query Hook ─────────────────────────────────────────── */

export function useLegalReacceptanceStatus(
  challengeId: string | undefined,
  userId: string | undefined
) {
  return useQuery({
    queryKey: ['legal-reacceptance', challengeId, userId],
    enabled: !!challengeId && !!userId,
    queryFn: async (): Promise<ReacceptanceStatus> => {
      if (!challengeId || !userId) {
        return { hasPending: false, record: null };
      }

      const { data, error } = await supabase
        .from('legal_reacceptance_records')
        .select('id, challenge_id, amendment_id, deadline_at')
        .eq('challenge_id', challengeId)
        .eq('user_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw new Error(error.message);

      if (!data || data.length === 0) {
        return { hasPending: false, record: null };
      }

      const rec = data[0];
      const deadlineMs = new Date(rec.deadline_at).getTime();
      const daysRemaining = Math.max(
        0,
        Math.ceil((deadlineMs - Date.now()) / (1000 * 60 * 60 * 24))
      );

      // Fetch amendment number
      const { data: amendment } = await supabase
        .from('amendment_records')
        .select('amendment_number')
        .eq('id', rec.amendment_id)
        .single();

      return {
        hasPending: true,
        record: {
          id: rec.id,
          challenge_id: rec.challenge_id,
          amendment_id: rec.amendment_id,
          deadline_at: rec.deadline_at,
          days_remaining: daysRemaining,
          amendment_number: amendment?.amendment_number ?? null,
        },
      };
    },
    ...CACHE_FREQUENT,
  });
}

/* ─── Accept Mutation ────────────────────────────────────── */

interface AcceptPayload {
  recordId: string;
  challengeId: string;
  userId: string;
  amendmentNumber: number;
}

export function useAcceptLegalReacceptance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AcceptPayload): Promise<void> => {
      const { recordId, challengeId, userId, amendmentNumber } = payload;

      // 1. Update re-acceptance record
      const { error: updateErr } = await supabase
        .from('legal_reacceptance_records')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', recordId);

      if (updateErr) throw new Error(updateErr.message);

      // 2. Insert into legal_acceptance_ledger for audit
      const { error: ledgerErr } = await supabase
        .from('legal_acceptance_ledger')
        .insert({
          challenge_id: challengeId,
          user_id: userId,
          document_type: 'amendment_legal_terms',
          document_name: `Amendment #${amendmentNumber} — Updated Legal Terms`,
          accepted_at: new Date().toISOString(),
          phase_triggered: null,
          tier: 'TIER_1',
          created_by: userId,
        });

      if (ledgerErr) throw new Error(ledgerErr.message);

      // 3. Audit trail
      await supabase.from('audit_trail').insert({
        user_id: userId,
        challenge_id: challengeId,
        action: 'LEGAL_REACCEPTED',
        method: 'manual',
        details: {
          amendment_number: amendmentNumber,
          record_id: recordId,
          document_type: 'amendment_legal_terms',
        } as any,
        created_by: userId,
      });

      logInfo(`Legal re-acceptance completed for amendment #${amendmentNumber}`, {
        operation: 'accept_legal_reacceptance',
        component: 'useLegalReacceptance',
      });
    },

    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['legal-reacceptance', variables.challengeId] });
      queryClient.invalidateQueries({ queryKey: ['solver-amendment-status', variables.challengeId] });
      toast.success('Legal terms accepted successfully');
    },

    onError: (error: Error) => {
      handleMutationError(error, { operation: 'accept_legal_reacceptance' });
    },
  });
}
