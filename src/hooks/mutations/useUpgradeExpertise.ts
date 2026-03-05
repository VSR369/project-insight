/**
 * Upgrade Expertise Mutation Hook
 * 
 * Handles resetting enrollment for expertise upgrade process.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { resetForExpertiseUpgrade } from '@/services/expertiseUpgradeService';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';

export function useUpgradeExpertise() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (enrollmentId: string) => {
      return await resetForExpertiseUpgrade(enrollmentId);
    },
    onSuccess: (result, enrollmentId) => {
      if (result.success) {
        // Invalidate all affected queries
        queryClient.invalidateQueries({ queryKey: ['enrollment', enrollmentId] });
        queryClient.invalidateQueries({ queryKey: ['provider-enrollments'] });
        queryClient.invalidateQueries({ queryKey: ['active-enrollment'] });
        queryClient.invalidateQueries({ queryKey: ['upgrade-eligibility', enrollmentId] });
        queryClient.invalidateQueries({ queryKey: ['provider-proficiency-areas'] });
        
        toast.success(result.message || 'Ready for expertise upgrade. Please select your new expertise level.');
      } else {
        handleMutationError(new Error(result.error || 'Failed to initiate upgrade'), { operation: 'upgrade_expertise_certified' });
      }
      return result;
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'upgrade_expertise_certified' });
    },
  });
}
