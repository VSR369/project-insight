/**
 * Provider Profile Hook (Extended)
 * 
 * React Query hooks for the new solution_providers profile fields.
 * Handles bio, links, avatar, availability, phone, and profile strength.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { handleMutationError } from '@/lib/errorHandler';
import { toast } from 'sonner';

const PROFILE_QUERY_KEY = 'provider-profile-extended';

export interface ProviderProfileExtended {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  bio_tagline: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  avatar_url: string | null;
  availability: string | null;
  provider_level: number;
  profile_strength: number;
  phone: string | null;
  is_student: boolean;
  lifecycle_status: string;
  expertise_level_id: string | null;
  industry_segment_id: string | null;
}

export interface UpdateProfileInput {
  bio_tagline?: string | null;
  linkedin_url?: string | null;
  portfolio_url?: string | null;
  avatar_url?: string | null;
  availability?: string | null;
  phone?: string | null;
  first_name?: string;
  last_name?: string;
}

const PROFILE_COLUMNS = [
  'id', 'user_id', 'first_name', 'last_name',
  'bio_tagline', 'linkedin_url', 'portfolio_url', 'avatar_url',
  'availability', 'provider_level', 'profile_strength', 'phone',
  'is_student', 'lifecycle_status', 'expertise_level_id', 'industry_segment_id',
].join(', ');

/**
 * Fetch extended profile for a provider
 */
export function useProviderProfileExtended(providerId?: string) {
  return useQuery({
    queryKey: [PROFILE_QUERY_KEY, providerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('solution_providers')
        .select(PROFILE_COLUMNS)
        .eq('id', providerId!)
        .single();
      if (error) throw new Error(error.message);
      return data as ProviderProfileExtended;
    },
    enabled: !!providerId,
    staleTime: 30_000,
  });
}

/**
 * Update provider profile fields
 */
export function useUpdateProviderProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ providerId, updates }: { providerId: string; updates: UpdateProfileInput }) => {
      const { data, error } = await supabase
        .from('solution_providers')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', providerId)
        .select(PROFILE_COLUMNS)
        .single();
      if (error) throw new Error(error.message);
      return data as ProviderProfileExtended;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [PROFILE_QUERY_KEY, data.id] });
      toast.success('Profile updated');
    },
    onError: (error) => {
      handleMutationError(error, { operation: 'updateProviderProfile' }, true);
    },
  });
}
