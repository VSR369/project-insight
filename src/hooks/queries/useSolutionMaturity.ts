import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { withCreatedBy, withUpdatedBy } from "@/lib/auditFields";
import { handleMutationError } from "@/lib/errorHandler";

export interface SolutionMaturity {
  id: string;
  code: string;
  label: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
  created_by: string | null;
  updated_by: string | null;
}

export interface SolutionMaturityInsert {
  code: string;
  label: string;
  description?: string | null;
  display_order?: number;
  is_active?: boolean;
}

export interface SolutionMaturityUpdate {
  id: string;
  code?: string;
  label?: string;
  description?: string | null;
  display_order?: number;
  is_active?: boolean;
}

export function useSolutionMaturityList(includeInactive = false) {
  return useQuery({
    queryKey: ["solution_maturity", { includeInactive }],
    queryFn: async () => {
      let query = supabase.from("md_solution_maturity")
        .select("id, code, label, description, display_order, is_active, created_at, updated_at, created_by, updated_by")
        .order("display_order", { ascending: true })
        .order("label", { ascending: true });
      if (!includeInactive) query = query.eq("is_active", true);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data as SolutionMaturity[];
    },
    staleTime: 300000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useCreateSolutionMaturity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: SolutionMaturityInsert) => {
      const d = await withCreatedBy(item);
      const { data, error } = await supabase.from("md_solution_maturity").insert(d).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["solution_maturity"] }); toast.success("Solution maturity created successfully"); },
    onError: (e: Error) => handleMutationError(e, { operation: "create_solution_maturity" }),
  });
}

export function useUpdateSolutionMaturity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: SolutionMaturityUpdate) => {
      const d = await withUpdatedBy(updates);
      const { data, error } = await supabase.from("md_solution_maturity").update(d).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["solution_maturity"] }); toast.success("Solution maturity updated successfully"); },
    onError: (e: Error) => handleMutationError(e, { operation: "update_solution_maturity" }),
  });
}

export function useDeleteSolutionMaturity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("md_solution_maturity").update({ is_active: false }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["solution_maturity"] }); toast.success("Solution maturity deactivated"); },
    onError: (e: Error) => handleMutationError(e, { operation: "deactivate_solution_maturity" }),
  });
}

export function useRestoreSolutionMaturity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("md_solution_maturity").update({ is_active: true }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["solution_maturity"] }); toast.success("Solution maturity restored"); },
    onError: (e: Error) => handleMutationError(e, { operation: "restore_solution_maturity" }),
  });
}

export function useHardDeleteSolutionMaturity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("md_solution_maturity").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["solution_maturity"] }); toast.success("Solution maturity permanently deleted"); },
    onError: (e: Error) => handleMutationError(e, { operation: "delete_solution_maturity" }),
  });
}
