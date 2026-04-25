/**
 * useExportLegalLedger — Mutation that pulls all rows matching the current
 * ledger filters (capped at MAX_EXPORT_ROWS) and triggers a browser CSV download.
 *
 * Uses Supabase pagination internally (1000-row Postgres default) to walk
 * the full result set without exceeding the per-request cap.
 */
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { handleMutationError } from '@/lib/errorHandler';
import {
  buildLedgerCsvBlob,
  suggestLedgerFilename,
} from '@/services/legal/legalLedgerCsv';
import type {
  LedgerFilters,
  LedgerRow,
} from '@/hooks/queries/useLegalAcceptanceLedger';

const PAGE_SIZE = 1000;
const MAX_EXPORT_ROWS = 10_000;

const SELECT_COLS =
  'id, user_id, template_id, document_code, document_version, trigger_event, action, ip_address, accepted_at, challenge_id';

async function fetchAllRows(
  filters: Omit<LedgerFilters, 'page' | 'pageSize'>,
): Promise<LedgerRow[]> {
  const all: LedgerRow[] = [];
  let from = 0;
  while (all.length < MAX_EXPORT_ROWS) {
    const to = Math.min(from + PAGE_SIZE - 1, MAX_EXPORT_ROWS - 1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q = (supabase.from('legal_acceptance_log') as any)
      .select(SELECT_COLS)
      .order('accepted_at', { ascending: false })
      .range(from, to);

    if (filters.documentCode) q = q.eq('document_code', filters.documentCode);
    if (filters.triggerEvent) q = q.eq('trigger_event', filters.triggerEvent);
    if (filters.userIdSearch) q = q.eq('user_id', filters.userIdSearch);
    if (filters.fromDate) q = q.gte('accepted_at', filters.fromDate);
    if (filters.toDate) q = q.lte('accepted_at', filters.toDate);

    const { data, error } = await q;
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as LedgerRow[];
    all.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function useExportLegalLedger() {
  return useMutation({
    mutationFn: async (filters: Omit<LedgerFilters, 'page' | 'pageSize'>) => {
      const rows = await fetchAllRows(filters);
      const blob = buildLedgerCsvBlob(rows);
      triggerDownload(blob, suggestLedgerFilename());
      return { exported: rows.length };
    },
    onSuccess: ({ exported }) => {
      if (exported === 0) {
        toast.info('No rows matched — empty CSV exported.');
      } else if (exported >= MAX_EXPORT_ROWS) {
        toast.warning(
          `Exported ${exported.toLocaleString()} rows (cap reached). Narrow your filters for a complete export.`,
        );
      } else {
        toast.success(`Exported ${exported.toLocaleString()} acceptance rows.`);
      }
    },
    onError: (e: Error) =>
      handleMutationError(e, { operation: 'export_legal_ledger' }),
  });
}
