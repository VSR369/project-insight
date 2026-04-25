/**
 * useLegalAcceptanceLedger — Paginated, filterable read of `legal_acceptance_log`
 * for the admin Acceptance Ledger viewer.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { handleQueryError } from '@/lib/errorHandler';
import { CACHE_FREQUENT } from '@/config/queryCache';

export interface LedgerFilters {
  documentCode: string | null;
  triggerEvent: string | null;
  userIdSearch: string | null;
  fromDate: string | null;
  toDate: string | null;
  page: number;
  pageSize: number;
}

export interface LedgerRow {
  id: string;
  user_id: string;
  template_id: string;
  document_code: string;
  document_version: string;
  trigger_event: string | null;
  action: string;
  ip_address: string | null;
  accepted_at: string;
  challenge_id: string | null;
}

export interface LedgerPage {
  rows: LedgerRow[];
  total: number;
}

const SELECT_COLS =
  'id, user_id, template_id, document_code, document_version, trigger_event, action, ip_address, accepted_at, challenge_id';

export function useLegalAcceptanceLedger(filters: LedgerFilters) {
  return useQuery<LedgerPage>({
    queryKey: ['legal-acceptance-ledger', filters],
    queryFn: async () => {
      const from = filters.page * filters.pageSize;
      const to = from + filters.pageSize - 1;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q = (supabase.from('legal_acceptance_log') as any)
        .select(SELECT_COLS, { count: 'exact' })
        .order('accepted_at', { ascending: false })
        .range(from, to);

      if (filters.documentCode) q = q.eq('document_code', filters.documentCode);
      if (filters.triggerEvent) q = q.eq('trigger_event', filters.triggerEvent);
      if (filters.userIdSearch) q = q.eq('user_id', filters.userIdSearch);
      if (filters.fromDate) q = q.gte('accepted_at', filters.fromDate);
      if (filters.toDate) q = q.lte('accepted_at', filters.toDate);

      const { data, error, count } = await q;
      if (error) {
        handleQueryError(error, { operation: 'fetch_legal_acceptance_ledger' });
        return { rows: [], total: 0 };
      }
      return { rows: (data ?? []) as LedgerRow[], total: count ?? 0 };
    },
    ...CACHE_FREQUENT,
    refetchOnWindowFocus: false,
  });
}
