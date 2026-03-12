/**
 * Hook for md_slm_role_codes master data
 * Extended with model_applicability, is_core, min_required for RBAC
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SlmRoleCode {
  id: string;
  code: string;
  display_name: string;
  description: string | null;
  display_order: number | null;
  model_applicability: string;
  is_core: boolean;
  min_required: number;
}

export function useSlmRoleCodes() {
  return useQuery({
    queryKey: ["slm-role-codes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("md_slm_role_codes")
        .select("id, code, display_name, description, display_order, model_applicability, is_core, min_required")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as SlmRoleCode[];
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

/** Returns only core roles (is_core = true) */
export function useCoreRoleCodes() {
  const query = useSlmRoleCodes();
  return {
    ...query,
    data: query.data?.filter((r) => r.is_core) ?? [],
  };
}

/** Returns challenge (non-core) roles filtered by engagement model */
export function useChallengeRoleCodes(model?: string) {
  const query = useSlmRoleCodes();
  return {
    ...query,
    data: query.data?.filter((r) =>
      !r.is_core &&
      (model ? r.model_applicability === model || r.model_applicability === "both" : true)
    ) ?? [],
  };
}
