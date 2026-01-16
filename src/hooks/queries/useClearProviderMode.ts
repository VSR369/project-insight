import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
      console.error('Error clearing provider mode:', error);
      toast.error('Failed to clear participation mode');
    },
  });
}
