/**
 * Lightweight lookup hook for proficiency_areas master data.
 * Used in Pool Member form, table, and filter bar dropdowns.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProficiencyAreaOption {
  id: string;
  name: string;
}

export function useProficiencyAreasLookup() {
  return useQuery({
    queryKey: ["proficiency-areas-lookup"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proficiency_areas")
        .select("id, name")
        .eq("is_active", true)
        .not("name", "like", "__SMOKE_TEST_%")
        .order("display_order", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as ProficiencyAreaOption[];
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}
