import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';
import { withUpdatedBy } from '@/lib/auditFields';
import type { SeekerOrgDetailData } from '@/pages/admin/seeker-org-approvals/types';

// ─── Pending count for sidebar badge ───
export function usePendingSeekerCount() {
  return useQuery({
    queryKey: ['seeker-orgs', 'pending-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('seeker_organizations')
        .select('id', { count: 'exact', head: true })
        .eq('verification_status', 'payment_submitted')
        .eq('is_deleted', false);
      if (error) throw new Error(error.message);
      return count ?? 0;
    },
    staleTime: 120_000,  // 2 minutes — badge count, low priority
  });
}

// ─── Get org IDs assigned to the current admin ───
export function useMyAssignedOrgIds(adminId?: string) {
  return useQuery({
    queryKey: ['seeker-orgs', 'my-assigned-ids', adminId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_admin_verifications')
        .select('organization_id')
        .eq('assigned_admin_id', adminId!)
        .eq('is_current', true);
      if (error) throw new Error(error.message);
      return (data ?? []).map(d => d.organization_id);
    },
    enabled: !!adminId,
    staleTime: 30_000,
  });
}

// ─── List orgs by verification status ───
// assignedOrgIds: if provided, filter to only these org IDs (for non-supervisors)
// showUnassigned: if true, show only orgs NOT in platform_admin_verifications (open queue)
export function useSeekerOrgList(status?: string, assignedOrgIds?: string[] | null, showUnassigned?: boolean) {
  return useQuery({
    queryKey: ['seeker-orgs', 'list', status, assignedOrgIds, showUnassigned],
    queryFn: async () => {
      let query = supabase
        .from('seeker_organizations')
        .select(`
          id, organization_name, verification_status, created_at, registration_step,
          hq_country_id, organization_type_id, is_enterprise,
          countries!seeker_organizations_hq_country_id_fkey(name),
          organization_types(name)
        `)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(100);

      if (status && status !== 'all') {
        query = query.eq('verification_status', status as any);
      }

      // For non-supervisors: filter to only their assigned orgs
      if (assignedOrgIds !== undefined && assignedOrgIds !== null) {
        if (assignedOrgIds.length === 0) {
          return []; // No assignments = no results
        }
        query = query.in('id', assignedOrgIds);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      // For "Unassigned" tab: filter out orgs that have a current verification assignment
      if (showUnassigned && data) {
        const orgIds = data.map(d => d.id);
        if (orgIds.length === 0) return data;
        const { data: assigned } = await supabase
          .from('platform_admin_verifications')
          .select('organization_id')
          .in('organization_id', orgIds)
          .eq('is_current', true)
          .not('assigned_admin_id', 'is', null);
        const assignedSet = new Set((assigned ?? []).map(a => a.organization_id));
        return data.filter(d => !assignedSet.has(d.id));
      }

      return data;
    },
    staleTime: 30 * 1000,
  });
}

// ─── Full org detail for review ───
export function useSeekerOrgDetail(orgId?: string) {
  return useQuery<SeekerOrgDetailData | null>({
    queryKey: ['seeker-orgs', 'detail', orgId],
    queryFn: async () => {
      if (!orgId) return null;

      const { data: org, error: orgErr } = await supabase
        .from('seeker_organizations')
        .select(`
          id, organization_name, trade_brand_name, legal_entity_name,
          organization_type_id, registration_number, tax_id, website_url,
          founding_year, employee_count_range, annual_revenue_range,
          is_enterprise, organization_description, logo_url,
          hq_address_line1, hq_address_line2, hq_city, hq_postal_code,
          hq_country_id, hq_state_province_id,
          nda_preference, nda_review_status,
          verification_status, verified_at, verified_by, rejection_reason,
          registration_step, created_at, updated_at,
          correction_count, correction_instructions,
          suspended_at, suspended_by, suspension_reason,
          verification_started_at, registrant_contact,
          countries!seeker_organizations_hq_country_id_fkey(name, code),
          organization_types(name)
        `)
        .eq('id', orgId)
        .single();
      if (orgErr) throw new Error(orgErr.message);

      const [contacts, compliance, subscription, billing, documents, industries, geographies, orgUsers, adminDelegation] = await Promise.all([
        supabase.from('seeker_contacts').select('id, first_name, last_name, email, phone_number, phone_country_code, job_title, department, contact_type, is_primary, is_decision_maker, is_active, organization_id, created_at').eq('organization_id', orgId).eq('is_deleted', false),
        supabase.from('seeker_compliance').select('id, organization_id, export_control_status_id, data_residency_id, sanctions_screening_status, aml_status, created_at, updated_at, md_export_control_statuses(name), md_data_residency(name)').eq('organization_id', orgId).maybeSingle(),
        supabase.from('seeker_subscriptions').select('id, organization_id, tier_id, billing_cycle_id, engagement_model_id, start_date, end_date, is_active, created_at, md_subscription_tiers!seeker_subscriptions_tier_id_fkey(name, code), md_billing_cycles(name, months), md_engagement_models(name)').eq('organization_id', orgId).maybeSingle(),
        supabase.from('seeker_billing_info').select('id, organization_id, billing_contact_name, billing_email, billing_phone, billing_address_line1, billing_address_line2, billing_city, billing_state_province, billing_postal_code, billing_country_id, payment_method, bank_transaction_id, bank_name, payment_received_date, billing_verification_status, billing_verified_at, billing_verified_by, billing_verification_notes, billing_rejection_reason, created_at, updated_at, countries!seeker_billing_info_billing_country_id_fkey(name)').eq('organization_id', orgId).maybeSingle(),
        supabase.from('seeker_org_documents').select('id, organization_id, document_type, file_name, file_size, mime_type, storage_path, verification_status, verified_at, verified_by, rejection_reason, expires_at, created_at').eq('organization_id', orgId).order('created_at'),
        supabase.from('seeker_org_industries').select('id, organization_id, industry_id, industry_segments(name)').eq('organization_id', orgId),
        supabase.from('seeker_org_operating_geographies').select('id, organization_id, country_id, countries(name)').eq('organization_id', orgId),
        supabase.from('org_users').select('id, user_id, organization_id, role, is_active, joined_at, invitation_status').eq('organization_id', orgId).eq('is_active', true),
        supabase.from('org_admin_change_requests').select('new_admin_name, new_admin_email, new_admin_phone, new_admin_title, new_admin_relationship_to_org, lifecycle_status').eq('organization_id', orgId).eq('request_type', 'registration_delegate').maybeSingle(),
      ]);

      return {
        org,
        contacts: contacts.data ?? [],
        compliance: compliance.data,
        subscription: subscription.data,
        billing: billing.data,
        documents: documents.data ?? [],
        industries: industries.data ?? [],
        geographies: geographies.data ?? [],
        orgUsers: orgUsers.data ?? [],
        adminDelegation: adminDelegation.data ?? null,
      } as unknown as SeekerOrgDetailData;
    },
    enabled: !!orgId,
  });
}

// ─── Approve organization ───
export function useApproveOrg() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orgId: string) => {
      const updateData = await withUpdatedBy({
        verification_status: 'verified' as any,
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      // Set verified_by to same user as updated_by
      const { error } = await supabase
        .from('seeker_organizations')
        .update({ ...updateData, verified_by: updateData.updated_by })
        .eq('id', orgId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seeker-orgs'] });
      toast.success('Organization approved successfully');
    },
    onError: (error: Error) => handleMutationError(error, { operation: 'approve_organization', component: 'seeker-org-approvals' }),
  });
}

