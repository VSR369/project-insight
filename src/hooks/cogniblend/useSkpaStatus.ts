/**
 * useSkpaStatus — Checks if user has accepted the Seeker Knowledge Privacy
 * Agreement (SKPA). Mirrors `usePwaStatus`.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CACHE_STATIC } from '@/config/queryCache';

export function useSkpaStatus(userId: string | undefined) {
  return useQuery({
    queryKey: ['skpa-acceptance-status', userId],
    queryFn: async (): Promise<boolean> => {
      if (!userId) return false;
      const { data, error } = await supabase
        .from('legal_acceptance_log')
        .select('id')
        .eq('user_id', userId)
        .ilike('document_code', 'SKPA%')
        .limit(1);
      if (error) return true; // fail-open (mirror usePwaStatus)
      return (data?.length ?? 0) > 0;
    },
    enabled: !!userId,
    ...CACHE_STATIC,
  });
}
