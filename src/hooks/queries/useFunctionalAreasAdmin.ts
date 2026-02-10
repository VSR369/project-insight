import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { withCreatedBy, withUpdatedBy } from "@/lib/auditFields";
import { handleMutationError } from "@/lib/errorHandler";

export type FunctionalArea = Tables<"md_functional_areas">;
export type FunctionalAreaInsert = TablesInsert<"md_functional_areas">;
export type FunctionalAreaUpdate = TablesUpdate<"md_functional_areas">;

export function useFunctionalAreas(includeInactive = false) {
  return useQuery({
    queryKey: ["functional_areas", { includeInactive }],
    queryFn: async () => {
      let query = supabase.from("md_functional_areas")
        .select("id, code, name, description, display_order, is_active")
        .order("display_order", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true });
      if (!includeInactive) query = query.eq("is_active", true);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data as FunctionalArea[];
    },
    staleTime: 300000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useCreateFunctionalArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: FunctionalAreaInsert) => {
      const d = await withCreatedBy(item);
      const { data, error } = await supabase.from("md_functional_areas").insert(d).select().single();
      if (error) throw new Error(error.message);
      return data as FunctionalArea;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["functional_areas"] }); toast.success("Functional area created successfully"); },
    onError: (e: Error) => handleMutationError(e, { operation: "create_functional_area" }),
  });
}

export function useUpdateFunctionalArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: FunctionalAreaUpdate & { id: string }) => {
      const d = await withUpdatedBy(updates);
      const { data, error } = await supabase.from("md_functional_areas").update(d).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return data as FunctionalArea;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["functional_areas"] }); toast.success("Functional area updated successfully"); },
    onError: (e: Error) => handleMutationError(e, { operation: "update_functional_area" }),
  });
}

export function useDeleteFunctionalArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("md_functional_areas").update({ is_active: false }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["functional_areas"] }); toast.success("Functional area deactivated"); },
    onError: (e: Error) => handleMutationError(e, { operation: "deactivate_functional_area" }),
  });
}

export function useRestoreFunctionalArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("md_functional_areas").update({ is_active: true }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["functional_areas"] }); toast.success("Functional area restored"); },
    onError: (e: Error) => handleMutationError(e, { operation: "restore_functional_area" }),
  });
}

export function useHardDeleteFunctionalArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("md_functional_areas").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["functional_areas"] }); toast.success("Functional area permanently deleted"); },
    onError: (e: Error) => handleMutationError(e, { operation: "delete_functional_area" }),
  });
}
