import type { Database, Json } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { resolveGovernanceMode } from '@/lib/governanceMode';

export interface FcQueueItem {
  challengeId: string;
  title: string;
  rewardTotal: number;
  currency: string;
  escrowStatus: string | null;
  currentPhase: number;
  fcComplianceComplete: boolean;
  createdAt: string;
}

type UserChallengeRoleRow = Pick<
  Database['public']['Tables']['user_challenge_roles']['Row'],
  'challenge_id'
>;

type ChallengeRow = Pick<
  Database['public']['Tables']['challenges']['Row'],
  | 'id'
  | 'title'
  | 'reward_structure'
  | 'current_phase'
  | 'fc_compliance_complete'
  | 'governance_profile'
  | 'governance_mode_override'
  | 'created_at'
>;

type EscrowRow = Pick<
  Database['public']['Tables']['escrow_records']['Row'],
  'challenge_id' | 'escrow_status'
>;

function getRewardSummary(rewardStructure: Json | null): {
  total: number;
  currency: string;
} {
  if (!rewardStructure || Array.isArray(rewardStructure) || typeof rewardStructure !== 'object') {
    return { total: 0, currency: 'USD' };
  }

  const rewardRecord = rewardStructure as Record<string, Json | undefined>;
  const rawTotal = rewardRecord.platinum_award ?? rewardRecord.budget_max ?? 0;
  const total = typeof rawTotal === 'number' ? rawTotal : Number(rawTotal) || 0;
  const currency = typeof rewardRecord.currency === 'string' ? rewardRecord.currency : 'USD';
  return { total, currency };
}

export async function fetchFcQueueItems(userId: string): Promise<FcQueueItem[]> {
  const { data: roleRows, error: roleError } = await supabase
    .from('user_challenge_roles')
    .select('challenge_id')
    .eq('user_id', userId)
    .eq('role_code', 'FC')
    .eq('is_active', true);

  if (roleError) throw new Error(roleError.message);

  const challengeIds = (roleRows as UserChallengeRoleRow[] | null)?.map((row) => row.challenge_id) ?? [];
  if (challengeIds.length === 0) return [];

  const [{ data: challengeRows, error: challengeError }, { data: escrowRows, error: escrowError }] =
    await Promise.all([
      supabase
        .from('challenges')
        .select(
          'id, title, reward_structure, current_phase, fc_compliance_complete, governance_profile, governance_mode_override, created_at',
        )
        .in('id', challengeIds),
      supabase
        .from('escrow_records')
        .select('challenge_id, escrow_status')
        .in('challenge_id', challengeIds),
    ]);

  if (challengeError) throw new Error(challengeError.message);
  if (escrowError) throw new Error(escrowError.message);

  const escrowStatusByChallengeId = new Map<string, string | null>();
  for (const row of (escrowRows ?? []) as EscrowRow[]) {
    escrowStatusByChallengeId.set(row.challenge_id, row.escrow_status);
  }

  return ((challengeRows ?? []) as ChallengeRow[])
    .filter((row) => {
      const governanceMode = resolveGovernanceMode(
        row.governance_mode_override ?? row.governance_profile,
      );
      return governanceMode === 'CONTROLLED' && !row.fc_compliance_complete;
    })
    .map((row) => {
      const reward = getRewardSummary(row.reward_structure);
      return {
        challengeId: row.id,
        title: row.title,
        rewardTotal: reward.total,
        currency: reward.currency,
        escrowStatus: escrowStatusByChallengeId.get(row.id) ?? null,
        currentPhase: row.current_phase ?? 0,
        fcComplianceComplete: !!row.fc_compliance_complete,
        createdAt: row.created_at,
      };
    })
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}