/**
 * Org Picker Hook — fetches seeker_organizations for dropdown use.
 * Standards: Section 16.2 (explicit columns), Section 24.2 (staleTime for reference data)
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CACHE_STABLE } from "@/config/queryCache";

export interface OrgPickerOption {
  value: string;
  label: string;
}

/**
 * Fetches active organizations as dropdown options.
 * Used for parent/child org selection in SaaS agreements.
 */
export function useOrgPickerOptions(tenantId?: string) {
  return useQuery({
    queryKey: ["org-picker-options", tenantId],
    queryFn: async () => {
      let query = supabase
        .from("seeker_organizations")
        .select("id, organization_name, legal_entity_name")
        .eq("is_active", true)
        .eq("verification_status", "verified")
        .order("organization_name");

      if (tenantId) {
        query = query.eq("tenant_id", tenantId);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      return (data ?? []).map(
        (org): OrgPickerOption => ({
          value: org.id,
          label: org.organization_name,
        })
      );
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
