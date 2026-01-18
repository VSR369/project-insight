import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';

/**
 * Hook to clear the provider's participation mode.
 * Used when withdrawing a pending approval to allow mode re-selection.
 */
export function useClearProviderMode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ providerId }: { providerId: string }) => {
      const { error } = await supabase
        .from('solution_providers')
        .update({
          participation_mode_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', providerId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-provider'] });
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'clearProviderMode' }, true);
    },
  });
}
