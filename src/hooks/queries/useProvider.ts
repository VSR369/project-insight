import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';
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

// Re-export ProviderData type for use in contexts
export type { ProviderData };

export interface UseCurrentProviderOptions {
  /** Whether to enable the query. Defaults to true. */
  enabled?: boolean;
}

export function useCurrentProvider(options?: UseCurrentProviderOptions) {
  return useQuery({
    queryKey: ['current-provider'],
    queryFn: fetchCurrentProvider,
    staleTime: 60 * 1000,           // 60 seconds - provider data is stable
    gcTime: 10 * 60 * 1000,         // 10 minutes - keep in cache longer
    refetchOnWindowFocus: false,    // Prevent tab-return refetch storms
    enabled: options?.enabled !== false, // Default to true if not specified
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
      handleMutationError(error, { operation: 'update_provider_profile', component: 'useUpdateProviderBasicProfile' });
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

/**
 * Upsert organization details to enrollment's organization JSONB column.
 * This is enrollment-scoped to support multi-industry enrollments.
 */
export function useUpsertOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      enrollmentId, 
      data 
    }: { 
      enrollmentId: string; 
      data: {
        orgName: string;
        orgTypeId: string;
        orgWebsite?: string;
        designation?: string;
        managerName: string;
        managerEmail: string;
        managerPhone?: string;
      };
    }) => {
      const supabase = (await import('@/integrations/supabase/client')).supabase;
      
      const organizationData = {
        org_name: data.orgName,
        org_type_id: data.orgTypeId,
        org_website: data.orgWebsite || null,
        designation: data.designation || null,
        manager_name: data.managerName,
        manager_email: data.managerEmail,
        manager_phone: data.managerPhone || null,
        approval_status: 'pending',
        submitted_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('provider_industry_enrollments')
        .update({
          organization: organizationData,
          org_approval_status: 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', enrollmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['active-enrollment'] });
      queryClient.invalidateQueries({ queryKey: ['current-provider'] });
      toast.success('Organization details saved');
    },
    onError: (error) => {
      handleMutationError(error, { operation: 'save_organization', component: 'useUpsertOrganization' });
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
      handleMutationError(error, { operation: 'update_expertise', component: 'useUpdateProviderExpertise' });
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
