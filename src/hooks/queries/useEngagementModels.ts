import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { withCreatedBy, withUpdatedBy } from "@/lib/auditFields";
import { handleMutationError } from "@/lib/errorHandler";

export type EngagementModel = Tables<"md_engagement_models">;
export type EngagementModelInsert = TablesInsert<"md_engagement_models">;
export type EngagementModelUpdate = TablesUpdate<"md_engagement_models">;

export function useEngagementModels(includeInactive = false) {
  return useQuery({
    queryKey: ["engagement_models", { includeInactive }],
    queryFn: async () => {
      let query = supabase.from("md_engagement_models")
        .select("id, code, name, description, display_order, is_active")
        .order("display_order", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true });
      if (!includeInactive) query = query.eq("is_active", true);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data as EngagementModel[];
    },
    staleTime: 300000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useCreateEngagementModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: EngagementModelInsert) => {
      const d = await withCreatedBy(item);
      const { data, error } = await supabase.from("md_engagement_models").insert(d).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["engagement_models"] }); toast.success("Engagement model created successfully"); },
    onError: (e: Error) => handleMutationError(e, { operation: "create_engagement_model" }),
  });
}

export function useUpdateEngagementModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: EngagementModelUpdate & { id: string }) => {
      const d = await withUpdatedBy(updates);
      const { data, error } = await supabase.from("md_engagement_models").update(d).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["engagement_models"] }); toast.success("Engagement model updated successfully"); },
    onError: (e: Error) => handleMutationError(e, { operation: "update_engagement_model" }),
  });
}

export function useDeleteEngagementModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("md_engagement_models").update({ is_active: false }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["engagement_models"] }); toast.success("Engagement model deactivated"); },
    onError: (e: Error) => handleMutationError(e, { operation: "deactivate_engagement_model" }),
  });
}

export function useRestoreEngagementModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("md_engagement_models").update({ is_active: true }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["engagement_models"] }); toast.success("Engagement model restored"); },
    onError: (e: Error) => handleMutationError(e, { operation: "restore_engagement_model" }),
  });
}

export function useHardDeleteEngagementModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("md_engagement_models").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["engagement_models"] }); toast.success("Engagement model permanently deleted"); },
    onError: (e: Error) => handleMutationError(e, { operation: "delete_engagement_model" }),
  });
}
