/**
 * Modify Expertise After Interview Failure Hook
 * 
 * Mutation hook for modifying expertise level after interview failure (Path B).
 * This triggers a full re-flow: proof points → assessment → interview.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { resetForExpertiseChange } from '@/services/interviewRetakeService';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';

interface ModifyExpertiseParams {
  enrollmentId: string;
  expertiseLevelId?: string;
}

interface ModifyExpertiseResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Hook to modify expertise after interview failure
 * 
 * This mutation:
 * 1. Resets enrollment to expertise_selected status
 * 2. Soft-deletes all proof points
 * 3. Clears specialities and proficiency areas
 * 4. Optionally updates the expertise level
 */
export function useModifyExpertise() {
  const queryClient = useQueryClient();
  
  return useMutation<ModifyExpertiseResult, Error, ModifyExpertiseParams>({
    mutationFn: async (params: ModifyExpertiseParams) => {
      // 1. Reset enrollment using RPC (handles all cleanup)
      const resetResult = await resetForExpertiseChange(params.enrollmentId);
      
      if (!resetResult.success) {
        throw new Error(resetResult.error || 'Failed to reset enrollment');
      }
      
      // 2. Update expertise level if provided
      if (params.expertiseLevelId) {
        const { error } = await supabase
          .from('provider_industry_enrollments')
          .update({ expertise_level_id: params.expertiseLevelId })
          .eq('id', params.enrollmentId);
          
        if (error) throw new Error(error.message);
      }
      
      return { 
        success: true, 
        message: 'Expertise updated. Please re-submit your proof points and assessment.' 
      };
    },
    onSuccess: (result, { enrollmentId }) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['enrollment', enrollmentId] });
      queryClient.invalidateQueries({ queryKey: ['provider-enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['active-enrollment'] });
      queryClient.invalidateQueries({ queryKey: ['reinterview-eligibility', enrollmentId] });
      queryClient.invalidateQueries({ queryKey: ['proof-points'] });
      queryClient.invalidateQueries({ queryKey: ['provider-specialities'] });
      queryClient.invalidateQueries({ queryKey: ['provider-proficiency-areas'] });
      
      toast.success(result.message || 'Expertise updated successfully');
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'modify_expertise_after_failure' });
    },
  });
}
