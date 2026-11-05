/**
 * usePwaStatus — Checks if user has accepted the Prize & Work Agreement.
 * Uses CACHE_STATIC (30min) — acceptance is immutable within a session.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CACHE_STATIC } from '@/config/queryCache';

export function usePwaStatus(userId: string | undefined) {
  return useQuery({
    queryKey: ['pwa-acceptance-status', userId],
    queryFn: async (): Promise<boolean> => {
      if (!userId) return false;
      // Mirrors fn_has_accepted_pwa: document_code ILIKE 'PWA%'.
      const { data, error } = await supabase
        .from('legal_acceptance_log')
        .select('id')
        .eq('user_id', userId)
        .ilike('document_code', 'PWA%')
        .limit(1);
      if (error) return true; // fail-open
      return (data?.length ?? 0) > 0;
    },
    enabled: !!userId,
    ...CACHE_STATIC,
  });
}
