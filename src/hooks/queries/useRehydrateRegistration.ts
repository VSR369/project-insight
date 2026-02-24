/**
 * Rehydrate Registration Context from Database
 * 
 * Recovery hook: when sessionStorage state is lost (hot-reload, session expiry),
 * this hook queries the database for the user's most recent organization and
 * subscription data, then repopulates the RegistrationContext.
 */

import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRegistrationContext } from '@/contexts/RegistrationContext';

export function useRehydrateRegistration() {
  const { user } = useAuth();
  const { state, setOrgId, setStep1Data, setStep4Data } = useRegistrationContext();
  const hasRehydrated = useRef(false);

  const needsRehydration = !state.organizationId || !state.step4;

  const { data: orgData, isLoading: orgLoading, isError: orgError } = useQuery({
    queryKey: ['rehydrate_org', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Find the user's most recent org that reached at least step 4
      const { data: org, error: orgErr } = await supabase
        .from('seeker_organizations')
        .select('id, tenant_id, legal_entity_name, hq_country_id, registration_step, organization_type_id')
        .eq('created_by', user.id)
        .gte('registration_step', 4)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (orgErr) throw new Error(orgErr.message);
      if (!org) return null;

      // Try to find existing subscription for step4 data
      const { data: sub, error: subErr } = await supabase
        .from('seeker_subscriptions')
        .select('tier_id, billing_cycle_id, engagement_model_id')
        .eq('organization_id', org.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subErr) throw new Error(subErr.message);

      return { org, sub };
    },
    enabled: !!user?.id && needsRehydration,
    staleTime: 30 * 1000,
    retry: 1,
  });

  // Populate context once when data arrives
  useEffect(() => {
    if (hasRehydrated.current || !orgData?.org || !needsRehydration) return;

    const { org, sub } = orgData;

    // Restore org ID
    if (!state.organizationId) {
      setOrgId(org.id, org.tenant_id);
    }

    // Restore step1 (minimal fields needed for pricing lookup)
    if (!state.step1) {
      setStep1Data({
        legal_entity_name: org.legal_entity_name ?? '',
        hq_country_id: org.hq_country_id ?? '',
        organization_type_id: org.organization_type_id ?? '',
        industry_ids: [],
        company_size_range: '1-10',
        annual_revenue_range: '<1M',
        year_founded: new Date().getFullYear(),
        state_province_id: '',
        city: '',
        operating_geography_ids: [],
        trade_brand_name: '',
      });
    }

    // Restore step4 from subscription if available
    if (!state.step4 && sub) {
      setStep4Data({
        tier_id: sub.tier_id,
        billing_cycle_id: sub.billing_cycle_id,
        engagement_model_id: sub.engagement_model_id ?? undefined,
        estimated_challenges_per_month: 0,
      });
    }

    hasRehydrated.current = true;
  }, [orgData, needsRehydration, state.organizationId, state.step1, state.step4, setOrgId, setStep1Data, setStep4Data]);

  return {
    isRehydrating: needsRehydration && orgLoading,
    rehydrationFailed: needsRehydration && !orgLoading && (!orgData?.org || orgError),
    rehydrated: hasRehydrated.current || (!!orgData?.org && !needsRehydration),
  };
}
