import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { withCreatedBy, withUpdatedBy } from "@/lib/auditFields";
import { handleMutationError } from "@/lib/errorHandler";

export type SolverEligibility = Tables<"md_solver_eligibility">;
export type SolverEligibilityInsert = TablesInsert<"md_solver_eligibility">;
export type SolverEligibilityUpdate = TablesUpdate<"md_solver_eligibility">;

export function useSolverEligibilityList(includeInactive = false) {
  return useQuery({
    queryKey: ["solver_eligibility", { includeInactive }],
    queryFn: async () => {
      let query = supabase.from("md_solver_eligibility")
        .select("id, code, label, description, requires_auth, requires_provider_record, requires_certification, min_star_rating, display_order, is_active, created_at, created_by, updated_at, updated_by")
        .order("display_order", { ascending: true })
        .order("label", { ascending: true });
      if (!includeInactive) query = query.eq("is_active", true);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data as SolverEligibility[];
    },
    staleTime: 300000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useCreateSolverEligibility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: SolverEligibilityInsert) => {
      const d = await withCreatedBy(item);
      const { data, error } = await supabase.from("md_solver_eligibility").insert(d).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["solver_eligibility"] }); toast.success("Solver eligibility created successfully"); },
    onError: (e: Error) => handleMutationError(e, { operation: "create_solver_eligibility" }),
  });
}

export function useUpdateSolverEligibility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: SolverEligibilityUpdate & { id: string }) => {
      const d = await withUpdatedBy(updates);
      const { data, error } = await supabase.from("md_solver_eligibility").update(d).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["solver_eligibility"] }); toast.success("Solver eligibility updated successfully"); },
    onError: (e: Error) => handleMutationError(e, { operation: "update_solver_eligibility" }),
  });
}

export function useDeleteSolverEligibility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("md_solver_eligibility").update({ is_active: false }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["solver_eligibility"] }); toast.success("Solver eligibility deactivated"); },
    onError: (e: Error) => handleMutationError(e, { operation: "deactivate_solver_eligibility" }),
  });
}

export function useRestoreSolverEligibility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("md_solver_eligibility").update({ is_active: true }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["solver_eligibility"] }); toast.success("Solver eligibility restored"); },
    onError: (e: Error) => handleMutationError(e, { operation: "restore_solver_eligibility" }),
  });
}

export function useHardDeleteSolverEligibility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("md_solver_eligibility").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["solver_eligibility"] }); toast.success("Solver eligibility permanently deleted"); },
    onError: (e: Error) => handleMutationError(e, { operation: "delete_solver_eligibility" }),
  });
}
