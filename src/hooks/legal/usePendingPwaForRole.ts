/**
 * usePendingPwaForRole — Returns unresolved PWA acceptance rows for the
 * current user matching one of the supplied workforce role codes
 * (CU / ER / LC / FC variants).
 *
 * Used by `WorkforcePwaGate` to defensively block challenge-level entry
 * points if a workforce user managed to bypass the first-login gate
 * (e.g. invited mid-session, manual SQL backfill).
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CACHE_USER } from '@/config/queryCache';
import type { PendingRoleLegalRow } from '@/hooks/queries/usePendingRoleLegalAcceptance';

export function usePendingPwaForRole(
  userId: string | undefined,
  roleCodes: readonly string[],
) {
  return useQuery<PendingRoleLegalRow[]>({
    queryKey: ['pending-pwa-for-role', userId, [...roleCodes].sort().join(',')],
    queryFn: async () => {
      if (!userId || roleCodes.length === 0) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('pending_role_legal_acceptance') as any)
        .select('id, user_id, org_id, role_code, doc_code, source, resolved_at, created_at')
        .eq('user_id', userId)
        .eq('doc_code', 'PWA')
        .in('role_code', [...roleCodes])
        .is('resolved_at', null)
        .order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as PendingRoleLegalRow[];
    },
    enabled: !!userId && roleCodes.length > 0,
    ...CACHE_USER,
    refetchOnWindowFocus: false,
  });
}
