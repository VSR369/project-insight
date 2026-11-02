/**
 * useProviderChallengeView — BR-CHL-P09 provider-safe challenge view.
 * Server decides org identity masking, confidential field/attachment gating
 * (CPA acceptance + BR-CHL-P10 eligibility) and audits confidential views.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CACHE_STANDARD } from '@/config/queryCache';
import { handleQueryError } from '@/lib/errorHandler';

export interface ProviderChallengeAttachment {
  id: string;
  section_key: string | null;
  file_name: string | null;
  display_name: string | null;
  description: string | null;
  mime_type: string | null;
  file_size: number | null;
  source_type: string | null;
  source_url: string | null;
  url_title: string | null;
  shared_with_solver: boolean | null;
  is_confidential: boolean;
  storage_path: string | null;
}

export interface ProviderChallengeView {
  allowed: boolean;
  reason?: string;
  privileged?: boolean;
  cpa_accepted?: boolean;
  is_winner?: boolean;
  identity_revealed?: boolean;
  org_display?: string | null;
  industry_name?: string | null;
  confidential_fields?: Record<string, unknown> | null;
  attachments?: ProviderChallengeAttachment[];
}

export function useProviderChallengeView(challengeId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['provider-challenge-view', challengeId],
    enabled: !!challengeId && enabled,
    queryFn: async (): Promise<ProviderChallengeView | null> => {
      if (!challengeId) return null;
      const { data, error } = await supabase.rpc('get_provider_challenge_view', { p_challenge_id: challengeId });
      if (error) {
        handleQueryError(error, { operation: 'get_provider_challenge_view' });
        throw error;
      }
      return (data ?? null) as unknown as ProviderChallengeView | null;
    },
    ...CACHE_STANDARD,
  });
}
