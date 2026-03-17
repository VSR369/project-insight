/**
 * useSolutionRequestContext — Provides org operating model + phase1_bypass
 * and Challenge Architect (CR role) users for the Solution Request form.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentOrg } from '@/hooks/queries/useCurrentOrg';
import { CACHE_STABLE } from '@/config/queryCache';

export interface OrgModelContext {
  operatingModel: 'MP' | 'AGG' | null;
  phase1Bypass: boolean;
  governanceProfile: string | null;
}

export function useOrgModelContext() {
  const { data: currentOrg } = useCurrentOrg();
  const orgId = currentOrg?.organizationId;

  return useQuery({
    queryKey: ['org_model_context', orgId],
    queryFn: async (): Promise<OrgModelContext> => {
      if (!orgId) throw new Error('No org');

      const { data, error } = await supabase
        .from('seeker_organizations')
        .select('operating_model, phase1_bypass, governance_profile')
        .eq('id', orgId)
        .single();

      if (error) throw new Error(error.message);

      return {
        operatingModel: (data.operating_model as 'MP' | 'AGG') ?? null,
        phase1Bypass: !!(data as any).phase1_bypass,
        governanceProfile: data.governance_profile ?? null,
      };
    },
    enabled: !!orgId,
    ...CACHE_STABLE,
  });
}

export interface ChallengeArchitect {
  userId: string;
  userName: string;
  userEmail: string;
}

/**
 * Fetches users with CR (Challenge Architect / R3) role in the same org.
 * Used in MP model to assign challenge to an architect.
 */
export function useChallengeArchitects() {
  const { data: currentOrg } = useCurrentOrg();
  const orgId = currentOrg?.organizationId;

  return useQuery({
    queryKey: ['challenge_architects', orgId],
    queryFn: async (): Promise<ChallengeArchitect[]> => {
      if (!orgId) return [];

      // CR role is R3 in md_slm_role_codes
      const { data, error } = await supabase
        .from('role_assignments')
        .select('user_id, user_name, user_email')
        .eq('org_id', orgId)
        .eq('role_code', 'R3')
        .eq('status', 'active');

      if (error) throw new Error(error.message);

      return (data ?? [])
        .filter(r => r.user_id)
        .map(r => ({
          userId: r.user_id!,
          userName: r.user_name || r.user_email,
          userEmail: r.user_email,
        }));
    },
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
