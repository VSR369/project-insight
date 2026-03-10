/**
 * Hook for md_proficiency_levels master data
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProficiencyLevel {
  id: string;
  name: string;
  description: string | null;
  display_order: number | null;
  is_active: boolean;
}

export function useProficiencyLevels() {
  return useQuery({
    queryKey: ["proficiency-levels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("md_proficiency_levels")
        .select("id, name, description, display_order, is_active")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as ProficiencyLevel[];
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}
