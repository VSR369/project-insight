import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { withCreatedBy, withUpdatedBy } from "@/lib/auditFields";
import { handleMutationError } from "@/lib/errorHandler";

export interface TaxFormat {
  id: string;
  country_id: string;
  tax_name: string;
  format_regex: string | null;
  example: string | null;
  is_required: boolean;
  is_active: boolean;
  display_order: number | null;
  created_at: string;
  updated_at: string | null;
  country?: { name: string; code: string };
}

export function useTaxFormats(includeInactive = false) {
  return useQuery({
    queryKey: ["tax-formats", { includeInactive }],
    queryFn: async () => {
      let query = supabase.from("md_tax_formats")
        .select("id, country_id, tax_name, format_regex, example, is_required, is_active, display_order, created_at, updated_at, country:countries(name, code)")
        .order("display_order", { ascending: true, nullsFirst: false })
        .order("tax_name", { ascending: true });
      if (!includeInactive) query = query.eq("is_active", true);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data as unknown as TaxFormat[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useCreateTaxFormat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: Record<string, unknown>) => {
      const d = await withCreatedBy(item);
      const { data, error } = await supabase.from("md_tax_formats").insert(d as any).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tax-formats"] }); toast.success("Tax format created successfully"); },
    onError: (e: Error) => handleMutationError(e, { operation: "create_tax_format" }),
  });
}

export function useUpdateTaxFormat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Record<string, unknown>) => {
      const d = await withUpdatedBy(updates);
      const { data, error } = await supabase.from("md_tax_formats").update(d as any).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tax-formats"] }); toast.success("Tax format updated successfully"); },
    onError: (e: Error) => handleMutationError(e, { operation: "update_tax_format" }),
  });
}

export function useDeleteTaxFormat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("md_tax_formats").update({ is_active: false }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tax-formats"] }); toast.success("Tax format deactivated"); },
    onError: (e: Error) => handleMutationError(e, { operation: "deactivate_tax_format" }),
  });
}

export function useRestoreTaxFormat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("md_tax_formats").update({ is_active: true }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tax-formats"] }); toast.success("Tax format restored"); },
    onError: (e: Error) => handleMutationError(e, { operation: "restore_tax_format" }),
  });
}

export function useHardDeleteTaxFormat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("md_tax_formats").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tax-formats"] }); toast.success("Tax format permanently deleted"); },
    onError: (e: Error) => handleMutationError(e, { operation: "delete_tax_format" }),
  });
}
