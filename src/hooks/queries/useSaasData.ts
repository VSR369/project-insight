/**
 * SaaS Agreement & Parent Dashboard Hooks (SAS-001)
 *
 * React Query hooks for SaaS agreements and parent org dashboard metrics.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { withCreatedBy, withUpdatedBy } from '@/lib/auditFields';

// ============================================================
// SaaS Agreements for a Parent Org
// ============================================================

export function useSaasAgreements(parentOrgId: string | undefined) {
  return useQuery({
    queryKey: ['saas-agreements', parentOrgId],
    queryFn: async () => {
      if (!parentOrgId) return [];

      const { data, error } = await supabase
        .from('saas_agreements')
        .select(`
          id, agreement_type, lifecycle_status,
          fee_amount, fee_currency, fee_frequency,
          shadow_charge_rate, starts_at, ends_at, auto_renew,
          notes, created_at,
          child_organization_id,
          department_id, functional_area_id,
          billing_frequency,
          base_platform_fee, per_department_fee, support_tier_fee,
          custom_fee_1_label, custom_fee_1_amount,
          custom_fee_2_label, custom_fee_2_amount,
          msa_reference_number, msa_document_url,
          seeker_organizations!saas_agreements_child_organization_id_fkey (
            id, organization_name, legal_entity_name
          ),
          md_departments (name),
          md_functional_areas (name)
        `)
        .eq('parent_organization_id', parentOrgId)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!parentOrgId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

// ============================================================
// Create SaaS Agreement
// ============================================================

interface CreateSaasAgreementParams {
  tenant_id: string;
  parent_organization_id: string;
  child_organization_id: string;
  agreement_type: string;
  fee_amount: number;
  fee_currency: string;
  fee_frequency: string;
  shadow_charge_rate?: number | null;
  department_id?: string | null;
  functional_area_id?: string | null;
  billing_frequency?: string;
  base_platform_fee?: number | null;
  per_department_fee?: number | null;
  support_tier_fee?: number | null;
  custom_fee_1_label?: string | null;
  custom_fee_1_amount?: number | null;
  custom_fee_2_label?: string | null;
  custom_fee_2_amount?: number | null;
  msa_reference_number?: string | null;
  msa_document_url?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  auto_renew?: boolean;
  notes?: string | null;
}

export function useCreateSaasAgreement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateSaasAgreementParams) => {
      const withAudit = await withCreatedBy({
        ...params,
        lifecycle_status: 'active',
        auto_renew: params.auto_renew ?? true,
      });
      const { data, error } = await supabase
        .from('saas_agreements')
        .insert(withAudit)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['saas-agreements', variables.parent_organization_id] });
      queryClient.invalidateQueries({ queryKey: ['parent-dashboard', variables.parent_organization_id] });
      toast.success('SaaS agreement created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create agreement: ${error.message}`);
    },
  });
}

// ============================================================
// Update SaaS Agreement
// ============================================================

interface UpdateSaasAgreementUpdates {
  lifecycle_status?: string;
  fee_amount?: number;
  fee_currency?: string;
  fee_frequency?: string;
  shadow_charge_rate?: number | null;
  department_id?: string | null;
  functional_area_id?: string | null;
  billing_frequency?: string;
  base_platform_fee?: number | null;
  per_department_fee?: number | null;
  support_tier_fee?: number | null;
  custom_fee_1_label?: string | null;
  custom_fee_1_amount?: number | null;
  custom_fee_2_label?: string | null;
  custom_fee_2_amount?: number | null;
  msa_reference_number?: string | null;
  msa_document_url?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  auto_renew?: boolean;
  cancellation_reason?: string;
  cancelled_at?: string;
  notes?: string | null;
  child_organization_id?: string;
  agreement_type?: string;
}

export function useUpdateSaasAgreement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      agreementId: string;
      parentOrgId: string;
      updates: UpdateSaasAgreementUpdates;
    }) => {
      const withAudit = await withUpdatedBy({
        ...params.updates,
        updated_at: new Date().toISOString(),
      });
      const { error } = await supabase
        .from('saas_agreements')
        .update(withAudit)
        .eq('id', params.agreementId);

      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['saas-agreements', variables.parentOrgId] });
      queryClient.invalidateQueries({ queryKey: ['parent-dashboard', variables.parentOrgId] });
      toast.success('Agreement updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update agreement: ${error.message}`);
    },
  });
}

// ============================================================
// Create Child Organization (inline from SaaS Agreement form)
// ============================================================

interface CreateChildOrgParams {
  tenant_id: string;
  organization_name: string;
  legal_entity_name?: string | null;
  contact_person_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  hq_country_id?: string | null;
  hq_state_province_id?: string | null;
  hq_city?: string | null;
  hq_postal_code?: string | null;
  hq_address_line1?: string | null;
}

export function useCreateChildOrg() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateChildOrgParams) => {
      const withAudit = await withCreatedBy({
        ...params,
        is_active: true,
        registration_step: 0,
      });
      const { data, error } = await supabase
        .from('seeker_organizations')
        .insert(withAudit)
        .select('id, organization_name')
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-picker-options'] });
      toast.success('Child organization created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create organization: ${error.message}`);
    },
  });
}

// ============================================================
// Parent Dashboard Metrics
// ============================================================

export function useParentDashboardMetrics(parentOrgId: string | undefined) {
  return useQuery({
    queryKey: ['parent-dashboard', parentOrgId],
    queryFn: async () => {
      if (!parentOrgId) return null;

      const { data: agreements, error: agErr } = await supabase
        .from('saas_agreements')
        .select('id, lifecycle_status, fee_amount, fee_currency, shadow_charge_rate')
        .eq('parent_organization_id', parentOrgId);

      if (agErr) throw new Error(agErr.message);

      const { data: subscription, error: subErr } = await supabase
        .from('seeker_subscriptions')
        .select('id, tier_id, challenges_used, challenge_limit_snapshot, current_period_end, md_subscription_tiers!seeker_subscriptions_tier_id_fkey (name, code)')
        .eq('organization_id', parentOrgId)
        .eq('is_active', true)
        .maybeSingle();

      if (subErr) throw new Error(subErr.message);

      const { data: membership, error: memErr } = await supabase
        .from('seeker_memberships')
        .select('id, lifecycle_status, ends_at, auto_renew, md_membership_tiers (name, code)')
        .eq('organization_id', parentOrgId)
        .eq('lifecycle_status', 'active')
        .maybeSingle();

      if (memErr) throw new Error(memErr.message);

      const activeAgreements = (agreements ?? []).filter(a => a.lifecycle_status === 'active');
      const totalShadowCharges = activeAgreements.reduce((sum, a) => sum + Number(a.fee_amount), 0);

      return {
        agreements: agreements ?? [],
        activeCount: activeAgreements.length,
        totalCount: (agreements ?? []).length,
        totalShadowCharges,
        subscription,
        membership,
        challengesUsed: subscription?.challenges_used ?? 0,
        challengeLimit: subscription?.challenge_limit_snapshot ?? 0,
        renewalDate: subscription?.current_period_end ?? membership?.ends_at ?? null,
      };
    },
    enabled: !!parentOrgId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
