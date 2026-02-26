/**
 * Org Admin Details & Change Request Hooks
 * 
 * Separated from useOrgSettings.ts to keep files under 200 lines.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { withCreatedBy } from '@/lib/auditFields';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

const ORG_CACHE = { staleTime: 30 * 1000, gcTime: 5 * 60 * 1000 };

// ============================================================
// Admin Details (org_users + seeker_contacts)
// ============================================================
export interface OrgAdminDetails {
  user_id: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  organization_id: string;
  tenant_id: string;
  invitation_status: string | null;
  joined_at: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_by: string | null;
  updated_at: string | null;
}

export function useOrgAdminDetails(organizationId?: string) {
  return useQuery({
    queryKey: ['org_admin_details', organizationId],
    queryFn: async (): Promise<OrgAdminDetails | null> => {
      if (!organizationId) return null;

      // Get tenant_admin from org_users
      const { data: adminUser, error: adminErr } = await supabase
        .from('org_users')
        .select('user_id, organization_id, role, invitation_status, joined_at, created_by, created_at, updated_by, updated_at')
        .eq('organization_id', organizationId)
        .eq('role', 'tenant_admin')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (adminErr) throw new Error(adminErr.message);
      if (!adminUser) return null;

      // Get contact info from seeker_contacts
      const { data: contact } = await supabase
        .from('seeker_contacts')
        .select('first_name, last_name, email, phone_country_code, phone_number')
        .eq('organization_id', organizationId)
        .eq('is_primary', true)
        .maybeSingle();

      // Get tenant_id from the org
      const { data: org } = await supabase
        .from('seeker_organizations')
        .select('tenant_id')
        .eq('id', organizationId)
        .single();

      const fullName = contact
        ? [contact.first_name, contact.last_name].filter(Boolean).join(' ')
        : null;
      const phone = contact
        ? [contact.phone_country_code, contact.phone_number].filter(Boolean).join(' ')
        : null;

      return {
        user_id: adminUser.user_id,
        full_name: fullName,
        email: contact?.email ?? null,
        phone,
        organization_id: adminUser.organization_id,
        tenant_id: org?.tenant_id ?? organizationId,
        invitation_status: adminUser.invitation_status,
        joined_at: adminUser.joined_at,
        created_by: adminUser.created_by,
        created_at: adminUser.created_at,
        updated_by: adminUser.updated_by,
        updated_at: adminUser.updated_at,
      };
    },
    enabled: !!organizationId,
    ...ORG_CACHE,
  });
}

// ============================================================
// Pending Admin Change Request
// ============================================================
export function usePendingAdminRequest(organizationId?: string) {
  return useQuery({
    queryKey: ['pending_admin_request', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const { data, error } = await supabase
        .from('org_admin_change_requests')
        .select('id, new_admin_name, new_admin_email, new_admin_phone, lifecycle_status, created_at')
        .eq('organization_id', organizationId)
        .eq('lifecycle_status', 'pending')
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
// Request Admin Change (mutation)
// ============================================================
export function useRequestAdminChange() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      organization_id: string;
      tenant_id: string;
      current_admin_user_id: string | null;
      new_admin_name?: string;
      new_admin_email: string;
      new_admin_phone?: string;
      request_type?: 'registration_delegate' | 'post_login_change';
    }) => {
      const record = await withCreatedBy({
        tenant_id: params.tenant_id,
        organization_id: params.organization_id,
        requested_by: user?.id ?? null,
        current_admin_user_id: params.current_admin_user_id,
        new_admin_name: params.new_admin_name ?? null,
        new_admin_email: params.new_admin_email,
        new_admin_phone: params.new_admin_phone ?? null,
        request_type: params.request_type ?? 'post_login_change',
        lifecycle_status: 'pending',
      });

      const { data, error } = await supabase
        .from('org_admin_change_requests')
        .insert(record)
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pending_admin_request', variables.organization_id] });
      toast.success('Admin change request submitted for Platform Admin approval');
    },
    onError: (error: Error) => {
      toast.error(`Failed to submit request: ${error.message}`);
    },
  });
}
