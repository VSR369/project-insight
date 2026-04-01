/**
 * useMyChallenges — Fetches challenges where the current user holds
 * any active role, grouped by role_code for tab filtering.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CACHE_FREQUENT } from '@/config/queryCache';

export interface MyChallengeItem {
  challenge_id: string;
  title: string;
  current_phase: number;
  master_status: string;
  phase_status: string;
  role_code: string;
  governance_profile: string;
  governance_mode_override: string | null;
  operating_model: string | null;
  created_at: string;
}

export interface MyChallengesData {
  items: MyChallengeItem[];
  roleCounts: Record<string, number>;
}

export function useMyChallenges(userId: string | undefined) {
  return useQuery({
    queryKey: ['cogni-my-challenges', userId],
    queryFn: async (): Promise<MyChallengesData> => {
      if (!userId) return { items: [], roleCounts: {} };

      const { data, error } = await supabase
        .from('user_challenge_roles')
        .select(`
          role_code,
          challenge_id,
          challenges!user_challenge_roles_challenge_id_fkey (
            id, title, current_phase, master_status, phase_status, governance_profile, governance_mode_override, operating_model, is_deleted, created_at
          )
        `)
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) throw new Error(error.message);

      const items: MyChallengeItem[] = [];
      const roleCounts: Record<string, number> = {};

      for (const row of data ?? []) {
        const ch = row.challenges as any;
        if (!ch || ch.is_deleted) continue;

        const roleCode = row.role_code;
        roleCounts[roleCode] = (roleCounts[roleCode] ?? 0) + 1;

        items.push({
          challenge_id: ch.id,
          title: ch.title,
          current_phase: ch.current_phase ?? 1,
          master_status: ch.master_status ?? 'IN_PREPARATION',
          phase_status: ch.phase_status ?? 'ACTIVE',
          role_code: roleCode,
          governance_profile: ch.governance_profile ?? 'LIGHTWEIGHT',
          governance_mode_override: ch.governance_mode_override ?? null,
          operating_model: ch.operating_model ?? null,
          created_at: ch.created_at ?? '',
        });
      }

      return { items, roleCounts };
    },
    enabled: !!userId,
    ...CACHE_FREQUENT,
  });
}
