/**
 * useCogniUserRoles — Fetches all challenge role_codes for the current user
 * via the get_user_all_challenge_roles RPC and returns a flat Set of role codes.
 *
 * `humanAssignedRoleCodes` contains role codes from non-QUICK challenges only —
 * these represent roles where a human actor was explicitly assigned, not
 * auto-completed system artifacts from QUICK mode workflow advancement.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';


export interface UserChallengeRoleRow {
  challenge_id: string;
  challenge_title: string;
  current_phase: number;
  master_status: string;
  operating_model: string;
  phase_status: string;
  role_codes: string[];
  governance_mode: string;
}

export function useCogniUserRoles() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['cogni_user_roles', user?.id],
    queryFn: async (): Promise<UserChallengeRoleRow[]> => {
      if (!user?.id) return [];
      const { data, error } = await supabase.rpc('get_user_all_challenge_roles', {
        p_user_id: user.id,
      });
      if (error) throw new Error(error.message);

      // Resolve legacy role codes in each row
      const rows = (data ?? []) as UserChallengeRoleRow[];
      return rows;
    },
    enabled: !!user?.id,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  // Flatten all role_codes into a single Set for sidebar visibility
  const allRoleCodes = new Set<string>();
  if (query.data) {
    for (const row of query.data) {
      if (row.role_codes) {
        for (const code of row.role_codes) {
          allRoleCodes.add(code);
        }
      }
    }
  }

  // Badge counts derived from challenge data
  const activeChallengeCount = query.data?.filter(
    (r) => r.master_status === 'ACTIVE' || r.master_status === 'IN_PREPARATION'
  ).length ?? 0;

  const curationQueueCount = query.data?.filter(
    (r) => (r.current_phase === 1 || r.current_phase === 2 || r.current_phase === 3) && r.master_status === 'IN_PREPARATION'
  ).length ?? 0;

  const approvalQueueCount = query.data?.filter(
    (r) => r.current_phase === 4 && r.master_status === 'IN_PREPARATION'
  ).length ?? 0;

  // Collect role codes ONLY from challenges where a human actor was assigned
  // (not auto-completed system artifacts from QUICK mode)
  const humanAssignedRoleCodes = new Set<string>();
  if (query.data) {
    for (const row of query.data) {
      if (row.governance_mode && row.governance_mode.toUpperCase() !== 'QUICK') {
        for (const code of row.role_codes ?? []) {
          humanAssignedRoleCodes.add(code);
        }
      }
    }
  }

  const hasHumanAssignedRoles = humanAssignedRoleCodes.size > 0;

  return {
    ...query,
    allRoleCodes,
    activeChallengeCount,
    curationQueueCount,
    approvalQueueCount,
    hasHumanAssignedRoles,
    humanAssignedRoleCodes,
  };
}
