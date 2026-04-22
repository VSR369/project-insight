/**
 * useFcFinanceData — Fetches the challenge metadata needed by the
 * Finance Coordinator workspace.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FcChallengeRow {
  id: string;
  title: string;
  reward_structure: Record<string, unknown> | null;
  governance_profile: string | null;
  governance_mode_override: string | null;
  operating_model: string | null;
  current_phase: number | null;
  phase_status: string | null;
  fc_compliance_complete: boolean | null;
  lc_compliance_complete: boolean | null;
  currency_code: string | null;
  organization_id: string | null;
}

export function useChallengeForFC(challengeId: string | undefined) {
  return useQuery({
    queryKey: ['challenge-fc-detail', challengeId],
    queryFn: async (): Promise<FcChallengeRow | null> => {
      if (!challengeId) return null;
      const { data, error } = await supabase
        .from('challenges')
        .select(
          'id, title, reward_structure, governance_profile, governance_mode_override, operating_model, current_phase, phase_status, fc_compliance_complete, lc_compliance_complete, currency_code, organization_id',
        )
        .eq('id', challengeId)
        .single();
      if (error) throw new Error(error.message);
      return data as unknown as FcChallengeRow;
    },
    enabled: !!challengeId,
    staleTime: 60_000,
  });
}
