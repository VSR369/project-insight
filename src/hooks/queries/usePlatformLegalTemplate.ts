/**
 * usePlatformLegalTemplate — Reads the active platform-default template for a
 * given document code (SPA / SKPA / PWA / CPA-*).
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PlatformLegalTemplate {
  template_id: string;
  document_code: string;
  document_name: string;
  version: string;
  content: string | null;
}

export function usePlatformLegalTemplate(documentCode: string | null | undefined) {
  return useQuery<PlatformLegalTemplate | null>({
    queryKey: ['platform-legal-template', documentCode],
    queryFn: async () => {
      if (!documentCode) return null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('legal_document_templates') as any)
        .select('template_id, document_code, document_name, version, content, template_content, effective_date, created_at')
        .eq('document_code', documentCode)
        .eq('is_active', true)
        .order('effective_date', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      return {
        template_id: data.template_id,
        document_code: data.document_code,
        document_name: data.document_name,
        version: data.version,
        content: (data.template_content ?? data.content ?? null) as string | null,
      };
    },
    enabled: !!documentCode,
    staleTime: 5 * 60_000,
  });
}
