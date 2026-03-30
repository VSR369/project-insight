/**
 * Hook for md_rbac_msme_config — MSME/Small Team Mode toggle
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getCurrentUserId } from "@/lib/auditFields";
import { handleMutationError } from "@/lib/errorHandler";

export interface MsmeConfig {
  org_id: string;
  is_enabled: boolean;
  enabled_by: string | null;
  enabled_at: string | null;
}

export function useMsmeConfig(orgId?: string) {
  return useQuery({
    queryKey: ["msme-config", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase
        .from("md_rbac_msme_config")
        .select("org_id, is_enabled, enabled_by, enabled_at")
        .eq("org_id", orgId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data as MsmeConfig | null;
    },
    enabled: !!orgId,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useToggleMsmeConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ orgId, isEnabled }: { orgId: string; isEnabled: boolean }) => {
      const userId = await getCurrentUserId();
      const { error } = await supabase
        .from("md_rbac_msme_config")
        .upsert({
          org_id: orgId,
          is_enabled: isEnabled,
          enabled_by: isEnabled ? userId : null,
          enabled_at: isEnabled ? new Date().toISOString() : null,
        });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["msme-config", variables.orgId] });
      toast.success(variables.isEnabled ? "MSME mode enabled" : "MSME mode disabled");
    },
    onError: (e: Error) => handleMutationError(e, { operation: "toggle_msme_config" }),
  });
}

