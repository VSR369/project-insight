import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  fetchCurrentProvider, 
  updateProviderMode, 
  upsertOrganization, 
  updateProviderExpertise,
  completeOnboarding,
  updateProviderBasicProfile,
  fetchProviderProficiencyAreas,
  upsertProviderProficiencyAreas,
  type ProviderData 
} from '@/services/providerService';
import { 
  executeIndustryChangeReset, 
  executeExpertiseLevelChangeReset,
  getCascadeImpactCounts 
} from '@/services/cascadeResetService';
import { canModifyField } from '@/services/lifecycleService';

export function useCurrentProvider() {
  return useQuery({
    queryKey: ['current-provider'],
    queryFn: fetchCurrentProvider,
    staleTime: 30000, // 30 seconds
  });
}

export interface UpdateBasicProfileInput {
  providerId: string;
  data: {
    firstName: string;
    lastName: string;
    address: string;
    pinCode: string;
    countryId: string;
    industrySegmentId: string;
    isStudent: boolean;
  };
  confirmCascade?: boolean;
}

export interface UpdateBasicProfileResult {
  success: boolean;
  requiresConfirmation?: boolean;
  cascadeImpact?: {
    specialtyProofPointsCount: number;
    proficiencyAreasCount: number;
    specialitiesCount: number;
  };
}

export function useUpdateProviderBasicProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      providerId, 
      data,
      confirmCascade = false,
    }: UpdateBasicProfileInput): Promise<UpdateBasicProfileResult> => {
      // Fetch current provider to check for changes
      const { data: currentProvider, error: fetchError } = await (await import('@/integrations/supabase/client')).supabase
        .from('solution_providers')
        .select('industry_segment_id, expertise_level_id, lifecycle_rank')
        .eq('id', providerId)
        .single();

      if (fetchError) throw fetchError;

      const lifecycleRank = currentProvider?.lifecycle_rank || 0;
      const isIndustryChanging = currentProvider?.industry_segment_id && 
        currentProvider.industry_segment_id !== data.industrySegmentId;

      // Check lifecycle lock for configuration changes (industry)
      if (isIndustryChanging) {
        const configCheck = canModifyField(lifecycleRank, 'configuration');
        if (!configCheck.allowed) {
          throw new Error(configCheck.reason || 'Configuration is locked at this lifecycle stage');
        }
      }

      // If industry is changing and expertise is already selected, we need cascade confirmation
      if (isIndustryChanging && currentProvider?.expertise_level_id && !confirmCascade) {
        // Get cascade impact counts
        const impact = await getCascadeImpactCounts(providerId);
        
        // Only require confirmation if there's actual data to delete
        if (impact.specialty_proof_points_count > 0 || impact.proficiency_areas_count > 0 || impact.specialities_count > 0) {
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

      // Execute cascade reset if confirmed and industry is changing
      if (isIndustryChanging && currentProvider?.expertise_level_id && confirmCascade) {
        await executeIndustryChangeReset(providerId);
      }

      // Now update the basic profile
      await updateProviderBasicProfile(providerId, data);
      
      return { success: true };
    },
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['current-provider'] });
        queryClient.invalidateQueries({ queryKey: ['provider-enrollments'] });
        queryClient.invalidateQueries({ queryKey: ['active-enrollment'] });
        queryClient.invalidateQueries({ queryKey: ['proof-points'] });
        queryClient.invalidateQueries({ queryKey: ['provider-proficiency-areas'] });
        toast.success('Saved. Continue to Participation Mode.');
      }
    },
    onError: (error) => {
      console.error('Error updating profile:', error);
      toast.error(error instanceof Error ? error.message : 'Unable to save. Please retry.');
    },
  });
}

export function useUpdateProviderMode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ providerId, participationModeId }: { providerId: string; participationModeId: string }) =>
      updateProviderMode(providerId, participationModeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-provider'] });
    },
  });
}

export function useUpsertOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      providerId, 
      data 
    }: { 
      providerId: string; 
      data: {
        orgName: string;
        orgTypeId: string;
        orgWebsite?: string;
        designation?: string;
        managerName: string;
        managerEmail: string;
        managerPhone?: string;
      };
    }) => upsertOrganization(providerId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-provider'] });
    },
  });
}

export interface UpdateExpertiseInput {
  providerId: string;
  expertiseLevelId: string;
  confirmCascade?: boolean;
}

export interface UpdateExpertiseResult {
  success: boolean;
  requiresConfirmation?: boolean;
  cascadeImpact?: {
    specialtyProofPointsCount: number;
    proficiencyAreasCount: number;
    specialitiesCount: number;
  };
}

export function useUpdateProviderExpertise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      providerId, 
      expertiseLevelId,
      confirmCascade = false,
    }: UpdateExpertiseInput): Promise<UpdateExpertiseResult> => {
      // Fetch current provider to check for changes
      const { data: currentProvider, error: fetchError } = await (await import('@/integrations/supabase/client')).supabase
        .from('solution_providers')
        .select('expertise_level_id, lifecycle_rank')
        .eq('id', providerId)
        .single();

      if (fetchError) throw fetchError;

      const lifecycleRank = currentProvider?.lifecycle_rank || 0;
      const isLevelChanging = currentProvider?.expertise_level_id && 
        currentProvider.expertise_level_id !== expertiseLevelId;

      // Check lifecycle lock for configuration changes
      const configCheck = canModifyField(lifecycleRank, 'configuration');
      if (!configCheck.allowed) {
        throw new Error(configCheck.reason || 'Configuration is locked at this lifecycle stage');
      }

      // If level is changing and we have existing data, require confirmation
      if (isLevelChanging && !confirmCascade) {
        const impact = await getCascadeImpactCounts(providerId);
        
        if (impact.specialty_proof_points_count > 0 || impact.proficiency_areas_count > 0 || impact.specialities_count > 0) {
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
      if (isLevelChanging && confirmCascade) {
        await executeExpertiseLevelChangeReset(providerId);
      }

      // Now update the expertise level
      await updateProviderExpertise(providerId, expertiseLevelId);
      
      return { success: true };
    },
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['current-provider'] });
        queryClient.invalidateQueries({ queryKey: ['proof-points'] });
        queryClient.invalidateQueries({ queryKey: ['provider-proficiency-areas'] });
      }
    },
    onError: (error) => {
      console.error('Error updating expertise:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update expertise level');
    },
  });
}

export function useCompleteOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (providerId: string) => completeOnboarding(providerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-provider'] });
    },
  });
}

// Fetch provider's selected proficiency areas
export function useProviderProficiencyAreas(providerId?: string) {
  return useQuery({
    queryKey: ['provider-proficiency-areas', providerId],
    queryFn: () => fetchProviderProficiencyAreas(providerId!),
    enabled: !!providerId,
    staleTime: 30000,
  });
}

// Update provider's proficiency area selections
export function useUpdateProviderProficiencyAreas() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ providerId, proficiencyAreaIds }: { providerId: string; proficiencyAreaIds: string[] }) =>
      upsertProviderProficiencyAreas(providerId, proficiencyAreaIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['provider-proficiency-areas', variables.providerId] });
    },
  });
}
