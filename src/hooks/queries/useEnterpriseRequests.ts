/**
 * Enterprise Contact Requests Hook
 *
 * Fetches organizations that selected the Enterprise tier during registration.
 * Used in the Enterprise Agreements admin page to surface leads.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EnterpriseRequest {
  id: string;
  organization_id: string;
  organization_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  company_size: string | null;
  status: string;
  message: string | null;
  created_at: string;
}

export function useEnterpriseContactRequests() {
  return useQuery({
    queryKey: ['enterprise_contact_requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enterprise_contact_requests')
        .select(`
          id, organization_id, contact_name, contact_email, contact_phone,
          company_size, status, message, created_at,
          seeker_organizations!enterprise_contact_requests_organization_id_fkey (
            organization_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);

      return (data ?? []).map((r) => ({
        id: r.id,
        organization_id: r.organization_id,
        organization_name:
          (r.seeker_organizations as { organization_name: string } | null)?.organization_name ?? 'Unknown',
        contact_name: r.contact_name,
        contact_email: r.contact_email,
        contact_phone: r.contact_phone,
        company_size: r.company_size,
        status: r.status,
        message: r.message,
        created_at: r.created_at,
      })) as EnterpriseRequest[];
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
