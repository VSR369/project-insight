import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { withCreatedBy, withUpdatedBy } from "@/lib/auditFields";
import { handleMutationError } from "@/lib/errorHandler";

export type DataResidency = Tables<"md_data_residency">;
export type DataResidencyInsert = TablesInsert<"md_data_residency">;
export type DataResidencyUpdate = TablesUpdate<"md_data_residency">;

export function useDataResidencyOptions(includeInactive = false) {
  return useQuery({
    queryKey: ["data_residency", { includeInactive }],
    queryFn: async () => {
      let query = supabase.from("md_data_residency")
        .select("id, code, name, description, display_order, is_active")
        .order("display_order", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true });
      if (!includeInactive) query = query.eq("is_active", true);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data as DataResidency[];
    },
    staleTime: 300000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useCreateDataResidency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: DataResidencyInsert) => {
      const d = await withCreatedBy(item);
      const { data, error } = await supabase.from("md_data_residency").insert(d).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["data_residency"] }); toast.success("Data residency option created successfully"); },
    onError: (e: Error) => handleMutationError(e, { operation: "create_data_residency" }),
  });
}

export function useUpdateDataResidency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: DataResidencyUpdate & { id: string }) => {
      const d = await withUpdatedBy(updates);
      const { data, error } = await supabase.from("md_data_residency").update(d).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["data_residency"] }); toast.success("Data residency option updated successfully"); },
    onError: (e: Error) => handleMutationError(e, { operation: "update_data_residency" }),
  });
}

export function useDeleteDataResidency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("md_data_residency").update({ is_active: false }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["data_residency"] }); toast.success("Data residency option deactivated"); },
    onError: (e: Error) => handleMutationError(e, { operation: "deactivate_data_residency" }),
  });
}

export function useRestoreDataResidency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("md_data_residency").update({ is_active: true }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["data_residency"] }); toast.success("Data residency option restored"); },
    onError: (e: Error) => handleMutationError(e, { operation: "restore_data_residency" }),
  });
}

export function useHardDeleteDataResidency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("md_data_residency").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["data_residency"] }); toast.success("Data residency option permanently deleted"); },
    onError: (e: Error) => handleMutationError(e, { operation: "delete_data_residency" }),
  });
}
