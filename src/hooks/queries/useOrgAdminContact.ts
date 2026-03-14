/**
 * Hook for fetching the Primary SOA contact for an organization.
 * BR-CORE-005: Aggregator gaps → show Seeking Org Admin contact.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CACHE_STABLE } from "@/config/queryCache";

export interface OrgAdminContact {
  id: string;
  name: string;
  email: string;
  phone_intl: string | null;
}

export function useOrgAdminContact(orgId?: string) {
  return useQuery({
    queryKey: ["org-admin-contact", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase
        .from("seeking_org_admins")
        .select("id, full_name, email, phone")
        .eq("organization_id", orgId)
        .eq("admin_tier", "PRIMARY")
        .eq("status", "active")
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      return {
        id: data.id,
        name: data.full_name ?? "Organization Admin",
        email: data.email ?? "",
        phone_intl: data.phone ?? null,
      } as OrgAdminContact;
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
