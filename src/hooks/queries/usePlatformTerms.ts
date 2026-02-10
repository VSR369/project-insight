import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { withCreatedBy, withUpdatedBy } from "@/lib/auditFields";
import { handleMutationError } from "@/lib/errorHandler";

export type PlatformTerm = Tables<"platform_terms">;
export type PlatformTermInsert = TablesInsert<"platform_terms">;
export type PlatformTermUpdate = TablesUpdate<"platform_terms">;

export function usePlatformTerms(includeInactive = false) {
  return useQuery({
    queryKey: ["platform_terms", { includeInactive }],
    queryFn: async () => {
      let query = supabase.from("platform_terms")
        .select("id, version, title, content, effective_date, published_at, is_active, created_at")
        .order("effective_date", { ascending: false });
      if (!includeInactive) query = query.eq("is_active", true);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data as PlatformTerm[];
    },
    staleTime: 300000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useCreatePlatformTerm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: PlatformTermInsert) => {
      const d = await withCreatedBy(item);
      const { data, error } = await supabase.from("platform_terms").insert(d).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["platform_terms"] }); toast.success("Platform terms created successfully"); },
    onError: (e: Error) => handleMutationError(e, { operation: "create_platform_terms" }),
  });
}

export function useUpdatePlatformTerm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: PlatformTermUpdate & { id: string }) => {
      const d = await withUpdatedBy(updates);
      const { data, error } = await supabase.from("platform_terms").update(d).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["platform_terms"] }); toast.success("Platform terms updated successfully"); },
    onError: (e: Error) => handleMutationError(e, { operation: "update_platform_terms" }),
  });
}

export function useDeletePlatformTerm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("platform_terms").update({ is_active: false }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["platform_terms"] }); toast.success("Platform terms deactivated"); },
    onError: (e: Error) => handleMutationError(e, { operation: "deactivate_platform_terms" }),
  });
}

export function useRestorePlatformTerm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("platform_terms").update({ is_active: true }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["platform_terms"] }); toast.success("Platform terms restored"); },
    onError: (e: Error) => handleMutationError(e, { operation: "restore_platform_terms" }),
  });
}

export function useHardDeletePlatformTerm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("platform_terms").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["platform_terms"] }); toast.success("Platform terms permanently deleted"); },
    onError: (e: Error) => handleMutationError(e, { operation: "delete_platform_terms" }),
  });
}
