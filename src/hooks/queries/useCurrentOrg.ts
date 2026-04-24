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
  hqCountryId: string | null;
  isInternalDepartment: boolean;
  verificationStatus: string | null;
  tcVersionAccepted: string | null;
  governanceProfile: string;
  lcReviewRequired: boolean;
  /** Org's primary industry segment id (resolved from seeker_org_industries.is_primary=true). */
  primaryIndustryId: string | null;
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
          seeker_organizations!org_users_organization_id_fkey (
            id,
            legal_entity_name,
            tenant_id,
            hq_country_id,
            verification_status,
            tc_version_accepted,
            governance_profile,
            lc_review_required,
            seeker_subscriptions!seeker_subscriptions_organization_id_fkey (
              md_subscription_tiers!seeker_subscriptions_tier_id_fkey ( code )
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
      const tierCode = org?.seeker_subscriptions?.[0]?.md_subscription_tiers?.code ?? null;
      const orgId = data.organization_id;

      // Parallel: internal-department check + primary industry lookup
      const [saasResult, primaryResult] = await Promise.all([
        supabase
          .from('saas_agreements')
          .select('id')
          .eq('child_organization_id', orgId)
          .eq('lifecycle_status', 'active')
          .limit(1)
          .maybeSingle(),
        supabase
          .from('seeker_org_industries')
          .select('industry_id')
          .eq('organization_id', orgId)
          .eq('is_primary', true)
          .maybeSingle(),
      ]);

      return {
        organizationId: orgId,
        tenantId: org?.tenant_id ?? orgId,
        orgRole: data.role,
        orgName: org?.legal_entity_name ?? 'Organization',
        tierCode,
        hqCountryId: org?.hq_country_id ?? null,
        isInternalDepartment: !!saasResult.data,
        verificationStatus: org?.verification_status ?? null,
        tcVersionAccepted: org?.tc_version_accepted ?? null,
        governanceProfile: org?.governance_profile ?? 'QUICK',
        lcReviewRequired: !!(org?.lc_review_required),
        primaryIndustryId: (primaryResult.data?.industry_id as string | undefined) ?? null,
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
