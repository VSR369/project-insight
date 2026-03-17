/**
 * useCogniWaitingFor — Fetches the "waiting_for" array from get_user_dashboard_data.
 * Each item is enriched with SLA status for the current waiting phase.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CACHE_FREQUENT } from '@/config/queryCache';
import type { SlaStatus } from './useCogniDashboard';

/* ── Types ────────────────────────────────────────────────── */

export interface WaitingForChallenge {
  challenge_id: string;
  title: string;
  current_phase: number;
  phase_label: string;
  waiting_for_role: string;
  waiting_for_role_name: string;
  next_user_phase: number | null;
  next_user_phase_label: string | null;
  next_user_role_name: string | null;
}

export interface EnrichedWaitingChallenge extends WaitingForChallenge {
  sla: SlaStatus | null;
}

/* ── Hook ─────────────────────────────────────────────────── */

export function useCogniWaitingFor(userId: string | undefined) {
  return useQuery({
    queryKey: ['cogni-waiting-for', userId],
    queryFn: async (): Promise<EnrichedWaitingChallenge[]> => {
      if (!userId) return [];

      const { data: raw, error } = await supabase.rpc('get_user_dashboard_data', {
        p_user_id: userId,
      });
      if (error) throw new Error(error.message);

      const parsed = (typeof raw === 'string' ? JSON.parse(raw) : raw) as {
        waiting_for?: WaitingForChallenge[];
      };

      const items: WaitingForChallenge[] = parsed?.waiting_for ?? [];
      if (items.length === 0) return [];

      // Enrich with SLA for the waiting phase
      const enriched = await Promise.all(
        items.map(async (item) => {
          const slaRes = await supabase.rpc('check_sla_status', {
            p_challenge_id: item.challenge_id,
            p_phase: item.current_phase,
          });

          const sla = slaRes.error
            ? null
            : ((typeof slaRes.data === 'string'
                ? JSON.parse(slaRes.data)
                : slaRes.data) as SlaStatus | null);

          return { ...item, sla } satisfies EnrichedWaitingChallenge;
        }),
      );

      return enriched;
    },
    enabled: !!userId,
    ...CACHE_FREQUENT,
  });
}