// ─── Reject organization (GAP 9/13: triggers rejection email) ───
export function useRejectOrg() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orgId, reason }: { orgId: string; reason: string }) => {
      const updateData = await withUpdatedBy({
        verification_status: 'rejected' as any,
        rejection_reason: reason,
        updated_at: new Date().toISOString(),
      });
      const { error } = await supabase
        .from('seeker_organizations')
        .update(updateData)
        .eq('id', orgId);
      if (error) throw new Error(error.message);

      // BR-VA-002: Send rejection email notification
      try {
        await supabase.functions.invoke('send-seeker-rejection-email', {
          body: { orgId, rejectionReason: reason },
        });
      } catch {
        // Non-blocking — rejection is already persisted
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seeker-orgs'] });
      toast.success('Organization rejected');
    },
    onError: (error: Error) => handleMutationError(error, { operation: 'reject_organization', component: 'seeker-org-approvals' }),
  });
}

// ─── Approve document ───
export function useApproveDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (docId: string) => {
      const updateData = await withUpdatedBy({
        verification_status: 'verified' as any,
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      const { error } = await supabase
        .from('seeker_org_documents')
        .update({ ...updateData, verified_by: updateData.updated_by })
        .eq('id', docId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seeker-orgs'] });
      toast.success('Document approved');
    },
    onError: (error: Error) => handleMutationError(error, { operation: 'approve_document', component: 'seeker-org-approvals' }),
  });
}

