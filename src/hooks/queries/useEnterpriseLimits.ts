/**
 * useEnterpriseLimits — Single read hook for effective seat / quota / feature
 * gates for an organization. Wraps `useActiveEnterpriseAgreement` and the
 * org's tier defaults so consumers never have to know whether an org is on
 * a negotiated Enterprise contract or a standard tier.
 *
 * Architecture: the override-resolution math lives in
 * `enterpriseLimitsService` (pure, unit-testable). This hook is a thin
 * data layer on top.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useActiveEnterpriseAgreement } from '@/hooks/queries/useEnterpriseAgreement';
import {
  resolveLimit,
  isFeatureGateEnabled,
  type FeatureGateMap,
} from '@/services/enterprise/enterpriseLimitsService';

interface OrgTierDefaults {
  tierId: string | null;
  tierCode: string | null;
  tierName: string | null;
  maxChallenges: number | null;
  maxUsers: number | null;
  isEnterpriseTier: boolean;
}

const EMPTY_DEFAULTS: OrgTierDefaults = {
  tierId: null,
  tierCode: null,
  tierName: null,
  maxChallenges: null,
  maxUsers: null,
  isEnterpriseTier: false,
};

function useOrgTierDefaults(orgId: string | null | undefined) {
  return useQuery({
    queryKey: ['org_tier_defaults', orgId],
    queryFn: async (): Promise<OrgTierDefaults> => {
      if (!orgId) return EMPTY_DEFAULTS;
      const { data, error } = await supabase
        .from('seeker_subscriptions')
        .select(
          'tier_id, md_subscription_tiers!seeker_subscriptions_tier_id_fkey(id, code, name, max_challenges, max_users, is_enterprise)',
        )
        .eq('organization_id', orgId)
        .eq('status', 'active')
        .maybeSingle();
      if (error) throw new Error(error.message);
      const tier = data?.md_subscription_tiers as unknown as
        | {
            id: string;
            code: string;
            name: string;
            max_challenges: number | null;
            max_users: number | null;
            is_enterprise: boolean | null;
          }
        | null
        | undefined;
      if (!tier) return EMPTY_DEFAULTS;
      return {
        tierId: tier.id,
        tierCode: tier.code,
        tierName: tier.name,
        maxChallenges: tier.max_challenges,
        maxUsers: tier.max_users,
        isEnterpriseTier: !!tier.is_enterprise,
      };
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export interface EnterpriseLimits {
  /** Effective max challenges (override ?? tier default). null = unlimited. */
  maxChallenges: number | null;
  /** Effective max user seats. null = unlimited. */
  maxUsers: number | null;
  /** Effective max storage GB. null = unlimited. */
  maxStorageGb: number | null;
  /** Read-only map of feature gate keys to effective booleans. */
  featureGates: FeatureGateMap;
  /** True when the org has an active Enterprise agreement (regardless of tier). */
  hasActiveAgreement: boolean;
  /** True when the org is on an Enterprise tier (with or without agreement). */
  isEnterpriseTier: boolean;
  /** Strict typed gate read. Use this in components. */
  isGateEnabled: (key: string) => boolean;
  /** Loading state aggregated from both underlying queries. */
  isLoading: boolean;
}

const EMPTY_LIMITS: Omit<EnterpriseLimits, 'isGateEnabled' | 'isLoading'> = {
  maxChallenges: null,
  maxUsers: null,
  maxStorageGb: null,
  featureGates: {},
  hasActiveAgreement: false,
  isEnterpriseTier: false,
};

export function useEnterpriseLimits(orgId: string | null | undefined): EnterpriseLimits {
  const { data: agreement, isLoading: agreementLoading } = useActiveEnterpriseAgreement(orgId);
  const { data: tier, isLoading: tierLoading } = useOrgTierDefaults(orgId);

  const limits = useMemo(() => {
    if (!orgId) return EMPTY_LIMITS;
    const base = tier ?? EMPTY_DEFAULTS;
    const gates = (agreement?.feature_gates ?? {}) as FeatureGateMap;
    return {
      maxChallenges: resolveLimit(agreement?.max_challenges_override, base.maxChallenges),
      maxUsers: resolveLimit(agreement?.max_users_override, base.maxUsers),
      maxStorageGb: resolveLimit(agreement?.max_storage_gb_override, null),
      featureGates: gates,
      hasActiveAgreement: !!agreement,
      isEnterpriseTier: base.isEnterpriseTier,
    };
  }, [orgId, agreement, tier]);

  return {
    ...limits,
    isGateEnabled: (key: string) => isFeatureGateEnabled(limits.featureGates, key),
    isLoading: agreementLoading || tierLoading,
  };
}
