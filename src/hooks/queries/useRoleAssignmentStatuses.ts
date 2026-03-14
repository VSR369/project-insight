/**
 * Hook for md_role_assignment_statuses master data
 * Provides status labels and color classes from DB — no hardcoded values
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CACHE_STATIC } from "@/config/queryCache";

export interface RoleAssignmentStatus {
  id: string;
  code: string;
  display_name: string;
  color_class: string | null;
  display_order: number | null;
}

export function useRoleAssignmentStatuses() {
  return useQuery({
    queryKey: ["role-assignment-statuses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("md_role_assignment_statuses")
        .select("id, code, display_name, color_class, display_order")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as RoleAssignmentStatus[];
    },
    ...CACHE_STATIC,
  });
}
