/**
 * Enterprise Agreement hooks (Phase 10c)
 * - Read-only for Org PRIMARY admins (via v_org_active_enterprise_agreement)
 * - Full CRUD for Platform supervisor / senior_admin (RLS-enforced)
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { withCreatedBy, withUpdatedBy } from '@/lib/auditFields';
import { handleMutationError, handleQueryError } from '@/lib/errorHandler';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

export type EnterpriseAgreement =
  Database['public']['Tables']['enterprise_agreements']['Row'];
export type EnterpriseAgreementInsert =
  Database['public']['Tables']['enterprise_agreements']['Insert'];
export type EnterpriseAgreementUpdate =
  Database['public']['Tables']['enterprise_agreements']['Update'];
export type ActiveEnterpriseAgreement =
  Database['public']['Views']['v_org_active_enterprise_agreement']['Row'];
export type EnterpriseAgreementAuditRow =
  Database['public']['Tables']['enterprise_agreement_audit']['Row'];
export type EnterpriseFeatureGateKey =
  Database['public']['Tables']['md_enterprise_feature_gate_keys']['Row'];

const QK = {
  active: (orgId: string | null | undefined) =>
    ['enterprise_agreement', 'active', orgId] as const,
  list: (orgId?: string | null) =>
    ['enterprise_agreements', { orgId: orgId ?? 'all' }] as const,
  detail: (id: string) => ['enterprise_agreements', id] as const,
  audit: (id: string) => ['enterprise_agreements', id, 'audit'] as const,
  gateKeys: ['md_enterprise_feature_gate_keys'] as const,
};

/** Read-only effective enterprise agreement for an organization. */
export function useActiveEnterpriseAgreement(orgId: string | null | undefined) {
  return useQuery({
    queryKey: QK.active(orgId),
    queryFn: async (): Promise<ActiveEnterpriseAgreement | null> => {
      if (!orgId) return null;
      const { data, error } = await supabase
        .from('v_org_active_enterprise_agreement')
        .select(
          'id, organization_id, tier_id, tier_code, tier_name, agreement_status, acv_amount, currency_code, billing_cadence, contract_start_date, contract_end_date, signed_at, max_challenges_override, max_users_override, max_storage_gb_override, governance_mode_override, feature_gates, created_at, updated_at',
        )
        .eq('organization_id', orgId)
        .maybeSingle();
      if (error) {
        handleQueryError(error, { operation: 'fetch_active_enterprise_agreement' });
        throw new Error(error.message);
      }
      return data;
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/** Platform admin: list agreements (optionally filter by org). */
export function useEnterpriseAgreements(orgId?: string | null) {
  return useQuery({
    queryKey: QK.list(orgId),
    queryFn: async (): Promise<EnterpriseAgreement[]> => {
      let q = supabase
        .from('enterprise_agreements')
        .select(
          'id, organization_id, tier_id, agreement_status, acv_amount, currency_code, billing_cadence, contract_start_date, contract_end_date, signed_at, max_challenges_override, max_users_override, max_storage_gb_override, governance_mode_override, feature_gates, msa_document_url, notes, created_at, updated_at, created_by, updated_by, signed_by_org_user, signed_by_platform_user',
        )
        .order('updated_at', { ascending: false, nullsFirst: false });
      if (orgId) q = q.eq('organization_id', orgId);
      const { data, error } = await q;
      if (error) {
        handleQueryError(error, { operation: 'list_enterprise_agreements' });
        throw new Error(error.message);
      }
      return (data ?? []) as EnterpriseAgreement[];
    },
    staleTime: 60 * 1000,
  });
}

export function useEnterpriseAgreement(agreementId: string | null | undefined) {
  return useQuery({
    queryKey: agreementId ? QK.detail(agreementId) : ['enterprise_agreements', 'none'],
    queryFn: async (): Promise<EnterpriseAgreement | null> => {
      if (!agreementId) return null;
      const { data, error } = await supabase
        .from('enterprise_agreements')
        .select(
          'id, organization_id, tier_id, agreement_status, acv_amount, currency_code, billing_cadence, contract_start_date, contract_end_date, signed_at, max_challenges_override, max_users_override, max_storage_gb_override, governance_mode_override, feature_gates, msa_document_url, notes, created_at, updated_at, created_by, updated_by, signed_by_org_user, signed_by_platform_user',
        )
        .eq('id', agreementId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!agreementId,
    staleTime: 60 * 1000,
  });
}

/** Audit trail for a specific agreement. */
export function useEnterpriseAgreementAudit(agreementId: string | null | undefined) {
  return useQuery({
    queryKey: agreementId ? QK.audit(agreementId) : ['enterprise_agreements', 'none', 'audit'],
    queryFn: async (): Promise<EnterpriseAgreementAuditRow[]> => {
      if (!agreementId) return [];
      const { data, error } = await supabase
        .from('enterprise_agreement_audit')
        .select('id, agreement_id, organization_id, action, previous_status, new_status, changed_fields, notes, performed_by, performed_at')
        .eq('agreement_id', agreementId)
        .order('performed_at', { ascending: false })
        .limit(100);
      if (error) throw new Error(error.message);
      return (data ?? []) as EnterpriseAgreementAuditRow[];
    },
    enabled: !!agreementId,
    staleTime: 30 * 1000,
  });
}

export function useEnterpriseFeatureGateKeys() {
  return useQuery({
    queryKey: QK.gateKeys,
    queryFn: async (): Promise<EnterpriseFeatureGateKey[]> => {
      const { data, error } = await supabase
        .from('md_enterprise_feature_gate_keys')
        .select('id, key, display_name, description, category, sort_order, is_active')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as EnterpriseFeatureGateKey[];
    },
    staleTime: 15 * 60 * 1000,
  });
}

function invalidateAgreement(qc: ReturnType<typeof useQueryClient>, orgId: string, id?: string) {
  qc.invalidateQueries({ queryKey: ['enterprise_agreements'] });
  qc.invalidateQueries({ queryKey: QK.active(orgId) });
  if (id) qc.invalidateQueries({ queryKey: QK.detail(id) });
}

export function useUpsertEnterpriseAgreement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: { id?: string } & Omit<EnterpriseAgreementInsert, 'id'>,
    ): Promise<EnterpriseAgreement> => {
      if (input.id) {
        const { id, ...patch } = input;
        const payload = await withUpdatedBy(patch as EnterpriseAgreementUpdate);
        const { data, error } = await supabase
          .from('enterprise_agreements')
          .update(payload)
          .eq('id', id)
          .select()
          .single();
        if (error) throw new Error(error.message);
        return data as EnterpriseAgreement;
      }
      const payload = await withCreatedBy(input as EnterpriseAgreementInsert);
      const { data, error } = await supabase
        .from('enterprise_agreements')
        .insert(payload)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as EnterpriseAgreement;
    },
    onSuccess: (row) => {
      invalidateAgreement(qc, row.organization_id, row.id);
      toast.success('Enterprise agreement saved');
    },
    onError: (e) =>
      handleMutationError(e, {
        operation: 'upsert_enterprise_agreement',
        component: 'EnterpriseAgreementsPage',
      }),
  });
}

export type AgreementStatus =
  | 'draft'
  | 'in_negotiation'
  | 'signed'
  | 'active'
  | 'expired'
  | 'terminated';

export function useTransitionAgreementStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      organizationId: string;
      nextStatus: AgreementStatus;
      signedAt?: string | null;
    }): Promise<EnterpriseAgreement> => {
      const patch: EnterpriseAgreementUpdate = {
        agreement_status: input.nextStatus,
      };
      if (input.nextStatus === 'signed' && !input.signedAt) {
        patch.signed_at = new Date().toISOString();
      } else if (input.signedAt !== undefined) {
        patch.signed_at = input.signedAt;
      }
      const payload = await withUpdatedBy(patch);
      const { data, error } = await supabase
        .from('enterprise_agreements')
        .update(payload)
        .eq('id', input.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as EnterpriseAgreement;
    },
    onSuccess: (row) => {
      invalidateAgreement(qc, row.organization_id, row.id);
      toast.success(`Agreement transitioned to ${row.agreement_status}`);
    },
    onError: (e) =>
      handleMutationError(e, {
        operation: 'transition_enterprise_agreement_status',
        component: 'EnterpriseAgreementsPage',
      }),
  });
}
