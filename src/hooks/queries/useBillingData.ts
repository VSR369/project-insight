/**
 * Billing Data Hooks (REG-005)
 * 
 * React Query hooks for payment methods, billing info,
 * terms acceptance, and subscription creation.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const MASTER_CACHE = { staleTime: 5 * 60 * 1000, gcTime: 30 * 60 * 1000 };

// ============================================================
// Available Payment Methods for Country (BR-REG-016)
// ============================================================
export function usePaymentMethods(countryId?: string) {
  return useQuery({
    queryKey: ['payment_methods', countryId],
    queryFn: async () => {
      if (!countryId) return [];
      const { data, error } = await supabase
        .from('md_payment_methods_availability')
        .select('id, payment_method, tier_id')
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
// Active Platform Terms
// ============================================================
export function useActivePlatformTerms() {
  return useQuery({
    queryKey: ['platform_terms_active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_terms')
        .select('id, version, title, content, effective_date')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
    ...MASTER_CACHE,
  });
}

// ============================================================
// Save Billing Info
// ============================================================
export function useSaveBillingInfo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      organization_id: string;
      tenant_id: string;
      billing_entity_name: string;
      billing_email: string;
      billing_address_line1: string;
      billing_address_line2?: string;
      billing_city: string;
      billing_state_province_id?: string;
      billing_country_id: string;
      billing_postal_code: string;
      payment_method: 'credit_card' | 'ach_bank_transfer' | 'wire_transfer' | 'shadow';
      po_number?: string;
      tax_id?: string;
    }) => {
      const { data, error } = await supabase
        .from('seeker_billing_info')
        .upsert(
          {
            organization_id: payload.organization_id,
            tenant_id: payload.tenant_id,
            billing_entity_name: payload.billing_entity_name,
            billing_email: payload.billing_email,
            billing_address_line1: payload.billing_address_line1,
            billing_address_line2: payload.billing_address_line2 || null,
            billing_city: payload.billing_city,
            billing_state_province_id: payload.billing_state_province_id || null,
            billing_country_id: payload.billing_country_id,
            billing_postal_code: payload.billing_postal_code,
            payment_method: payload.payment_method,
            po_number: payload.po_number || null,
            tax_id: payload.tax_id || null,
          },
          { onConflict: 'organization_id' }
        )
        .select('id')
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seeker_billing_info'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to save billing info: ${error.message}`);
    },
  });
}

// ============================================================
// Create Subscription
// ============================================================
export function useCreateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      organization_id: string;
      tenant_id: string;
      tier_id: string;
      billing_cycle_id: string;
      engagement_model_id?: string;
      monthly_base_price?: number;
      effective_monthly_cost?: number;
      discount_percentage?: number;
      payment_type: 'live' | 'shadow';
      shadow_charge_per_challenge?: number;
      shadow_currency_code?: string;
      terms_version?: string;
      terms_acceptance_hash?: string;
    }) => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('seeker_subscriptions')
        .insert({
          organization_id: payload.organization_id,
          tenant_id: payload.tenant_id,
          tier_id: payload.tier_id,
          billing_cycle_id: payload.billing_cycle_id,
          engagement_model_id: payload.engagement_model_id || null,
          monthly_base_price: payload.monthly_base_price ?? 0,
          effective_monthly_cost: payload.effective_monthly_cost ?? 0,
          discount_percentage: payload.discount_percentage ?? 0,
          payment_type: payload.payment_type,
          shadow_charge_per_challenge: payload.shadow_charge_per_challenge ?? null,
          shadow_currency_code: payload.shadow_currency_code ?? null,
          status: 'pending_billing',
          starts_at: now,
          current_period_start: now,
          terms_version: payload.terms_version || null,
          terms_acceptance_hash: payload.terms_acceptance_hash || null,
          terms_accepted_at: now,
        })
        .select('id')
        .single();

      if (error) throw new Error(error.message);

      await supabase
        .from('seeker_organizations')
        .update({ registration_step: 5 })
        .eq('id', payload.organization_id);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seeker_subscriptions'] });
      toast.success('Registration completed successfully!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create subscription: ${error.message}`);
    },
  });
}

// ============================================================
// Organization Subscription (Phase 7)
// ============================================================
export function useOrgSubscription(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['org-subscription', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const { data, error } = await supabase
        .from('seeker_subscriptions')
        .select(`
          id, tier_id, billing_cycle_id, engagement_model_id, status,
          payment_type, monthly_base_price, discount_percentage, effective_monthly_cost,
          starts_at, ends_at, auto_renew, challenges_used, challenge_limit_snapshot,
          current_period_start, current_period_end, per_challenge_fee_snapshot,
          max_solutions_snapshot, shadow_charge_per_challenge, shadow_currency_code,
          md_subscription_tiers!seeker_subscriptions_tier_id_fkey(code, name, max_users, max_challenges, is_enterprise)
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
    staleTime: 30 * 1000,
  });
}

// ============================================================
// Organization Invoices (Phase 7)
// ============================================================
export function useOrgInvoices(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['org-invoices', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('seeker_invoices')
        .select('id, invoice_number, invoice_type, status, currency_code, subtotal, tax_amount, discount_amount, total_amount, billing_period_start, billing_period_end, issued_at, due_at, paid_at, is_shadow, created_at')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!organizationId,
    staleTime: 30 * 1000,
  });
}

// ============================================================
// Organization Top-Ups (Phase 7)
// ============================================================
export function useOrgTopUps(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['org-topups', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('seeker_challenge_topups')
        .select('id, quantity, per_challenge_fee, total_amount, currency_code, billing_period_start, billing_period_end, payment_status, created_at')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!organizationId,
    staleTime: 30 * 1000,
  });
}

// ============================================================
// Purchase Challenge Top-Up (Phase 7)
// ============================================================
export function usePurchaseTopUp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      organizationId: string;
      tenantId: string;
      quantity: number;
      perChallengeFee: number;
      currencyCode: string;
      billingPeriodStart: string;
      billingPeriodEnd: string;
    }) => {
      const totalAmount = Math.round(params.quantity * params.perChallengeFee * 100) / 100;
      const { data, error } = await supabase
        .from('seeker_challenge_topups')
        .insert({
          organization_id: params.organizationId,
          tenant_id: params.tenantId,
          quantity: params.quantity,
          per_challenge_fee: params.perChallengeFee,
          total_amount: totalAmount,
          currency_code: params.currencyCode,
          billing_period_start: params.billingPeriodStart,
          billing_period_end: params.billingPeriodEnd,
          payment_status: 'pending',
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['org-topups', vars.organizationId] });
      queryClient.invalidateQueries({ queryKey: ['org-subscription', vars.organizationId] });
      toast.success('Top-up purchased successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to purchase top-up: ${error.message}`);
    },
  });
}
