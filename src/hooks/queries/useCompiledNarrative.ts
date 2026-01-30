/**
 * useCompiledNarrative - Hook for fetching and triggering AI compilation
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';

interface CompileResult {
  compiled_narrative: string;
  fallback?: boolean;
  reason?: string;
}

/**
 * Mutation hook to trigger AI narrative compilation
 */
export function useCompileCardNarrative() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cardId: string): Promise<CompileResult> => {
      const { data, error } = await supabase.functions.invoke('compile-card-narrative', {
        body: { cardId }
      });

      if (error) {
        throw new Error(error.message || 'Failed to compile narrative');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data as CompileResult;
    },
    onSuccess: (data, cardId) => {
      // Invalidate card query to get updated narrative
      queryClient.invalidateQueries({ queryKey: ['pulse-card', cardId] });
      
      if (data.fallback) {
        toast.info('Using featured contribution (AI synthesis unavailable)');
      }
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'compile_card_narrative' });
    },
  });
}

/**
 * Extract unique contributors from layers
 */
export function extractContributors(
  layers: Array<{
    creator_id: string;
    creator?: {
      id: string;
      first_name: string;
      last_name: string;
    } | null;
  }>
): Array<{ id: string; first_name: string; last_name: string }> {
  const contributorMap = new Map<string, { id: string; first_name: string; last_name: string }>();

  layers.forEach((layer) => {
    if (layer.creator && !contributorMap.has(layer.creator.id)) {
      contributorMap.set(layer.creator.id, {
        id: layer.creator.id,
        first_name: layer.creator.first_name,
        last_name: layer.creator.last_name,
      });
    }
  });

  return Array.from(contributorMap.values());
}