// ─── Reject document ───
export function useRejectDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ docId, reason }: { docId: string; reason: string }) => {
      const updateData = await withUpdatedBy({
        verification_status: 'rejected' as any,
        rejection_reason: reason,
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      const { error } = await supabase
        .from('seeker_org_documents')
        .update({ ...updateData, verified_by: updateData.updated_by })
        .eq('id', docId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seeker-orgs'] });
      toast.success('Document rejected');
    },
    onError: (error: Error) => handleMutationError(error, { operation: 'reject_document', component: 'seeker-org-approvals' }),
  });
}

// ─── Send welcome email ───
export function useSendWelcomeEmail() {
  return useMutation({
    mutationFn: async ({ orgId, adminEmail, orgName, tempPassword, mode, adminName }: {
      orgId: string;
      adminEmail: string;
      orgName: string;
      tempPassword?: string;
      mode: 'self' | 'registrant_only' | 'admin_only';
      adminName?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('send-seeker-welcome-email', {
        body: { orgId, adminEmail, orgName, tempPassword, mode, adminName },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => toast.success('Welcome email sent successfully'),
    onError: (error: Error) => handleMutationError(error, { operation: 'send_welcome_email', component: 'seeker-org-approvals' }),
  });
}

// ─── Approve billing (verify payment) ───
export function useApproveBilling() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ billingId, bankTransactionId, bankName, paymentReceivedDate, notes }: {
      billingId: string;
      bankTransactionId: string;
      bankName: string;
      paymentReceivedDate: string;
      notes?: string;
    }) => {
      const updateData = await withUpdatedBy({
        billing_verification_status: 'verified' as any,
        bank_transaction_id: bankTransactionId,
        bank_name: bankName,
        payment_received_date: paymentReceivedDate,
        billing_verification_notes: notes || null,
        billing_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      const { error } = await supabase
        .from('seeker_billing_info')
        .update({ ...updateData, billing_verified_by: updateData.updated_by })
        .eq('id', billingId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seeker-orgs'] });
      toast.success('Billing verified successfully');
    },
    onError: (error: Error) => handleMutationError(error, { operation: 'approve_billing', component: 'seeker-org-approvals' }),
  });
}

// ─── Download document via signed URL ───
export async function getDocumentSignedUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('org-documents')
    .createSignedUrl(storagePath, 3600);
  if (error) {
    handleMutationError(error, { operation: 'generate_document_url' });
    return null;
  }
  return data.signedUrl;
}

// ─── Fetch document as Blob (for PDF.js) and blob URL (for images / download) ───
export async function fetchDocumentBlob(storagePath: string): Promise<{ blob: Blob; blobUrl: string } | null> {
  const signedUrl = await getDocumentSignedUrl(storagePath);
  if (!signedUrl) return null;
  try {
    const response = await fetch(signedUrl);
    if (!response.ok) throw new Error(`Failed to fetch document: ${response.status}`);
    const blob = await response.blob();
    return { blob, blobUrl: URL.createObjectURL(blob) };
  } catch (error) {
    handleMutationError(error as Error, { operation: 'fetch_document_blob' });
    return null;
  }
}

// Legacy wrapper kept for backward compat
export async function fetchDocumentBlobUrl(storagePath: string): Promise<string | null> {
  const result = await fetchDocumentBlob(storagePath);
  return result?.blobUrl ?? null;
}

// ─── Reject billing ───
export function useRejectBilling() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ billingId, reason }: { billingId: string; reason: string }) => {
      const updateData = await withUpdatedBy({
        billing_verification_status: 'rejected' as any,
        billing_rejection_reason: reason,
        updated_at: new Date().toISOString(),
      });
      const { error } = await supabase
        .from('seeker_billing_info')
        .update(updateData)
        .eq('id', billingId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seeker-orgs'] });
      toast.success('Billing rejected');
    },
    onError: (error: Error) => handleMutationError(error, { operation: 'reject_billing', component: 'seeker-org-approvals' }),
  });
}

// ─── Return for correction ───
export function useReturnForCorrection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orgId, instructions }: { orgId: string; instructions: string }) => {
      // Fetch current correction_count
      const { data: currentOrg, error: fetchErr } = await supabase
        .from('seeker_organizations')
        .select('correction_count')
        .eq('id', orgId)
        .single();
      if (fetchErr) throw new Error(fetchErr.message);

      const newCount = (currentOrg?.correction_count ?? 0) + 1;
      const updateData = await withUpdatedBy({
        verification_status: 'returned_for_correction' as any,
        correction_instructions: instructions,
        correction_count: newCount,
        updated_at: new Date().toISOString(),
      });
      const { error } = await supabase
        .from('seeker_organizations')
        .update(updateData)
        .eq('id', orgId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seeker-orgs'] });
      toast.success('Organization returned for correction');
    },
    onError: (error: Error) => handleMutationError(error, { operation: 'return_for_correction', component: 'seeker-org-approvals' }),
  });
}

