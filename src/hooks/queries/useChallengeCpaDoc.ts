/**
 * useChallengeCpaDoc — Fetches the assembled CPA document for a challenge.
 * Prefers a creator-provided QUICK override; falls back to the unified SPA.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { handleQueryError } from '@/lib/errorHandler';
import { CACHE_FREQUENT } from '@/config/queryCache';

export interface ChallengeCpaDoc {
  id: string;
  document_type: string;
  document_name: string | null;
  content: string | null;
  content_html: string | null;
  status: string | null;
  override_strategy: string | null;
  target_template_code: string | null;
}

const COLUMNS =
  'id, document_type, document_name, content, content_html, status, override_strategy, target_template_code';

export function useChallengeCpaDoc(challengeId: string | undefined) {
  return useQuery<ChallengeCpaDoc | null>({
    queryKey: ['cpa-enrollment', challengeId],
    queryFn: async () => {
      if (!challengeId) return null;

      // 1) Creator-uploaded QUICK override (per-challenge replacement)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: overrideDoc, error: overrideError } = await (supabase.from('challenge_legal_docs') as any)
        .select(COLUMNS)
        .eq('challenge_id', challengeId)
        .eq('document_type', 'SOURCE_DOC')
        .eq('source_origin', 'creator')
        .eq('override_strategy', 'REPLACE_DEFAULT')
        .eq('target_template_code', 'CPA_QUICK')
        .eq('status', 'uploaded')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (overrideError) {
        handleQueryError(overrideError, { operation: 'fetch_cpa_override' });
      } else if (overrideDoc) {
        return overrideDoc as ChallengeCpaDoc;
      }

      // 2) Fall back to the assembled UNIFIED_SPA
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('challenge_legal_docs') as any)
        .select(COLUMNS)
        .eq('challenge_id', challengeId)
        .eq('document_type', 'UNIFIED_SPA')
        .eq('is_assembled', true)
        .in('status', ['APPROVED', 'DRAFT'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        handleQueryError(error, { operation: 'fetch_cpa_unified' });
        return null;
      }
      return (data ?? null) as ChallengeCpaDoc | null;
    },
    enabled: !!challengeId,
    ...CACHE_FREQUENT,
  });
}
