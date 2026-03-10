/**
 * Hook for md_availability_statuses master data
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AvailabilityStatus {
  id: string;
  code: string;
  display_name: string;
  color_class: string | null;
  display_order: number | null;
}

export function useAvailabilityStatuses() {
  return useQuery({
    queryKey: ["availability-statuses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("md_availability_statuses")
        .select("id, code, display_name, color_class, display_order")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as AvailabilityStatus[];
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}
