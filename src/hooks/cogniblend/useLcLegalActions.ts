/**
 * useLcLegalActions — Trimmed for the unified Pass 3 workflow.
 * Only retains the delete mutation (used by LcAttachedDocsCard).
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';
import { handleMutationError } from '@/lib/errorHandler';

interface UseLcLegalActionsArgs {
  challengeId: string | undefined;
  userId: string | undefined;
  maturityLevel?: string | null;
}

export function useLcLegalActions({
  challengeId,
}: UseLcLegalActionsArgs) {
  const queryClient = useQueryClient();

  const deleteDocMutation = useMutation({
    mutationFn: async (docId: string) => {
      const { error } = await supabase.from('challenge_legal_docs').delete().eq('id', docId);
      if (error) throw new Error(error.message);
      return docId;
    },
    onSuccess: () => {
      toast.success('Legal document deleted');
      queryClient.invalidateQueries({ queryKey: ['attached-legal-docs', challengeId] });
      queryClient.invalidateQueries({ queryKey: ['source-legal-docs', challengeId] });
    },
    onError: (error: Error) => handleMutationError(error, { operation: 'delete_legal_doc' }),
  });

  return {
    deleteDocMutation,
  };
}
