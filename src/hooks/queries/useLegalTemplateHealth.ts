/**
 * useLegalTemplateHealth — Calls the SQL `legal_template_health()` RPC and
 * returns one row per required document code with effective-active status.
 *
 * Phase 9 v4 — Prompt 3.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { handleQueryError } from '@/lib/errorHandler';

export interface LegalTemplateHealthRow {
  document_code: string;
  is_healthy: boolean;
  template_id: string | null;
  version: string | null;
  version_status: string | null;
  effective_date: string | null;
  expires_at: string | null;
}

export function useLegalTemplateHealth() {
  return useQuery<LegalTemplateHealthRow[]>({
    queryKey: ['legal-template-health'],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('legal_template_health');
      if (error) {
        handleQueryError(error, { operation: 'fetch_legal_template_health' });
        return [];
      }
      return (data ?? []) as LegalTemplateHealthRow[];
    },
    staleTime: 60_000,
  });
}
