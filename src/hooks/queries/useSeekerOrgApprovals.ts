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
        .eq('verification_status', 'pending')
        .eq('is_deleted', false);
      if (error) throw new Error(error.message);
      return count ?? 0;
    },
    staleTime: 30 * 1000,
  });
}

// ─── List orgs by verification status ───
export function useSeekerOrgList(status?: string) {
  return useQuery({
    queryKey: ['seeker-orgs', 'list', status],
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

      const { data, error } = await query;
      if (error) throw new Error(error.message);
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
          countries!seeker_organizations_hq_country_id_fkey(name, code),
          organization_types(name)
        `)
        .eq('id', orgId)
        .single();
      if (orgErr) throw new Error(orgErr.message);

      const [contacts, compliance, subscription, billing, documents, industries, geographies, orgUsers] = await Promise.all([
        supabase.from('seeker_contacts').select('*').eq('organization_id', orgId).eq('is_deleted', false),
        supabase.from('seeker_compliance').select('*, md_export_control_statuses(name), md_data_residency(name)').eq('organization_id', orgId).maybeSingle(),
        supabase.from('seeker_subscriptions').select(`*, md_subscription_tiers!seeker_subscriptions_tier_id_fkey(name, code), md_billing_cycles(name, months), md_engagement_models(name)`).eq('organization_id', orgId).maybeSingle(),
        supabase.from('seeker_billing_info').select(`*, countries!seeker_billing_info_billing_country_id_fkey(name)`).eq('organization_id', orgId).maybeSingle(),
        supabase.from('seeker_org_documents').select('*').eq('organization_id', orgId).order('created_at'),
        supabase.from('seeker_org_industries').select('*, industry_segments(name)').eq('organization_id', orgId),
        supabase.from('seeker_org_operating_geographies').select('*, countries(name)').eq('organization_id', orgId),
        supabase.from('org_users').select('*').eq('organization_id', orgId).eq('is_active', true),
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

// ─── Reject organization ───
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
    mutationFn: async ({ orgId, adminEmail, orgName, tempPassword }: {
      orgId: string;
      adminEmail: string;
      orgName: string;
      tempPassword: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('send-seeker-welcome-email', {
        body: { orgId, adminEmail, orgName, tempPassword },
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
