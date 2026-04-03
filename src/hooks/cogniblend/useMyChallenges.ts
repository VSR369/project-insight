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
  role_codes: string[];
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
        .eq('is_active', true)
        .order('created_at', { referencedTable: 'challenges', ascending: false })
        .limit(50);

      if (error) throw new Error(error.message);

      const roleCounts: Record<string, number> = {};
      const challengeMap = new Map<string, MyChallengeItem>();

      // NOTE: is_deleted cannot be filtered server-side on joined tables in PostgREST. Client-side filter is intentional.
      for (const row of data ?? []) {
        const ch = row.challenges as unknown as Record<string, unknown>;
        if (!ch || ch.is_deleted) continue;

        const roleCode = row.role_code;
        roleCounts[roleCode] = (roleCounts[roleCode] ?? 0) + 1;

        const cid = ch.id as string;
        const existing = challengeMap.get(cid);
        if (existing) {
          if (!existing.role_codes.includes(roleCode)) {
            existing.role_codes.push(roleCode);
          }
        } else {
          challengeMap.set(cid, {
            challenge_id: cid,
            title: (ch.title as string) ?? '',
            current_phase: (ch.current_phase as number) ?? 1,
            master_status: (ch.master_status as string) ?? 'IN_PREPARATION',
            phase_status: (ch.phase_status as string) ?? 'ACTIVE',
            role_codes: [roleCode],
            governance_profile: (ch.governance_profile as string) ?? 'QUICK',
            governance_mode_override: (ch.governance_mode_override as string | null) ?? null,
            operating_model: (ch.operating_model as string | null) ?? null,
            created_at: (ch.created_at as string) ?? '',
          });
        }
      }

      return { items: Array.from(challengeMap.values()), roleCounts };
    },
    enabled: !!userId,
    ...CACHE_FREQUENT,
  });
}
