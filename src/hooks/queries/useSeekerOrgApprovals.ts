import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
        .order('created_at', { ascending: false });

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
  return useQuery({
    queryKey: ['seeker-orgs', 'detail', orgId],
    queryFn: async () => {
      if (!orgId) return null;

      // Fetch org + country + type
      const { data: org, error: orgErr } = await supabase
        .from('seeker_organizations')
        .select(`
          *,
          countries!seeker_organizations_hq_country_id_fkey(name, code),
          organization_types(name)
        `)
        .eq('id', orgId)
        .single();
      if (orgErr) throw new Error(orgErr.message);

      // Fetch related data in parallel
      const [contacts, compliance, subscription, billing, documents, industries, geographies, orgUsers] = await Promise.all([
        supabase.from('seeker_contacts').select('*').eq('organization_id', orgId).eq('is_deleted', false),
        supabase.from('seeker_compliance').select('*').eq('organization_id', orgId).maybeSingle(),
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
      };
    },
    enabled: !!orgId,
  });
}

// ─── Approve organization ───
export function useApproveOrg() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orgId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('seeker_organizations')
        .update({
          verification_status: 'verified' as any,
          verified_at: new Date().toISOString(),
          verified_by: user?.id,
        })
        .eq('id', orgId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seeker-orgs'] });
      toast.success('Organization approved successfully');
    },
    onError: (error: Error) => toast.error(`Failed to approve: ${error.message}`),
  });
}

// ─── Reject organization ───
export function useRejectOrg() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orgId, reason }: { orgId: string; reason: string }) => {
      const { error } = await supabase
        .from('seeker_organizations')
        .update({ verification_status: 'rejected' as any })
        .eq('id', orgId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seeker-orgs'] });
      toast.success('Organization rejected');
    },
    onError: (error: Error) => toast.error(`Failed to reject: ${error.message}`),
  });
}

// ─── Approve document ───
export function useApproveDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (docId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('seeker_org_documents')
        .update({
          verification_status: 'verified' as any,
          verified_at: new Date().toISOString(),
          verified_by: user?.id,
        })
        .eq('id', docId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seeker-orgs'] });
      toast.success('Document approved');
    },
    onError: (error: Error) => toast.error(`Failed to approve document: ${error.message}`),
  });
}

// ─── Reject document ───
export function useRejectDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ docId, reason }: { docId: string; reason: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('seeker_org_documents')
        .update({
          verification_status: 'rejected' as any,
          rejection_reason: reason,
          verified_at: new Date().toISOString(),
          verified_by: user?.id,
        })
        .eq('id', docId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seeker-orgs'] });
      toast.success('Document rejected');
    },
    onError: (error: Error) => toast.error(`Failed to reject document: ${error.message}`),
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
    onError: (error: Error) => toast.error(`Failed to send email: ${error.message}`),
  });
}

// ─── Download document via signed URL ───
export async function getDocumentSignedUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('org-documents')
    .createSignedUrl(storagePath, 3600);
  if (error) {
    toast.error('Failed to generate download link');
    return null;
  }
  return data.signedUrl;
}
