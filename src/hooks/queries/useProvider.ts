import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  fetchCurrentProvider, 
  updateProviderMode, 
  upsertOrganization, 
  updateProviderExpertise,
  completeOnboarding,
  updateProviderBasicProfile,
  type ProviderData 
} from '@/services/providerService';

export function useCurrentProvider() {
  return useQuery({
    queryKey: ['current-provider'],
    queryFn: fetchCurrentProvider,
    staleTime: 30000, // 30 seconds
  });
}

export function useUpdateProviderBasicProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      providerId, 
      data 
    }: { 
      providerId: string; 
      data: {
        firstName: string;
        lastName: string;
        address: string;
        pinCode: string;
        countryId: string;
        industrySegmentId: string;
      };
    }) => updateProviderBasicProfile(providerId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-provider'] });
      toast.success('Saved. Continue to Participation Mode.');
    },
    onError: () => {
      toast.error('Unable to save. Please retry.');
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

export function useUpdateProviderExpertise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ providerId, expertiseLevelId }: { providerId: string; expertiseLevelId: string }) =>
      updateProviderExpertise(providerId, expertiseLevelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-provider'] });
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
