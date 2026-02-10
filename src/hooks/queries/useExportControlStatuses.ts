import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { withCreatedBy, withUpdatedBy } from "@/lib/auditFields";
import { handleMutationError } from "@/lib/errorHandler";

export type ExportControlStatus = Tables<"md_export_control_statuses">;
export type ExportControlStatusInsert = TablesInsert<"md_export_control_statuses">;
export type ExportControlStatusUpdate = TablesUpdate<"md_export_control_statuses">;

export function useExportControlStatuses(includeInactive = false) {
  return useQuery({
    queryKey: ["export_control_statuses", { includeInactive }],
    queryFn: async () => {
      let query = supabase.from("md_export_control_statuses")
        .select("id, code, name, description, requires_itar_compliance, display_order, is_active")
        .order("display_order", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true });
      if (!includeInactive) query = query.eq("is_active", true);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data as ExportControlStatus[];
    },
    staleTime: 300000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useCreateExportControlStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: ExportControlStatusInsert) => {
      const d = await withCreatedBy(item);
      const { data, error } = await supabase.from("md_export_control_statuses").insert(d).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["export_control_statuses"] }); toast.success("Export control status created successfully"); },
    onError: (e: Error) => handleMutationError(e, { operation: "create_export_control_status" }),
  });
}

export function useUpdateExportControlStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: ExportControlStatusUpdate & { id: string }) => {
      const d = await withUpdatedBy(updates);
      const { data, error } = await supabase.from("md_export_control_statuses").update(d).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["export_control_statuses"] }); toast.success("Export control status updated successfully"); },
    onError: (e: Error) => handleMutationError(e, { operation: "update_export_control_status" }),
  });
}

export function useDeleteExportControlStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("md_export_control_statuses").update({ is_active: false }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["export_control_statuses"] }); toast.success("Export control status deactivated"); },
    onError: (e: Error) => handleMutationError(e, { operation: "deactivate_export_control_status" }),
  });
}

export function useRestoreExportControlStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("md_export_control_statuses").update({ is_active: true }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["export_control_statuses"] }); toast.success("Export control status restored"); },
    onError: (e: Error) => handleMutationError(e, { operation: "restore_export_control_status" }),
  });
}

export function useHardDeleteExportControlStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("md_export_control_statuses").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["export_control_statuses"] }); toast.success("Export control status permanently deleted"); },
    onError: (e: Error) => handleMutationError(e, { operation: "delete_export_control_status" }),
  });
}
