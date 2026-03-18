/**
 * useUserChallengeRoles — Fetches the role codes the current user
 * holds for a specific challenge.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useUserChallengeRoles(
  userId: string | undefined,
  challengeId: string | undefined,
) {
  return useQuery({
    queryKey: ['user-challenge-roles', userId, challengeId],
    queryFn: async (): Promise<string[]> => {
      if (!userId || !challengeId) return [];

      const { data, error } = await supabase
        .from('user_challenge_roles')
        .select('role_code')
        .eq('user_id', userId)
        .eq('challenge_id', challengeId)
        .eq('is_active', true);

      if (error) return [];
      return (data ?? []).map((r) => r.role_code);
    },
    enabled: !!userId && !!challengeId,
    staleTime: 60_000,
  });
}
