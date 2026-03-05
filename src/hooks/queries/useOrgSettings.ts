/**
 * Organization Settings Data Hooks (ORG-001)
 * 
 * React Query hooks for fetching and updating organization profile,
 * subscription, engagement model, and audit trail.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { withUpdatedBy } from '@/lib/auditFields';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';

const ORG_CACHE = { staleTime: 30 * 1000, gcTime: 5 * 60 * 1000 };
const MASTER_CACHE = { staleTime: 5 * 60 * 1000, gcTime: 30 * 60 * 1000 };

// ============================================================
// Fetch Organization Profile
// ============================================================
export function useOrgProfile(organizationId?: string) {
  return useQuery({
    queryKey: ['org_profile', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const { data, error } = await supabase
        .from('seeker_organizations')
        .select(`
          id, tenant_id, organization_name, legal_entity_name, trade_brand_name,
          organization_type_id, employee_count_range, annual_revenue_range,
          founding_year, hq_country_id, hq_state_province_id, hq_city,
          hq_address_line1, hq_address_line2, hq_postal_code,
          website_url, organization_description, logo_url,
          preferred_currency, date_format, number_format, timezone,
          is_enterprise, subsidized_discount_pct, registration_step,
          organization_types:organization_type_id(id, name),
          countries:hq_country_id(id, name, code)
        `)
        .eq('id', organizationId)
        .eq('is_deleted', false)
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!organizationId,
    ...ORG_CACHE,
  });
}

// ============================================================
// Fetch Organization Industries
// ============================================================
export function useOrgIndustries(organizationId?: string) {
  return useQuery({
    queryKey: ['org_industries', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('seeker_org_industries')
        .select('id, industry_id, industry_segments:industry_id(id, name)')
        .eq('organization_id', organizationId);
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!organizationId,
    ...ORG_CACHE,
  });
}

// ============================================================
// Fetch Active Subscription
// ============================================================
export function useOrgSubscription(organizationId?: string) {
  return useQuery({
    queryKey: ['org_subscription', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const { data, error } = await supabase
        .from('seeker_subscriptions')
        .select(`
          id, tier_id, billing_cycle_id, engagement_model_id,
          status, starts_at, ends_at, auto_renew,
          monthly_base_price, effective_monthly_cost, discount_percentage,
          challenges_used, challenge_limit_snapshot, max_solutions_snapshot,
          pending_downgrade_tier_id, pending_downgrade_date,
          current_period_start, current_period_end,
          md_subscription_tiers:tier_id(id, code, name, max_challenges, max_users),
          md_billing_cycles:billing_cycle_id(id, code, name, months, discount_percentage),
          md_engagement_models:engagement_model_id(id, code, name)
        `)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!organizationId,
    ...ORG_CACHE,
  });
}

// ============================================================
// Update Organization Profile
// ============================================================
export function useUpdateOrgProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      organization_name?: string;
      trade_brand_name?: string | null;
      website_url?: string | null;
      organization_description?: string | null;
      hq_address_line1?: string | null;
      hq_address_line2?: string | null;
      hq_city?: string | null;
      hq_postal_code?: string | null;
      timezone?: string | null;
    }) => {
      const withAudit = await withUpdatedBy(updates);
      const { data, error } = await supabase
        .from('seeker_organizations')
        .update({ ...withAudit, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['org_profile', variables.id] });
      toast.success('Organization profile updated successfully');
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'update_org_profile' });
    },
  });
}

// ============================================================
// Change Subscription Tier (Upgrade = immediate, Downgrade = next cycle)
// ============================================================
export function useChangeTier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      subscriptionId,
      organizationId,
      newTierId,
      isUpgrade,
    }: {
      subscriptionId: string;
      organizationId: string;
      newTierId: string;
      isUpgrade: boolean;
    }) => {
      if (isUpgrade) {
        // Immediate upgrade
        const withAudit = await withUpdatedBy({
          tier_id: newTierId,
          updated_at: new Date().toISOString(),
        });
        const { error } = await supabase
          .from('seeker_subscriptions')
          .update(withAudit)
          .eq('id', subscriptionId);
        if (error) throw new Error(error.message);
      } else {
        // Schedule downgrade for next billing cycle
        const { data: sub } = await supabase
          .from('seeker_subscriptions')
          .select('current_period_end')
          .eq('id', subscriptionId)
          .single();

        const downgradeDate = sub?.current_period_end || new Date().toISOString();
        const withAudit = await withUpdatedBy({
          pending_downgrade_tier_id: newTierId,
          pending_downgrade_date: downgradeDate,
          updated_at: new Date().toISOString(),
        });
        const { error } = await supabase
          .from('seeker_subscriptions')
          .update(withAudit)
          .eq('id', subscriptionId);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['org_subscription', variables.organizationId] });
      toast.success(
        variables.isUpgrade
          ? 'Tier upgraded successfully'
          : 'Downgrade scheduled for next billing cycle'
      );
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'change_tier' });
    },
  });
}

// ============================================================
// Switch Engagement Model (Basic tier only, BR-MSL-001)
// ============================================================
export function useSwitchEngagementModel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      subscriptionId,
      organizationId,
      newModelId,
    }: {
      subscriptionId: string;
      organizationId: string;
      newModelId: string;
    }) => {
      const withAudit = await withUpdatedBy({
        engagement_model_id: newModelId,
        updated_at: new Date().toISOString(),
      });
      const { error } = await supabase
        .from('seeker_subscriptions')
        .update(withAudit)
        .eq('id', subscriptionId);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['org_subscription', variables.organizationId] });
      toast.success('Engagement model updated successfully');
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'switch_engagement_model' });
    },
  });
}

// ============================================================
// Check Active Challenges (BR-MSL-001 blocker)
// ============================================================
export function useActiveChallenges(organizationId?: string) {
  return useQuery({
    queryKey: ['active_challenges', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('challenges')
        .select('id, title, status')
        .eq('organization_id', organizationId)
        .eq('is_deleted', false)
        .in('status', ['draft', 'open', 'in_progress', 'matching', 'shortlisted']);
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!organizationId,
    ...ORG_CACHE,
  });
}

// ============================================================
// Audit Trail
// ============================================================
export function useOrgAuditTrail(organizationId?: string) {
  return useQuery({
    queryKey: ['org_audit_trail', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('seeker_organization_audit')
        .select('id, field_name, old_value, new_value, changed_at, changed_by, change_reason')
        .eq('organization_id', organizationId)
        .order('changed_at', { ascending: false })
        .limit(50);
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!organizationId,
    ...ORG_CACHE,
  });
}
