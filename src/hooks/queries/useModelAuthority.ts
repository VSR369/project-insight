/**
 * Hook for check_model_authority() RPC — BR-CORE-004
 * Returns whether the current user can manage roles for a given engagement model.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CACHE_STABLE } from "@/config/queryCache";

export function useModelAuthority(engagementModel: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["model-authority", user?.id, engagementModel],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data, error } = await supabase.rpc("check_model_authority", {
        p_user_id: user.id,
        p_engagement_model: engagementModel,
      });
      if (error) throw new Error(error.message);
      return data as boolean;
    },
    enabled: !!user?.id && !!engagementModel,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
