/**
 * useSpaStatus — Checks if user has accepted the Solver Platform Agreement.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useSpaStatus(userId: string | undefined) {
  return useQuery({
    queryKey: ['spa-acceptance-status', userId],
    queryFn: async (): Promise<boolean> => {
      if (!userId) return false;
      const { data, error } = await (supabase.from('legal_acceptance_log') as any)
        .select('id')
        .eq('user_id', userId)
        .eq('document_type', 'SPA')
        .limit(1);
      if (error) return true; // fail-open
      return (data?.length ?? 0) > 0;
    },
    enabled: !!userId,
    staleTime: 5 * 60_000,
  });
}
