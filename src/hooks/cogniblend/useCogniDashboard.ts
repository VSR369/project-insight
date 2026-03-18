/**
 * useCogniDashboard — Fetches dashboard data for the current CogniBlend user.
 * Calls get_user_dashboard_data, then enriches each needs_action item
 * with SLA status and valid transitions.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CACHE_FREQUENT } from '@/config/queryCache';

/* ── Response shapes ─────────────────────────────────────── */

export interface NeedsActionChallenge {
  challenge_id: string;
  title: string;
  current_phase: number;
  phase_label: string;
  organization_id: string;
}

export interface SlaStatus {
  status: 'ON_TRACK' | 'APPROACHING' | 'BREACHED';
  days_remaining: number | null;
  days_overdue: number | null;
  percentage_used: number;
  deadline_at?: string | null;
}

export interface ValidTransition {
  action: string;
  label: string;
  style: 'primary' | 'outline' | 'destructive';
}

export interface EnrichedChallenge extends NeedsActionChallenge {
  sla: SlaStatus | null;
  transitions: ValidTransition[];
}

/* ── Hook ─────────────────────────────────────────────────── */

export function useCogniDashboard(userId: string | undefined) {
  return useQuery({
    queryKey: ['cogni-dashboard', userId],
    queryFn: async (): Promise<EnrichedChallenge[]> => {
      if (!userId) return [];

      // 1. Fetch dashboard data
      const { data: raw, error } = await supabase.rpc('get_user_dashboard_data', {
        p_user_id: userId,
      });
      if (error) throw new Error(error.message);

      const parsed = (typeof raw === 'string' ? JSON.parse(raw) : raw) as {
        needs_action?: NeedsActionChallenge[];
      };

      const items: NeedsActionChallenge[] = parsed?.needs_action ?? [];
      if (items.length === 0) return [];

      // 2. Enrich each item with SLA + transitions (parallel)
      const enriched = await Promise.all(
        items.map(async (item) => {
          const [slaRes, transRes] = await Promise.all([
            supabase.rpc('check_sla_status', {
              p_challenge_id: item.challenge_id,
              p_phase: item.current_phase,
            }),
            supabase.rpc('get_valid_transitions', {
              p_challenge_id: item.challenge_id,
              p_user_id: userId,
            }),
          ]);

          const sla = slaRes.error
            ? null
            : ((typeof slaRes.data === 'string'
                ? JSON.parse(slaRes.data)
                : slaRes.data) as SlaStatus | null);

          const transitions = transRes.error
            ? []
            : ((typeof transRes.data === 'string'
                ? JSON.parse(transRes.data)
                : transRes.data) as ValidTransition[] | null) ?? [];

          return { ...item, sla, transitions } satisfies EnrichedChallenge;
        }),
      );

      return enriched;
    },
    enabled: !!userId,
    ...CACHE_FREQUENT,
  });
}
