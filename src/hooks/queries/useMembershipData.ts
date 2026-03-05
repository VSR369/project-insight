/**
 * Membership Data Hooks (MEM-001)
 *
 * React Query hooks for membership tiers, active memberships, and mutations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';

// ============================================================
// Membership Tiers (reference data)
// ============================================================

export function useMembershipTiers() {
  return useQuery({
    queryKey: ['membership-tiers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('md_membership_tiers')
        .select('id, code, name, description, duration_months, fee_discount_pct, commission_rate_pct, display_order, is_active')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw new Error(error.message);
      return data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

// ============================================================
// Organization Membership
// ============================================================

export function useOrgMembership(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['org-membership', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;

      const { data, error } = await supabase
        .from('seeker_memberships')
        .select(`
          id, lifecycle_status, starts_at, ends_at, auto_renew,
          fee_discount_pct, commission_rate_pct, cancellation_reason,
          cancelled_at, created_at,
          membership_tier_id,
          md_membership_tiers (id, code, name, duration_months, fee_discount_pct, commission_rate_pct)
        `)
        .eq('organization_id', organizationId)
        .eq('lifecycle_status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!organizationId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

// ============================================================
// Membership History
// ============================================================

export function useMembershipHistory(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['membership-history', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('seeker_memberships')
        .select(`
          id, lifecycle_status, starts_at, ends_at, auto_renew,
          fee_discount_pct, commission_rate_pct, cancellation_reason,
          cancelled_at, created_at,
          md_membership_tiers (id, code, name)
        `)
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
// Create / Renew Membership
// ============================================================

export function useCreateMembership() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      organization_id: string;
      tenant_id: string;
      membership_tier_id: string;
      fee_discount_pct: number;
      commission_rate_pct: number;
      ends_at?: string;
    }) => {
      const { data, error } = await supabase
        .from('seeker_memberships')
        .insert({
          ...params,
          lifecycle_status: 'active',
          auto_renew: true,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['org-membership', variables.organization_id] });
      queryClient.invalidateQueries({ queryKey: ['membership-history', variables.organization_id] });
      toast.success('Membership activated successfully');
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'create_membership' });
    },
  });
}

// ============================================================
// Toggle Auto-Renew
// ============================================================

export function useToggleAutoRenew() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { membershipId: string; autoRenew: boolean; organizationId: string }) => {
      const { error } = await supabase
        .from('seeker_memberships')
        .update({ auto_renew: params.autoRenew, updated_at: new Date().toISOString() })
        .eq('id', params.membershipId);

      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['org-membership', variables.organizationId] });
      toast.success(variables.autoRenew ? 'Auto-renewal enabled' : 'Auto-renewal disabled');
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'toggle_auto_renew' });
    },
  });
}

// ============================================================
// Cancel Membership
// ============================================================

export function useCancelMembership() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { membershipId: string; organizationId: string; reason: string }) => {
      const { error } = await supabase
        .from('seeker_memberships')
        .update({
          lifecycle_status: 'cancelled',
          cancellation_reason: params.reason,
          cancelled_at: new Date().toISOString(),
          auto_renew: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.membershipId);

      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['org-membership', variables.organizationId] });
      queryClient.invalidateQueries({ queryKey: ['membership-history', variables.organizationId] });
      toast.success('Membership cancelled');
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'cancel_membership' });
    },
  });
}
