import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { withCreatedBy, withUpdatedBy } from "@/lib/auditFields";
import { handleMutationError } from "@/lib/errorHandler";

export type ChallengeComplexity = Tables<"md_challenge_complexity">;
export type ChallengeComplexityInsert = TablesInsert<"md_challenge_complexity">;
export type ChallengeComplexityUpdate = TablesUpdate<"md_challenge_complexity">;

export function useChallengeComplexityList(includeInactive = false) {
  return useQuery({
    queryKey: ["challenge_complexity", { includeInactive }],
    queryFn: async () => {
      let query = supabase.from("md_challenge_complexity")
        .select("id, complexity_code, complexity_label, complexity_level, consulting_fee_multiplier, management_fee_multiplier, description, display_order, is_active")
        .order("display_order", { ascending: true })
        .order("complexity_level", { ascending: true });
      if (!includeInactive) query = query.eq("is_active", true);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data as ChallengeComplexity[];
    },
    staleTime: 300000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useCreateChallengeComplexity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: ChallengeComplexityInsert) => {
      const d = await withCreatedBy(item);
      const { data, error } = await supabase.from("md_challenge_complexity").insert(d).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["challenge_complexity"] }); toast.success("Challenge complexity created successfully"); },
    onError: (e: Error) => handleMutationError(e, { operation: "create_challenge_complexity" }),
  });
}

export function useUpdateChallengeComplexity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: ChallengeComplexityUpdate & { id: string }) => {
      const d = await withUpdatedBy(updates);
      const { data, error } = await supabase.from("md_challenge_complexity").update(d).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["challenge_complexity"] }); toast.success("Challenge complexity updated successfully"); },
    onError: (e: Error) => handleMutationError(e, { operation: "update_challenge_complexity" }),
  });
}

export function useDeleteChallengeComplexity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("md_challenge_complexity").update({ is_active: false }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["challenge_complexity"] }); toast.success("Challenge complexity deactivated"); },
    onError: (e: Error) => handleMutationError(e, { operation: "deactivate_challenge_complexity" }),
  });
}

export function useRestoreChallengeComplexity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("md_challenge_complexity").update({ is_active: true }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["challenge_complexity"] }); toast.success("Challenge complexity restored"); },
    onError: (e: Error) => handleMutationError(e, { operation: "restore_challenge_complexity" }),
  });
}

export function useHardDeleteChallengeComplexity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("md_challenge_complexity").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["challenge_complexity"] }); toast.success("Challenge complexity permanently deleted"); },
    onError: (e: Error) => handleMutationError(e, { operation: "delete_challenge_complexity" }),
  });
}