// ─── Suspend organization (GAP 5: cascade-deactivate org users) ───
export function useSuspendOrg() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orgId, reason }: { orgId: string; reason: string }) => {
      const updateData = await withUpdatedBy({
        verification_status: 'suspended' as any,
        suspended_at: new Date().toISOString(),
        suspension_reason: reason,
        updated_at: new Date().toISOString(),
      });
      const { error } = await supabase
        .from('seeker_organizations')
        .update({ ...updateData, suspended_by: updateData.updated_by })
        .eq('id', orgId);
      if (error) throw new Error(error.message);

      // BR-VA-004: Cascade-deactivate all org admins
      const { error: adminError } = await supabase
        .from('seeking_org_admins')
        .update({ status: 'suspended', updated_at: new Date().toISOString() } as any)
        .eq('organization_id', orgId)
        .in('status', ['active', 'pending_activation']);
      if (adminError) throw new Error(adminError.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seeker-orgs'] });
      toast.success('Organization suspended');
    },
    onError: (error: Error) => handleMutationError(error, { operation: 'suspend_org', component: 'seeker-org-approvals' }),
  });
}

// ─── Reinstate organization (GAP 5: re-activate org users) ───
export function useReinstateOrg() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orgId, rationale }: { orgId: string; rationale: string }) => {
      const updateData = await withUpdatedBy({
        verification_status: 'active' as any,
        suspended_at: null,
        suspended_by: null,
        suspension_reason: null,
        updated_at: new Date().toISOString(),
      });
      const { error } = await supabase
        .from('seeker_organizations')
        .update(updateData)
        .eq('id', orgId);
      if (error) throw new Error(error.message);

      // BR-VA-004: Re-activate org admins that were suspended
      const { error: adminError } = await supabase
        .from('seeking_org_admins')
        .update({ status: 'active', updated_at: new Date().toISOString() } as any)
        .eq('organization_id', orgId)
        .eq('status', 'suspended');
      if (adminError) throw new Error(adminError.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seeker-orgs'] });
      toast.success('Organization reinstated');
    },
    onError: (error: Error) => handleMutationError(error, { operation: 'reinstate_org', component: 'seeker-org-approvals' }),
  });
}

// ─── Auto-transition to under_verification ───
export function useStartVerification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orgId: string) => {
      const updateData = await withUpdatedBy({
        verification_status: 'under_verification' as any,
        verification_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      const { error } = await supabase
        .from('seeker_organizations')
        .update(updateData)
        .eq('id', orgId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seeker-orgs'] });
    },
    onError: (error: Error) => handleMutationError(error, { operation: 'start_verification', component: 'seeker-org-approvals' }),
  });
}

// ─── Atomic claim for open_claim mode (concurrency-safe) ───
export function useClaimOrgForVerification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orgId, adminId }: { orgId: string; adminId: string }) => {
      const { data, error } = await supabase.rpc('claim_org_for_verification', {
        p_org_id: orgId,
        p_admin_id: adminId,
      });
      if (error) throw new Error(error.message);
      const result = data as unknown as { success: boolean; error?: string; claimed_by?: string; verification_id?: string };
      if (!result.success) {
        const err = new Error(result.error ?? 'Claim failed') as Error & { claimedBy?: string };
        if (result.error === 'already_claimed') {
          err.claimedBy = result.claimed_by;
        }
        throw err;
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seeker-orgs'] });
    },
    onError: (error: Error & { claimedBy?: string }) => {
      if (error.claimedBy) {
        // Don't use generic error handler — caller handles this specially
        return;
      }
      handleMutationError(error, { operation: 'claim_org_for_verification', component: 'seeker-org-approvals' });
    },
  });
}

// ─── Duplicate check for verification ───
export function useDuplicateCheck(orgName: string, countryId: string | null) {
  return useQuery({
    queryKey: ['seeker-orgs', 'duplicate-check', orgName, countryId],
    queryFn: async () => {
      let query = supabase
        .from('seeker_organizations')
        .select('id, organization_name, verification_status')
        .eq('is_deleted', false)
        .neq('verification_status', 'rejected' as any)
        .ilike('organization_name', `%${orgName}%`)
        .limit(10);
      if (countryId) query = query.eq('hq_country_id', countryId);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!orgName && orgName.length > 2,
    staleTime: 60 * 1000,
  });
}
