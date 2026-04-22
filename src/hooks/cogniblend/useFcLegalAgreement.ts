import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { handleQueryError } from '@/lib/errorHandler';

export interface FcLegalAgreementRow {
  id: string;
  content_html: string | null;
  ai_modified_content_html: string | null;
  lc_reviewed_at: string | null;
}

interface QueryErrorWithCorrelation extends Error {
  correlationId?: string;
}

export function useFcLegalAgreement(challengeId: string | undefined) {
  return useQuery({
    queryKey: ['fc-legal-agreement', challengeId],
    enabled: !!challengeId,
    staleTime: 60_000,
    queryFn: async (): Promise<FcLegalAgreementRow | null> => {
      if (!challengeId) return null;

      const { data, error } = await supabase
        .from('challenge_legal_docs')
        .select('id, content_html, ai_modified_content_html, lc_reviewed_at')
        .eq('challenge_id', challengeId)
        .eq('document_type', 'UNIFIED_SPA')
        .eq('ai_review_status', 'accepted')
        .maybeSingle();

      if (error) {
        const handled = handleQueryError(error, {
          operation: 'fetch_fc_legal_agreement',
          component: 'useFcLegalAgreement',
        });
        const queryError = new Error(handled.message) as QueryErrorWithCorrelation;
        queryError.correlationId = handled.correlationId;
        throw queryError;
      }

      return data;
    },
  });
}
