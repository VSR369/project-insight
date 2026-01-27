/**
 * Enrollment Expertise Hooks
 * 
 * React Query hooks for managing expertise level and proficiency areas
 * scoped to a specific enrollment (multi-industry support).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { withUpdatedBy, getCurrentUserId } from '@/lib/auditFields';
import { handleMutationError } from '@/lib/errorHandler';
import { canModifyField } from '@/services/lifecycleService';
import {
  executeExpertiseLevelChangeResetV2,
  getCascadeImpactCountsV2 
} from '@/services/cascadeResetService';

export interface UpdateEnrollmentExpertiseInput {
  enrollmentId: string;
  expertiseLevelId: string;
  confirmCascade?: boolean;
}

export interface UpdateEnrollmentExpertiseResult {
  success: boolean;
  requiresConfirmation?: boolean;
  cascadeImpact?: {
    specialtyProofPointsCount: number;
    proficiencyAreasCount: number;
    specialitiesCount: number;
  };
}

/**
 * Update expertise level for a specific enrollment
 * Uses V2 enrollment-scoped cascade reset functions
 */
export function useUpdateEnrollmentExpertise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      enrollmentId, 
      expertiseLevelId,
      confirmCascade = false,
    }: UpdateEnrollmentExpertiseInput): Promise<UpdateEnrollmentExpertiseResult> => {
      // Fetch current enrollment to check for changes
      const { data: enrollment, error: fetchError } = await supabase
        .from('provider_industry_enrollments')
        .select('expertise_level_id, lifecycle_rank, provider_id')
        .eq('id', enrollmentId)
        .single();

      if (fetchError) throw fetchError;

      const lifecycleRank = enrollment?.lifecycle_rank || 0;
      const isLevelChanging = enrollment?.expertise_level_id && 
        enrollment.expertise_level_id !== expertiseLevelId;

      // Check lifecycle lock for configuration changes
      const configCheck = canModifyField(lifecycleRank, 'configuration');
      if (!configCheck.allowed) {
        throw new Error(configCheck.reason || 'Configuration is locked at this lifecycle stage');
      }

      // If level is changing and we have existing data, require confirmation
      // Use V2 function scoped to enrollment (not provider)
      if (isLevelChanging && !confirmCascade) {
        const impact = await getCascadeImpactCountsV2(enrollmentId);
        
        if (impact && (impact.specialty_proof_points_count > 0 || impact.proficiency_areas_count > 0 || impact.specialities_count > 0)) {
          return {
            success: false,
            requiresConfirmation: true,
            cascadeImpact: {
              specialtyProofPointsCount: impact.specialty_proof_points_count,
              proficiencyAreasCount: impact.proficiency_areas_count,
              specialitiesCount: impact.specialities_count,
            },
          };
        }
      }

      // Execute cascade reset if confirmed and level is changing
      // Use V2 function scoped to enrollment (not provider)
      if (isLevelChanging && confirmCascade) {
        const resetResult = await executeExpertiseLevelChangeResetV2(enrollmentId);
        if (!resetResult.success) {
          throw new Error(resetResult.error || 'Failed to execute cascade reset');
        }
      }

      // Update the enrollment's expertise level with audit fields
      const updateData = await withUpdatedBy({
        expertise_level_id: expertiseLevelId,
        updated_at: new Date().toISOString(),
      });

      const { error: updateError } = await supabase
        .from('provider_industry_enrollments')
        .update(updateData)
        .eq('id', enrollmentId);

      if (updateError) throw updateError;
      
      return { success: true };
    },
    onSuccess: (result) => {
      if (result.success) {
        // Invalidate enrollment queries
        queryClient.invalidateQueries({ queryKey: ['provider-enrollments'] });
        queryClient.invalidateQueries({ queryKey: ['active-enrollment'] });
        queryClient.invalidateQueries({ queryKey: ['current-provider'] });
        queryClient.invalidateQueries({ queryKey: ['proof-points'] });
        queryClient.invalidateQueries({ queryKey: ['enrollment-proficiency-areas'] });
      }
    },
    onError: (error) => {
      handleMutationError(error, { operation: 'update_enrollment_expertise', component: 'useUpdateEnrollmentExpertise' });
    },
  });
}

