import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { handleMutationError, logWarning } from '@/lib/errorHandler';

interface SeedDefaultLegalDocsArgs {
  challengeId: string;
  userId: string;
}

export function useSeedDefaultLegalDocs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ challengeId, userId }: SeedDefaultLegalDocsArgs) => {
      const { error } = await supabase.rpc('seed_default_legal_docs', {
        p_challenge_id: challengeId,
        p_user_id: userId,
      });
      if (error) {
        logWarning('seed_default_legal_docs failed', {
          operation: 'seed_default_legal_docs',
          additionalData: { challengeId, userId, error },
        });
        throw error;
      }
      return true;
    },
    onSuccess: async (_value, variables) => {
      toast.success('Default legal documents seeded');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['attached-legal-docs', variables.challengeId] }),
        queryClient.invalidateQueries({ queryKey: ['challenge-preview', variables.challengeId] }),
      ]);
    },
    onError: (error) => handleMutationError(error, { operation: 'seed_default_legal_docs', component: 'useSeedDefaultLegalDocs' }),
  });
}
