import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { withCreatedBy, withUpdatedBy } from "@/lib/auditFields";
import { handleMutationError } from "@/lib/errorHandler";

export interface SubsidizedPricing {
  id: string;
  org_type_rule_id: string;
  discount_percentage: number;
  max_duration_months: number | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
  org_type_rule?: { id: string; org_type: { name: string; code: string } };
}

export interface OrgTypeRuleOption {
  id: string;
  org_type_name: string;
  org_type_code: string;
}

export function useSubsidizedPricing(includeInactive = false) {
  return useQuery({
    queryKey: ["subsidized-pricing", { includeInactive }],
    queryFn: async () => {
      let query = supabase.from("md_subsidized_pricing")
        .select("id, org_type_rule_id, discount_percentage, max_duration_months, description, is_active, created_at, updated_at, org_type_rule:org_type_seeker_rules(id, org_type:organization_types(name, code))")
        .order("discount_percentage", { ascending: false });
      if (!includeInactive) query = query.eq("is_active", true);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data as unknown as SubsidizedPricing[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useOrgTypeRuleOptions() {
  return useQuery({
    queryKey: ["org-type-rule-options"],
    queryFn: async () => {
      const { data, error } = await supabase.from("org_type_seeker_rules")
        .select("id, org_type:organization_types(name, code)")
        .order("id");
      if (error) throw new Error(error.message);
      return (data as any[]).map((d) => ({
        id: d.id,
        org_type_name: d.org_type?.name ?? "Unknown",
        org_type_code: d.org_type?.code ?? "",
      })) as OrgTypeRuleOption[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateSubsidizedPricing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: Record<string, unknown>) => {
      const d = await withCreatedBy(item);
      const { data, error } = await supabase.from("md_subsidized_pricing").insert(d as any).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["subsidized-pricing"] }); toast.success("Subsidized pricing created successfully"); },
    onError: (e: Error) => handleMutationError(e, { operation: "create_subsidized_pricing" }),
  });
}

export function useUpdateSubsidizedPricing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Record<string, unknown>) => {
      const d = await withUpdatedBy(updates);
      const { data, error } = await supabase.from("md_subsidized_pricing").update(d as any).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["subsidized-pricing"] }); toast.success("Subsidized pricing updated successfully"); },
    onError: (e: Error) => handleMutationError(e, { operation: "update_subsidized_pricing" }),
  });
}

export function useDeleteSubsidizedPricing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("md_subsidized_pricing").update({ is_active: false }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["subsidized-pricing"] }); toast.success("Subsidized pricing deactivated"); },
    onError: (e: Error) => handleMutationError(e, { operation: "deactivate_subsidized_pricing" }),
  });
}

export function useRestoreSubsidizedPricing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("md_subsidized_pricing").update({ is_active: true }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["subsidized-pricing"] }); toast.success("Subsidized pricing restored"); },
    onError: (e: Error) => handleMutationError(e, { operation: "restore_subsidized_pricing" }),
  });
}

export function useHardDeleteSubsidizedPricing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("md_subsidized_pricing").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["subsidized-pricing"] }); toast.success("Subsidized pricing permanently deleted"); },
    onError: (e: Error) => handleMutationError(e, { operation: "delete_subsidized_pricing" }),
  });
}
