/**
 * usePlatformSpaTemplate — Fetches the active platform SPA template.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { handleQueryError } from '@/lib/errorHandler';

interface SpaTemplate {
  id: string;
  document_name: string;
  content: string | null;
}

export function usePlatformSpaTemplate() {
  return useQuery<SpaTemplate | null>({
    queryKey: ['platform-spa-template'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('legal_document_templates')
        .select('template_id, document_name, content')
        .eq('document_code', 'SPA')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      if (error) { handleQueryError(error, { operation: 'fetch_platform_spa' }); return null; }
      if (!data) return null;
      return { id: data.template_id, document_name: data.document_name, content: data.content };
    },
    staleTime: 15 * 60_000,
  });
}
