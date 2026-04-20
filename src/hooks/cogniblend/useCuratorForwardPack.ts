/**
 * useCuratorForwardPack — Wraps the curator_forward_pack_to_creator RPC.
 *
 * Single canonical handoff point for both Marketplace and Aggregator
 * CONTROLLED packs.  Either notifies the Creator (if approval is required)
 * or auto-publishes (Aggregator opt-out only).
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { handleMutationError, logWarning } from '@/lib/errorHandler';
import { toast } from 'sonner';

interface ForwardPackResult {
  success: boolean;
  awaiting?: 'creator_approval' | 'publication';
  error?: string;
}

interface ForwardPackInput {
  userId: string;
  notes?: string;
}

export function useCuratorForwardPack(challengeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, notes }: ForwardPackInput): Promise<ForwardPackResult> => {
      const { data, error } = await supabase.rpc('curator_forward_pack_to_creator', {
        p_challenge_id: challengeId,
        p_user_id: userId,
        p_notes: notes ?? null,
      });
      if (error) {
        logWarning('curator_forward_pack_to_creator RPC error', {
          operation: 'curator_forward_pack',
          additionalData: { challengeId, userId, rpcError: error },
        });
        throw error;
      }
      const result = data as unknown as ForwardPackResult;
      if (!result?.success) {
        throw new Error(result?.error ?? 'Forwarding pack failed');
      }
      return result;
    },
    onSuccess: (result) => {
      if (result.awaiting === 'creator_approval') {
        toast.success('Pack forwarded to Creator for approval');
      } else if (result.awaiting === 'publication') {
        toast.success('Pack auto-published — Creator approval not required');
      } else {
        toast.success('Pack forwarded');
      }
      qc.invalidateQueries({ queryKey: ['curation-challenge', challengeId] });
      qc.invalidateQueries({ queryKey: ['challenge-preview', challengeId] });
      qc.invalidateQueries({ queryKey: ['publication-readiness', challengeId] });
      qc.invalidateQueries({ queryKey: ['creator-review', challengeId] });
    },
    onError: (e) => handleMutationError(e, { operation: 'curator_forward_pack' }),
  });
}
