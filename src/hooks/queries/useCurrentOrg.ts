/**
 * useCurrentOrg — Resolves the authenticated user's organization
 * from the org_users table. Provides organizationId, tenantId, role.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface CurrentOrg {
  organizationId: string;
  tenantId: string;
  orgRole: string;
  orgName: string;
  tierCode: string | null;
}

export function useCurrentOrg() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['current_org', user?.id],
    queryFn: async (): Promise<CurrentOrg | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('org_users')
        .select(`
          organization_id,
          role,
          seeker_organizations!inner (
            id,
            legal_entity_name,
            tenant_id,
            org_subscriptions (
              md_subscription_tiers ( code )
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) return null;

      const org = data.seeker_organizations as any;
      const tierCode = org?.org_subscriptions?.[0]?.md_subscription_tiers?.code ?? null;

      return {
        organizationId: data.organization_id,
        tenantId: org?.tenant_id ?? data.organization_id,
        orgRole: data.role,
        orgName: org?.legal_entity_name ?? 'Organization',
        tierCode,
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
