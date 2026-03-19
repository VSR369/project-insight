/**
 * usePublicChallengeLegal — Fetches legal doc summary for a published challenge.
 * Returns NDA status, IP model, Tier 2 doc count for display on the public detail page.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CACHE_STANDARD } from '@/config/queryCache';

export interface ChallengeLegalSummary {
  hasNda: boolean;
  tier2DocCount: number;
  documentTypes: string[];
}

export function usePublicChallengeLegal(challengeId: string | undefined) {
  return useQuery({
    queryKey: ['public-challenge-legal', challengeId],
    queryFn: async (): Promise<ChallengeLegalSummary> => {
      if (!challengeId) return { hasNda: false, tier2DocCount: 0, documentTypes: [] };

      const { data, error } = await supabase
        .from('challenge_legal_docs')
        .select('document_type, tier')
        .eq('challenge_id', challengeId);

      if (error || !data) return { hasNda: false, tier2DocCount: 0, documentTypes: [] };

      const hasNda = data.some(
        (d) => d.document_type?.toLowerCase().includes('nda') || d.document_type?.toLowerCase().includes('non-disclosure')
      );
      const tier2Docs = data.filter((d) => d.tier === 'TIER_2' || d.tier === 'tier_2');
      const documentTypes = [...new Set(data.map((d) => d.document_type).filter(Boolean))] as string[];

      return {
        hasNda,
        tier2DocCount: tier2Docs.length,
        documentTypes,
      };
    },
    enabled: !!challengeId,
    ...CACHE_STANDARD,
  });
}
