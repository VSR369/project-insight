/**
 * useCompleteCuratorCompliance — Wraps the complete_curator_compliance RPC.
 *
 * Used by the Curator's Compliance Tab on STRUCTURED challenges (Marketplace
 * or Aggregator) where the Curator owns both legal + financial review.
 * After completion the RPC either pauses for Creator approval or auto-
 * publishes, depending on extended_brief.creator_approval_required.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { handleMutationError, logWarning } from '@/lib/errorHandler';
import { toast } from 'sonner';

interface CompleteCuratorComplianceResult {
  success: boolean;
  awaiting?: 'creator_approval' | 'publication';
  already_completed?: boolean;
  error?: string;
}

export function useCompleteCuratorCompliance(challengeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string): Promise<CompleteCuratorComplianceResult> => {
      const { data, error } = await supabase.rpc('complete_curator_compliance', {
        p_challenge_id: challengeId,
        p_user_id: userId,
      });
      if (error) {
        logWarning('complete_curator_compliance RPC error', {
          operation: 'complete_curator_compliance',
          additionalData: { challengeId, userId, rpcError: error },
        });
        throw error;
      }
      const result = data as unknown as CompleteCuratorComplianceResult;
      if (!result?.success) {
        throw new Error(result?.error ?? 'Curator compliance completion failed');
      }
      return result;
    },
    onSuccess: (result) => {
      if (result.already_completed) {
        toast.info('Compliance already complete');
      } else if (result.awaiting === 'creator_approval') {
        toast.success('Compliance complete — Creator approval requested');
      } else if (result.awaiting === 'publication') {
        toast.success('Compliance complete — challenge advanced to publication');
      } else {
        toast.success('Compliance complete');
      }
      qc.invalidateQueries({ queryKey: ['curation-challenge', challengeId] });
      qc.invalidateQueries({ queryKey: ['challenge-preview', challengeId] });
      qc.invalidateQueries({ queryKey: ['publication-readiness', challengeId] });
      qc.invalidateQueries({ queryKey: ['attached-legal-docs', challengeId] });
      qc.invalidateQueries({ queryKey: ['fc-escrow-challenges'] });
    },
    onError: (e) => handleMutationError(e, { operation: 'complete_curator_compliance' }),
  });
}
