/**
 * usePwaTemplate — Fetches the active PWA legal document template.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { handleQueryError } from '@/lib/errorHandler';
import { CACHE_STATIC } from '@/config/queryCache';

export interface PwaTemplate {
  template_id: string;
  document_name: string;
  content: string | null;
  version: string;
  summary: string | null;
}

export function usePwaTemplate() {
  return useQuery<PwaTemplate | null>({
    queryKey: ['pwa-template'],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('legal_document_templates') as any)
        .select('template_id, document_name, content, version, summary')
        .eq('document_code', 'PWA')
        .eq('is_active', true)
        .eq('version_status', 'ACTIVE')
        .maybeSingle();
      if (error) {
        handleQueryError(error, { operation: 'fetch_pwa_template' });
        return null;
      }
      return (data ?? null) as PwaTemplate | null;
    },
    ...CACHE_STATIC,
  });
}
