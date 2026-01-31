/**
 * Pulse Profile Mutations
 * Hooks for updating profile avatar and pulse headline
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';
import { PULSE_QUERY_KEYS } from '@/constants/pulse.constants';

/**
 * Update the pulse headline in pulse_provider_stats
 */
export function useUpdatePulseHeadline() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ providerId, headline }: { providerId: string; headline: string }) => {
      const { error } = await supabase
        .from('pulse_provider_stats')
        .update({ 
          pulse_headline: headline, 
          updated_at: new Date().toISOString() 
        })
        .eq('provider_id', providerId);
      
      if (error) throw error;
      return headline; // Return the saved headline
    },
    onSuccess: (savedHeadline, vars) => {
      // Invalidate with correct query key
      queryClient.invalidateQueries({ queryKey: [PULSE_QUERY_KEYS.providerStats, vars.providerId] });
      toast.success('Headline updated');
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'update_pulse_headline' });
    },
  });
}

/**
 * Update the avatar URL in profiles table
 */
export function useUpdateProfileAvatar() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, avatarUrl }: { userId: string; avatarUrl: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          avatar_url: avatarUrl, 
          updated_at: new Date().toISOString() 
        })
        .eq('user_id', userId);
      
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['profile', vars.userId] });
      toast.success('Photo updated');
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'update_profile_avatar' });
    },
  });
}
