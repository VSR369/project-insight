/**
 * Enrollment Participation Mode Hook
 * 
 * Manages participation mode at the enrollment level,
 * not the provider level, for multi-industry isolation.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { withUpdatedBy } from '@/lib/auditFields';
import { handleMutationError } from '@/lib/errorHandler';

export interface UpdateEnrollmentParticipationModeInput {
  enrollmentId: string;
  participationModeId: string;
}

/**
 * Update participation mode for a specific enrollment
 */
export function useUpdateEnrollmentParticipationMode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      enrollmentId, 
      participationModeId,
    }: UpdateEnrollmentParticipationModeInput) => {
      // Update the enrollment's participation mode with audit fields
      const updateData = await withUpdatedBy({
        participation_mode_id: participationModeId,
        updated_at: new Date().toISOString(),
      });

      const { error } = await supabase
        .from('provider_industry_enrollments')
        .update(updateData)
        .eq('id', enrollmentId);

      if (error) throw error;
      
      return { success: true };
    },
    onSuccess: () => {
      // Invalidate enrollment queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['provider-enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['active-enrollment'] });
      queryClient.invalidateQueries({ queryKey: ['current-provider'] });
    },
    onError: (error) => {
      handleMutationError(error, { operation: 'updateEnrollmentParticipationMode' }, true);
    },
  });
}
