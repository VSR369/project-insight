/**
 * usePwaStatus — Checks if user has accepted the Prize & Work Agreement.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function usePwaStatus(userId: string | undefined) {
  return useQuery({
    queryKey: ['pwa-acceptance-status', userId],
    queryFn: async (): Promise<boolean> => {
      if (!userId) return false;
      const { data, error } = await (supabase.from('legal_acceptance_log') as any)
        .select('id')
        .eq('user_id', userId)
        .eq('document_type', 'PWA')
        .limit(1);
      if (error) return true; // fail-open
      return (data?.length ?? 0) > 0;
    },
    enabled: !!userId,
    staleTime: 5 * 60_000,
  });
}