/**
 * Fetch proficiency areas for a specific enrollment
 */
export function useEnrollmentProficiencyAreas(enrollmentId?: string) {
  return useQuery({
    queryKey: ['enrollment-proficiency-areas', enrollmentId],
    queryFn: async () => {
      if (!enrollmentId) return [];

      const { data, error } = await supabase
        .from('provider_proficiency_areas')
        .select('proficiency_area_id')
        .eq('enrollment_id', enrollmentId);

      if (error) throw error;
      return data?.map(row => row.proficiency_area_id) || [];
    },
    enabled: !!enrollmentId,
    staleTime: 30000,
  });
}

/**
 * Update proficiency areas for a specific enrollment
 */
export function useUpdateEnrollmentProficiencyAreas() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      enrollmentId, 
      proficiencyAreaIds 
    }: { 
      enrollmentId: string; 
      proficiencyAreaIds: string[] 
    }) => {
      // Get enrollment info
      const { data: enrollment, error: enrollmentError } = await supabase
        .from('provider_industry_enrollments')
        .select('provider_id')
        .eq('id', enrollmentId)
        .single();

      if (enrollmentError) throw enrollmentError;
      if (!enrollment) throw new Error('Enrollment not found');

      const userId = await getCurrentUserId();

      // Delete existing selections for this enrollment
      const { error: deleteError } = await supabase
        .from('provider_proficiency_areas')
        .delete()
        .eq('enrollment_id', enrollmentId);

      if (deleteError) throw deleteError;

      // Insert new selections if any
      if (proficiencyAreaIds.length > 0) {
        const inserts = proficiencyAreaIds.map(areaId => ({
          provider_id: enrollment.provider_id,
          enrollment_id: enrollmentId,
          proficiency_area_id: areaId,
          created_by: userId,
        }));

        const { error: insertError } = await supabase
          .from('provider_proficiency_areas')
          .insert(inserts);

        if (insertError) throw insertError;
      }

      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['enrollment-proficiency-areas', variables.enrollmentId] });
      queryClient.invalidateQueries({ queryKey: ['provider-proficiency-areas'] });
    },
    onError: (error) => {
      handleMutationError(error, { operation: 'update_proficiency_areas', component: 'useUpdateEnrollmentProficiencyAreas' });
    },
  });
}

/**
 * Hook to check lifecycle validation for an enrollment
 */
export function useEnrollmentCanModifyField(
  enrollmentId: string | undefined, 
  fieldCategory: 'registration' | 'configuration' | 'content'
) {
  const { data: enrollment, isLoading } = useQuery({
    queryKey: ['enrollment-lifecycle', enrollmentId],
    queryFn: async () => {
      if (!enrollmentId) return null;
      
      const { data, error } = await supabase
        .from('provider_industry_enrollments')
        .select('lifecycle_rank, lifecycle_status')
        .eq('id', enrollmentId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!enrollmentId,
    staleTime: 30000,
  });

  if (isLoading) {
    return { allowed: false, reason: 'Loading...', isLoading: true };
  }

  if (!enrollment) {
    // No enrollment = user is in early registration stages
    // Allow modification - lock rules only apply once enrolled
    return { allowed: true, isLoading: false };
  }

  const result = canModifyField(enrollment.lifecycle_rank, fieldCategory);
  return { ...result, isLoading: false };
}

/**
 * Hook to check if enrollment is in terminal state
 */
export function useEnrollmentIsTerminal(enrollmentId: string | undefined) {
  const { data: enrollment, isLoading } = useQuery({
    queryKey: ['enrollment-lifecycle', enrollmentId],
    queryFn: async () => {
      if (!enrollmentId) return null;
      
      const { data, error } = await supabase
        .from('provider_industry_enrollments')
        .select('lifecycle_rank, lifecycle_status')
        .eq('id', enrollmentId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!enrollmentId,
    staleTime: 30000,
  });

  if (isLoading || !enrollment) {
    return { isTerminal: false, status: null, isLoading };
  }

  const terminalStatuses = ['verified', 'certified', 'not_verified', 'active', 'suspended', 'inactive'];
  const isTerminal = terminalStatuses.includes(enrollment.lifecycle_status);

  return {
    isTerminal,
    status: enrollment.lifecycle_status,
    isLoading: false,
  };
}
