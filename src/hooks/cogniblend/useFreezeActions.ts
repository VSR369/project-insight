/**
 * useFreezeActions — Mutations for freeze/unfreeze/assemble RPCs.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { handleMutationError } from '@/lib/errorHandler';
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
      if (error) throw error;
      const result = data as unknown as FreezeResult;
      if (!result.success) throw new Error(result.error ?? 'Freeze failed');
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
      if (error) throw error;
      const result = data as unknown as FreezeResult;
      if (!result.success) throw new Error(result.error ?? 'Unfreeze failed');
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
      if (error) throw error;
      const result = data as unknown as AssembleResult;
      if (!result.success) throw new Error(result.error ?? 'Assembly failed');
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
