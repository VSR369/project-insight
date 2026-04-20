/**
 * useFreezeActions — Mutations for freeze/unfreeze/assemble RPCs.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { handleMutationError, logWarning } from '@/lib/errorHandler';
import { toast } from 'sonner';

interface FreezeResult {
  success: boolean;
  error?: string;
  content_hash?: string;
}

interface AssembleResult {
  success: boolean;
  error?: string;
  doc_id?: string;
  cpa_code?: string;
}

export function useFreezeForLegalReview(challengeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.rpc('freeze_for_legal_review', {
        p_challenge_id: challengeId,
        p_user_id: userId,
      });
      if (error) {
        logWarning('freeze_for_legal_review RPC error', {
          operation: 'freeze_for_legal_review',
          additionalData: { challengeId, userId, rpcError: error },
        });
        throw error;
      }
      const result = data as unknown as FreezeResult;
      if (!result?.success) {
        const serverMessage = result?.error ?? 'Freeze failed';
        logWarning('freeze_for_legal_review returned failure', {
          operation: 'freeze_for_legal_review',
          additionalData: { challengeId, userId, payload: result },
        });
        throw new Error(serverMessage);
      }
      return result;
    },
    onSuccess: () => {
      toast.success('Challenge frozen for legal review');
      qc.invalidateQueries({ queryKey: ['challenge-lc-detail', challengeId] });
      qc.invalidateQueries({ queryKey: ['curation-challenge', challengeId] });
    },
    onError: (e) => handleMutationError(e, { operation: 'freeze_for_legal_review' }),
  });
}

export function useUnfreezeForRecuration(challengeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      const { data, error } = await supabase.rpc('unfreeze_for_recuration', {
        p_challenge_id: challengeId,
        p_user_id: userId,
        p_reason: reason,
      });
      if (error) {
        logWarning('unfreeze_for_recuration RPC error', {
          operation: 'unfreeze_for_recuration',
          additionalData: { challengeId, userId, rpcError: error },
        });
        throw error;
      }
      const result = data as unknown as FreezeResult;
      if (!result?.success) {
        const serverMessage = result?.error ?? 'Unfreeze failed';
        logWarning('unfreeze_for_recuration returned failure', {
          operation: 'unfreeze_for_recuration',
          additionalData: { challengeId, userId, payload: result },
        });
        throw new Error(serverMessage);
      }
      return result;
    },
    onSuccess: () => {
      toast.success('Challenge returned to curation');
      qc.invalidateQueries({ queryKey: ['challenge-lc-detail', challengeId] });
      qc.invalidateQueries({ queryKey: ['curation-challenge', challengeId] });
    },
    onError: (e) => handleMutationError(e, { operation: 'unfreeze_for_recuration' }),
  });
}

export function useAssembleCpa(challengeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.rpc('assemble_cpa', {
        p_challenge_id: challengeId,
        p_user_id: userId,
      });
      if (error) {
        logWarning('assemble_cpa RPC error', {
          operation: 'assemble_cpa',
          additionalData: { challengeId, userId, rpcError: error },
        });
        throw error;
      }
      const result = data as unknown as AssembleResult;
      if (!result?.success) {
        const serverMessage = result?.error ?? 'Assembly failed';
        logWarning('assemble_cpa returned failure', {
          operation: 'assemble_cpa',
          additionalData: { challengeId, userId, payload: result },
        });
        throw new Error(serverMessage);
      }
      return result;
    },
    onSuccess: () => {
      toast.success('CPA assembled successfully');
      qc.invalidateQueries({ queryKey: ['attached-legal-docs', challengeId] });
      qc.invalidateQueries({ queryKey: ['challenge-lc-detail', challengeId] });
    },
    onError: (e) => handleMutationError(e, { operation: 'assemble_cpa' }),
  });
}
