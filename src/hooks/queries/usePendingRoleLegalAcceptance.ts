/**
 * usePendingRoleLegalAcceptance — Reads the user's outstanding role-level
 * legal signature backlog from `pending_role_legal_acceptance`.
 *
 * Returned rows are the source of truth for the first-login `RoleLegalGate`
 * dialog. Each row encodes which document (SPA/SKPA/PWA) the user must
 * still sign for which role + org.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CACHE_STABLE } from '@/config/queryCache';
import type { LegalDocCode } from '@/services/legal/roleToDocumentMap';

export interface PendingRoleLegalRow {
  id: string;
  user_id: string;
  org_id: string | null;
  role_code: string;
  doc_code: LegalDocCode;
  source: string;
  resolved_at: string | null;
  created_at: string;
}

export function usePendingRoleLegalAcceptance(userId: string | undefined) {
  return useQuery<PendingRoleLegalRow[]>({
    queryKey: ['pending-role-legal-acceptance', userId],
    queryFn: async () => {
      if (!userId) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('pending_role_legal_acceptance') as any)
        .select('id, user_id, org_id, role_code, doc_code, source, resolved_at, created_at')
        .eq('user_id', userId)
        .is('resolved_at', null)
        .order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as PendingRoleLegalRow[];
    },
    enabled: !!userId,
    ...CACHE_STABLE,
    refetchOnWindowFocus: false,
  });
}
