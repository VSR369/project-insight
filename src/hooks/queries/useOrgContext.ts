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
        .select('operating_model, governance_profile')
        .eq('id', orgId)
        .single();

      if (error) throw new Error(error.message);

      return {
        operatingModel: (data.operating_model as 'MP' | 'AGG') ?? null,
        governanceProfile: data.governance_profile ?? null,
      };
    },
    enabled: !!orgId,
    ...CACHE_STABLE,
  });
}

