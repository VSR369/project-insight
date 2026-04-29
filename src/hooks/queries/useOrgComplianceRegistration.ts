/**
 * useOrgComplianceRegistration — Read-only fetch of `seeker_compliance`,
 * the registration-time compliance certifications captured during onboarding.
 *
 * Distinct from `useOrgComplianceConfig` which manages the operational
 * settings on `org_compliance_config`. The two are intentionally separate:
 *   - seeker_compliance: WHAT certifications the org holds (audit evidence)
 *   - org_compliance_config: HOW the platform should behave per challenge
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { handleQueryError } from '@/lib/errorHandler';

export interface OrgComplianceRegistration {
  id: string;
  organization_id: string;
  itar_certified: boolean;
  itar_certification_expiry: string | null;
  soc2_compliant: boolean;
  iso27001_certified: boolean;
  gdpr_compliant: boolean;
  hipaa_compliant: boolean;
  dpa_accepted: boolean;
  privacy_policy_accepted: boolean;
  data_residency_id: string | null;
  export_control_status_id: string | null;
  data_residency: { id: string; name: string; code: string } | null;
  export_control_status: { id: string; name: string; code: string } | null;
}

export function useOrgComplianceRegistration(organizationId: string | null | undefined) {
  return useQuery({
    queryKey: ['org_compliance_registration', organizationId],
    queryFn: async (): Promise<OrgComplianceRegistration | null> => {
      if (!organizationId) return null;
      const { data, error } = await supabase
        .from('seeker_compliance')
        .select(
          `id, organization_id,
           itar_certified, itar_certification_expiry,
           soc2_compliant, iso27001_certified,
           gdpr_compliant, hipaa_compliant,
           dpa_accepted, privacy_policy_accepted,
           data_residency_id, export_control_status_id,
           data_residency:data_residency_id(id, name, code),
           export_control_status:export_control_status_id(id, name, code)`,
        )
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .maybeSingle();
      if (error) {
        handleQueryError(error, { operation: 'fetch_org_compliance_registration' });
        return null;
      }
      return data as unknown as OrgComplianceRegistration | null;
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}
