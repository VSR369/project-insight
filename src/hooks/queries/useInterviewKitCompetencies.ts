import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CACHE_STABLE } from "@/config/queryCache";

export interface InterviewKitCompetency {
  id: string;
  code: string;
  name: string;
  description: string | null;
  displayOrder: number;
  icon: string | null;
  color: string | null;
}

/**
 * Fetch all active interview kit competencies for display in the Interview Kit tab
 */
export function useInterviewKitCompetencies() {
  return useQuery({
    queryKey: ["interview-kit-competencies"],
    queryFn: async (): Promise<InterviewKitCompetency[]> => {
      const { data, error } = await supabase
        .from("interview_kit_competencies")
        .select("id, code, name, description, display_order, icon, color")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw new Error(error.message);

      return (data || []).map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        description: c.description,
        displayOrder: c.display_order ?? 0,
        icon: c.icon,
        color: c.color,
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - reference data
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}
