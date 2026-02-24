/**
 * Plan Selection Data Hooks (REG-004)
 * 
 * React Query hooks for subscription tiers, pricing, billing cycles,
 * engagement models, and tier features.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const MASTER_CACHE = { staleTime: 5 * 60 * 1000, gcTime: 30 * 60 * 1000 };

// ============================================================
// Subscription Tiers
// ============================================================
export function useSubscriptionTiers() {
  return useQuery({
    queryKey: ['subscription_tiers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('md_subscription_tiers')
        .select('id, code, name, description, max_challenges, max_users, is_enterprise, display_order')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (error) throw new Error(error.message);
      return data;
    },
    ...MASTER_CACHE,
  });
}

// ============================================================
// Tier Features (per tier)
// ============================================================
export function useTierFeatures() {
  return useQuery({
    queryKey: ['tier_features'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('md_tier_features')
        .select('id, tier_id, feature_code, feature_name, description, access_type, usage_limit, display_order')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (error) throw new Error(error.message);
      return data;
    },
    ...MASTER_CACHE,
  });
}

// ============================================================
// Tier Pricing for Country (BR-REG-011)
// ============================================================
export function useTierPricingForCountry(countryId?: string) {
  return useQuery({
    queryKey: ['tier_country_pricing', countryId],
    queryFn: async () => {
      if (!countryId) return [];
      const { data, error } = await supabase
        .from('md_tier_country_pricing')
        .select('id, tier_id, monthly_price_usd, local_price, currency_code')
        .eq('country_id', countryId)
        .eq('is_active', true);
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!countryId,
    ...MASTER_CACHE,
  });
}

// ============================================================
// Billing Cycles
// ============================================================
export function useBillingCycles() {
  return useQuery({
    queryKey: ['billing_cycles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('md_billing_cycles')
        .select('id, code, name, months, discount_percentage, display_order')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (error) throw new Error(error.message);
      return data;
    },
    ...MASTER_CACHE,
  });
}

// ============================================================
// Engagement Models (for Basic tier)
// ============================================================
export function useEngagementModels() {
  return useQuery({
    queryKey: ['engagement_models'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('md_engagement_models')
        .select('id, code, name, description, display_order')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (error) throw new Error(error.message);
      return data;
    },
    ...MASTER_CACHE,
  });
}

// ============================================================
// Tier Engagement Access
// ============================================================
export function useTierEngagementAccess() {
  return useQuery({
    queryKey: ['tier_engagement_access'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('md_tier_engagement_access')
        .select('id, tier_id, engagement_model_id, access_type')
        .eq('is_active', true);
      if (error) throw new Error(error.message);
      return data;
    },
    ...MASTER_CACHE,
  });
}

// ============================================================
// Shadow Pricing (for internal departments)
// ============================================================
export function useShadowPricing() {
  return useQuery({
    queryKey: ['shadow_pricing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('md_shadow_pricing')
        .select('id, tier_id, shadow_charge_per_challenge, currency_code, currency_symbol')
        .eq('is_active', true);
      if (error) throw new Error(error.message);
      return data;
    },
    ...MASTER_CACHE,
  });
}

// ============================================================
// All Tier Pricing (fallback when country is unknown)
// ============================================================
export function useAllTierPricing() {
  return useQuery({
    queryKey: ['all_tier_pricing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('md_tier_country_pricing')
        .select('id, tier_id, monthly_price_usd, local_price, currency_code')
        .eq('is_active', true);
      if (error) throw new Error(error.message);
      return data;
    },
    ...MASTER_CACHE,
  });
}

// ============================================================
// Base Fees by Country (for tier card per-challenge display)
// ============================================================
export function useBaseFeesByCountry(countryId?: string) {
  return useQuery({
    queryKey: ['base_fees_by_country', countryId],
    queryFn: async () => {
      if (!countryId) return [];
      const { data, error } = await supabase
        .from('md_challenge_base_fees')
        .select('id, tier_id, engagement_model_id, consulting_base_fee, management_base_fee, currency_code, md_subscription_tiers(code), md_engagement_models(code)')
        .eq('country_id', countryId)
        .eq('is_active', true);
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!countryId,
    ...MASTER_CACHE,
  });
}

// ============================================================
// Platform Fees by Country (for tier card platform % display)
// ============================================================
export function usePlatformFeesByCountry(countryId?: string) {
  return useQuery({
    queryKey: ['platform_fees_by_country', countryId],
    queryFn: async () => {
      if (!countryId) return [];
      const { data, error } = await supabase
        .from('md_platform_fees')
        .select('id, tier_id, engagement_model_id, platform_fee_pct, currency_code, md_subscription_tiers(code), md_engagement_models(code)')
        .eq('country_id', countryId)
        .eq('is_active', true);
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!countryId,
    ...MASTER_CACHE,
  });
}

// ============================================================
// Submit Enterprise Contact Request (BR-REG-013)
// ============================================================
export function useSubmitEnterpriseContact() {
  return useMutation({
    mutationFn: async (payload: {
      organization_id: string;
      tenant_id: string;
      contact_name: string;
      contact_email: string;
      contact_phone?: string;
      company_size?: string;
      message?: string;
    }) => {
      const { data, error } = await supabase
        .from('enterprise_contact_requests')
        .insert({
          organization_id: payload.organization_id,
          tenant_id: payload.tenant_id,
          contact_name: payload.contact_name,
          contact_email: payload.contact_email,
          contact_phone: payload.contact_phone || null,
          company_size: payload.company_size || null,
          message: payload.message || null,
        })
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      toast.success('Enterprise contact request submitted. Our team will reach out shortly.');
    },
    onError: (error: Error) => {
      toast.error(`Failed to submit request: ${error.message}`);
    },
  });
}
