/**
 * Provider Solution Types Hook
 * 
 * React Query hooks for CRUD on provider_solution_types junction.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { handleMutationError } from '@/lib/errorHandler';
import { toast } from 'sonner';

const PST_QUERY_KEY = 'provider-solution-types';

export interface ProviderSolutionType {
  id: string;
  provider_id: string;
  solution_type_id: string;
  created_at: string;
}

/**
 * Fetch all solution types for a provider
 */
export function useProviderSolutionTypes(providerId?: string) {
  return useQuery({
    queryKey: [PST_QUERY_KEY, providerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('provider_solution_types')
        .select('id, provider_id, solution_type_id, created_at')
        .eq('provider_id', providerId!);
      if (error) throw new Error(error.message);
      return (data ?? []) as ProviderSolutionType[];
    },
    enabled: !!providerId,
    staleTime: 60_000,
  });
}

/**
 * Set solution types for a provider (replace all)
 */
export function useSetProviderSolutionTypes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ providerId, solutionTypeIds }: { providerId: string; solutionTypeIds: string[] }) => {
      // Delete existing
      const { error: delError } = await supabase
        .from('provider_solution_types')
        .delete()
        .eq('provider_id', providerId);
      if (delError) throw new Error(delError.message);

      // Insert new
      if (solutionTypeIds.length > 0) {
        const rows = solutionTypeIds.map((stId) => ({
          provider_id: providerId,
          solution_type_id: stId,
        }));
        const { error: insError } = await supabase
          .from('provider_solution_types')
          .insert(rows);
        if (insError) throw new Error(insError.message);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [PST_QUERY_KEY, variables.providerId] });
      toast.success('Solution types updated');
    },
    onError: (error) => {
      handleMutationError(error, { operation: 'setProviderSolutionTypes' }, true);
    },
  });
}
