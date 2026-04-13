/**
 * useProviderExpertise — CRUD hook for provider expertise data.
 * Spec 10.1: Wraps provider_expertise table operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { handleMutationError } from '@/lib/errorHandler';
import { withCreatedBy, withUpdatedBy } from '@/lib/auditFields';
import { toast } from 'sonner';

interface ProviderExpertise {
  id: string;
  provider_id: string;
  proficiency_area_id: string;
  expertise_level: string | null;
  years_experience: number | null;
  created_at: string;
}

const EXPERTISE_SELECT = 'id, provider_id, proficiency_area_id, expertise_level, years_experience, created_at';

export function useProviderExpertiseList(providerId: string | undefined) {
  return useQuery({
    queryKey: ['provider-expertise', providerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('provider_expertise')
        .select(EXPERTISE_SELECT)
        .eq('provider_id', providerId!);
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as ProviderExpertise[];
    },
    enabled: !!providerId,
    staleTime: 5 * 60_000,
  });
}

export function useAddProviderExpertise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      providerId: string;
      proficiencyAreaId: string;
      expertiseLevel?: string;
      yearsExperience?: number;
    }) => {
      const payload = await withCreatedBy({
        provider_id: params.providerId,
        proficiency_area_id: params.proficiencyAreaId,
        expertise_level: params.expertiseLevel ?? null,
        years_experience: params.yearsExperience ?? null,
      });
      const { data, error } = await supabase
        .from('provider_expertise')
        .insert(payload)
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['provider-expertise', vars.providerId] });
      toast.success('Expertise added');
    },
    onError: (err) => handleMutationError(err, { operation: 'add_provider_expertise' }),
  });
}

export function useRemoveProviderExpertise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, providerId }: { id: string; providerId: string }) => {
      const { error } = await supabase
        .from('provider_expertise')
        .delete()
        .eq('id', id);
      if (error) throw new Error(error.message);
      return providerId;
    },
    onSuccess: (providerId) => {
      queryClient.invalidateQueries({ queryKey: ['provider-expertise', providerId] });
      toast.success('Expertise removed');
    },
    onError: (err) => handleMutationError(err, { operation: 'remove_provider_expertise' }),
  });
}
