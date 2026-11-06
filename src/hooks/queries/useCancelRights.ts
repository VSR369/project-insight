/**
 * useCancelRights — Gathers the inputs for the agreed cancel-rights rule
 * and evaluates them via the cancelRights service. Server-side enforcement
 * remains in the cancel_challenge RPC.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  evaluateCancelRights,
  type CancelRights,
} from '@/services/cogniblend/lifecycle/cancelRights';

interface CancelRightsContext {
  status: string;
  hasSubmissions: boolean;
  challengeRoleCodes: string[];
  slmRoleCodes: string[];
  isSeniorAdmin: boolean;
}

async function fetchCancelRightsContext(
  challengeId: string,
  userId: string,
): Promise<CancelRightsContext> {
  const [challengeRes, submissionsRes, rolesRes, poolRes, adminRes] =
    await Promise.all([
      supabase.from('challenges').select('status').eq('id', challengeId).single(),
      supabase
        .from('challenge_submissions')
        .select('id', { count: 'exact', head: true })
        .eq('challenge_id', challengeId),
      supabase
        .from('user_challenge_roles')
        .select('role_code')
        .eq('challenge_id', challengeId)
        .eq('user_id', userId)
        .eq('is_active', true),
      supabase
        .from('platform_provider_pool')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('platform_admin_profiles')
        .select('admin_tier')
        .eq('user_id', userId)
        .maybeSingle(),
    ]);

  if (challengeRes.error) throw new Error(challengeRes.error.message);

  let slmRoleCodes: string[] = [];
  if (poolRes.data?.id) {
    const { data: assignments } = await supabase
      .from('challenge_role_assignments')
      .select('role_code')
      .eq('challenge_id', challengeId)
      .eq('pool_member_id', poolRes.data.id)
      .eq('status', 'active');
    slmRoleCodes = (assignments ?? []).map((a) => a.role_code);
  }

  const tier = adminRes.data?.admin_tier ?? null;

  return {
    status: challengeRes.data.status,
    hasSubmissions: (submissionsRes.count ?? 0) > 0,
    challengeRoleCodes: (rolesRes.data ?? []).map((r) => r.role_code),
    slmRoleCodes,
    isSeniorAdmin: tier === 'senior_admin' || tier === 'supervisor',
  };
}

export function useCancelRights(
  challengeId: string | undefined,
  userId: string | undefined,
) {
  return useQuery({
    queryKey: ['cancel-rights', challengeId, userId],
    queryFn: async (): Promise<CancelRights> => {
      const context = await fetchCancelRightsContext(challengeId!, userId!);
      return evaluateCancelRights(context);
    },
    enabled: !!challengeId && !!userId,
    staleTime: 30_000,
  });
}
