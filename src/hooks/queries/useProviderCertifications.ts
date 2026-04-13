/**
 * Provider Certifications Hook
 * 
 * React Query hooks for provider_certifications table.
 * Supports multi-path certification queries and resolved cert view.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CertificationRecord } from '@/services/enrollment/certificationService';

const CERT_QUERY_KEY = 'provider-certifications';
const RESOLVED_CERT_KEY = 'provider-resolved-cert';

/**
 * Fetch all certifications for a provider
 */
export function useProviderCertifications(providerId?: string) {
  return useQuery({
    queryKey: [CERT_QUERY_KEY, providerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('provider_certifications')
        .select('id, provider_id, cert_path, star_tier, cert_label, composite_score, status, awarded_at, enrollment_id')
        .eq('provider_id', providerId!)
        .order('awarded_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as CertificationRecord[];
    },
    enabled: !!providerId,
    staleTime: 60_000,
  });
}

/**
 * Fetch active certifications only
 */
export function useActiveCertifications(providerId?: string) {
  return useQuery({
    queryKey: [CERT_QUERY_KEY, providerId, 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('provider_certifications')
        .select('id, provider_id, cert_path, star_tier, cert_label, composite_score, status, awarded_at, enrollment_id')
        .eq('provider_id', providerId!)
        .eq('status', 'active')
        .order('star_tier', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as CertificationRecord[];
    },
    enabled: !!providerId,
    staleTime: 60_000,
  });
}

interface ResolvedCert {
  provider_id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  resolved_star_tier: number;
  resolved_cert_label: string | null;
  active_paths: string[] | null;
  highest_composite: number | null;
}

/**
 * Fetch resolved certification from the view (MAX star tier across paths)
 */
export function useResolvedCertification(providerId?: string) {
  return useQuery({
    queryKey: [RESOLVED_CERT_KEY, providerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_provider_resolved_cert')
        .select('provider_id, user_id, first_name, last_name, resolved_star_tier, resolved_cert_label, active_paths, highest_composite')
        .eq('provider_id', providerId!)
        .single();
      if (error) throw new Error(error.message);
      return data as ResolvedCert;
    },
    enabled: !!providerId,
    staleTime: 60_000,
  });
}
