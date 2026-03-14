/**
 * Hook for role_readiness_cache — cached org readiness status
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CACHE_FREQUENT } from "@/config/queryCache";

export interface RoleReadiness {
  id: string;
  org_id: string;
  engagement_model: string;
  overall_status: string;
  missing_roles: string[];
  total_required: number;
  total_filled: number;
  responsible_admin_contact: Record<string, unknown>;
  last_computed_at: string;
}

export function useRoleReadiness(orgId?: string, model?: string) {
  return useQuery({
    queryKey: ["role-readiness", orgId, model],
    queryFn: async () => {
      if (!orgId) return null;
      let query = supabase
        .from("role_readiness_cache")
        .select("id, org_id, engagement_model, overall_status, missing_roles, total_required, total_filled, responsible_admin_contact, last_computed_at")
        .eq("org_id", orgId);
      if (model) query = query.eq("engagement_model", model);
      query = query.limit(50);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data ?? []) as RoleReadiness[];
    },
    enabled: !!orgId,
    ...CACHE_FREQUENT,
  });
}
