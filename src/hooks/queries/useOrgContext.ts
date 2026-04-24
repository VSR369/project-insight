/**
 * useOrgContext — Provides org operating model context
 * and Challenge Creator (CR role) users for the challenge form.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentOrg } from '@/hooks/queries/useCurrentOrg';
import { CACHE_STABLE } from '@/config/queryCache';

export interface OrgModelContext {
  operatingModel: 'MP' | 'AGG' | null;
  governanceProfile: string | null;
  /** Org's primary industry segment id (resolved from seeker_org_industries.is_primary=true). */
  primaryIndustryId: string | null;
}

export function useOrgModelContext() {
  const { data: currentOrg } = useCurrentOrg();
  const orgId = currentOrg?.organizationId;

  return useQuery({
    queryKey: ['org_model_context', orgId],
    queryFn: async (): Promise<OrgModelContext> => {
      if (!orgId) throw new Error('No org');

      const [orgResult, primaryResult] = await Promise.all([
        supabase
          .from('seeker_organizations')
          .select('operating_model, governance_profile')
          .eq('id', orgId)
          .single(),
        supabase
          .from('seeker_org_industries')
          .select('industry_id')
          .eq('organization_id', orgId)
          .eq('is_primary', true)
          .maybeSingle(),
      ]);

      if (orgResult.error) throw new Error(orgResult.error.message);

      return {
        operatingModel: (orgResult.data.operating_model as 'MP' | 'AGG') ?? null,
        governanceProfile: orgResult.data.governance_profile ?? null,
        primaryIndustryId: (primaryResult.data?.industry_id as string | undefined) ?? null,
      };
    },
    enabled: !!orgId,
    ...CACHE_STABLE,
  });
}

