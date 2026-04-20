/**
 * useSendToLegal — Single-shot mutation that freezes the curated challenge,
 * assembles the CPA, and auto-assigns LC (and FC for CONTROLLED) from the
 * platform workforce pool. Replaces the previous freeze + assemble dual flow.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { handleMutationError, logWarning } from '@/lib/errorHandler';
import { toast } from 'sonner';

interface SendToLegalResult {
  success: boolean;
  error?: string;
  content_hash?: string;
  doc_id?: string;
  lc_user_id?: string | null;
  fc_user_id?: string | null;
  governance_mode?: string;
  warnings?: string[];
}

export function useSendToLegal(challengeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string): Promise<SendToLegalResult> => {
      const { data, error } = await supabase.rpc('send_to_legal_review', {
        p_challenge_id: challengeId,
        p_user_id: userId,
      });
      if (error) {
        logWarning('send_to_legal_review RPC error', {
          operation: 'send_to_legal_review',
          additionalData: { challengeId, userId, rpcError: error },
        });
        throw error;
      }
      const result = data as unknown as SendToLegalResult;
      if (!result?.success) {
        const serverMessage = result?.error ?? 'Send to Legal failed';
        logWarning('send_to_legal_review returned failure', {
          operation: 'send_to_legal_review',
          additionalData: { challengeId, userId, payload: result },
        });
        throw new Error(serverMessage);
      }
      return result;
    },
    onSuccess: (result) => {
      const parts = ['Sent to Legal Review'];
      if (result.lc_user_id) parts.push('LC assigned');
      if (result.fc_user_id) parts.push('FC assigned');
      toast.success(parts.join(' · '));
      if (result.warnings && result.warnings.length > 0) {
        for (const w of result.warnings) {
          toast.warning(w);
        }
      }
      qc.invalidateQueries({ queryKey: ['challenge-lc-detail', challengeId] });
      qc.invalidateQueries({ queryKey: ['curation-challenge', challengeId] });
      qc.invalidateQueries({ queryKey: ['attached-legal-docs', challengeId] });
      qc.invalidateQueries({ queryKey: ['cogni_user_roles'] });
    },
    onError: (e) => handleMutationError(e, { operation: 'send_to_legal_review' }),
  });
}
