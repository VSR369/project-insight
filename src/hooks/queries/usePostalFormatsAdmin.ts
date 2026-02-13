import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { withCreatedBy, withUpdatedBy } from "@/lib/auditFields";
import { handleMutationError } from "@/lib/errorHandler";

export interface PostalFormat {
  id: string;
  country_id: string;
  label: string | null;
  format_regex: string | null;
  example: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
  country?: { name: string; code: string };
}

export function usePostalFormats(includeInactive = false) {
  return useQuery({
    queryKey: ["postal-formats", { includeInactive }],
    queryFn: async () => {
      let query = supabase.from("md_postal_formats")
        .select("id, country_id, label, format_regex, example, is_active, created_at, updated_at, country:countries(name, code)")
        .order("created_at", { ascending: true });
      if (!includeInactive) query = query.eq("is_active", true);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data as unknown as PostalFormat[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useCreatePostalFormat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: Record<string, unknown>) => {
      const d = await withCreatedBy(item);
      const { data, error } = await supabase.from("md_postal_formats").insert(d as any).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["postal-formats"] }); toast.success("Postal format created successfully"); },
    onError: (e: Error) => handleMutationError(e, { operation: "create_postal_format" }),
  });
}

export function useUpdatePostalFormat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Record<string, unknown>) => {
      const d = await withUpdatedBy(updates);
      const { data, error } = await supabase.from("md_postal_formats").update(d as any).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["postal-formats"] }); toast.success("Postal format updated successfully"); },
    onError: (e: Error) => handleMutationError(e, { operation: "update_postal_format" }),
  });
}

export function useDeletePostalFormat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("md_postal_formats").update({ is_active: false }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["postal-formats"] }); toast.success("Postal format deactivated"); },
    onError: (e: Error) => handleMutationError(e, { operation: "deactivate_postal_format" }),
  });
}

export function useRestorePostalFormat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("md_postal_formats").update({ is_active: true }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["postal-formats"] }); toast.success("Postal format restored"); },
    onError: (e: Error) => handleMutationError(e, { operation: "restore_postal_format" }),
  });
}

export function useHardDeletePostalFormat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("md_postal_formats").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["postal-formats"] }); toast.success("Postal format permanently deleted"); },
    onError: (e: Error) => handleMutationError(e, { operation: "delete_postal_format" }),
  });
}
