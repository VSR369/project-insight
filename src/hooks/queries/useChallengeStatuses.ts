import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { handleMutationError } from "@/lib/errorHandler";
import { withCreatedBy, withUpdatedBy } from "@/lib/auditFields";

export type ChallengeStatus = Tables<"md_challenge_active_statuses">;
export type ChallengeStatusInsert = TablesInsert<"md_challenge_active_statuses">;
export type ChallengeStatusUpdate = TablesUpdate<"md_challenge_active_statuses">;

export function useChallengeStatuses(includeInactive = false) {
  return useQuery({
    queryKey: ["challenge_statuses", { includeInactive }],
    queryFn: async () => {
      let query = supabase.from("md_challenge_active_statuses")
        .select("id, status_code, status_label, blocks_model_switch, display_order, is_active")
        .order("display_order", { ascending: true });
      if (!includeInactive) query = query.eq("is_active", true);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data as ChallengeStatus[];
    },
    staleTime: 300000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useCreateChallengeStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: ChallengeStatusInsert) => {
      const itemWithAudit = await withCreatedBy(item);
      const { data, error } = await supabase.from("md_challenge_active_statuses").insert(itemWithAudit).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["challenge_statuses"] }); toast.success("Challenge status created successfully"); },
    onError: (e: Error) => handleMutationError(e, { operation: "create_challenge_status" }),
  });
}

export function useUpdateChallengeStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: ChallengeStatusUpdate & { id: string }) => {
      const updatesWithAudit = await withUpdatedBy(updates);
      const { data, error } = await supabase.from("md_challenge_active_statuses").update(updatesWithAudit).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["challenge_statuses"] }); toast.success("Challenge status updated successfully"); },
    onError: (e: Error) => handleMutationError(e, { operation: "update_challenge_status" }),
  });
}

export function useDeleteChallengeStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("md_challenge_active_statuses").update({ is_active: false }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["challenge_statuses"] }); toast.success("Challenge status deactivated"); },
    onError: (e: Error) => handleMutationError(e, { operation: "deactivate_challenge_status" }),
  });
}

export function useRestoreChallengeStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("md_challenge_active_statuses").update({ is_active: true }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["challenge_statuses"] }); toast.success("Challenge status restored"); },
    onError: (e: Error) => handleMutationError(e, { operation: "restore_challenge_status" }),
  });
}

export function useHardDeleteChallengeStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("md_challenge_active_statuses").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["challenge_statuses"] }); toast.success("Challenge status permanently deleted"); },
    onError: (e: Error) => handleMutationError(e, { operation: "delete_challenge_status" }),
  });
}
