import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { withCreatedBy, withUpdatedBy } from "@/lib/auditFields";
import { handleMutationError } from "@/lib/errorHandler";

export type BillingCycle = Tables<"md_billing_cycles">;
export type BillingCycleInsert = TablesInsert<"md_billing_cycles">;
export type BillingCycleUpdate = TablesUpdate<"md_billing_cycles">;

export function useBillingCycles(includeInactive = false) {
  return useQuery({
    queryKey: ["billing-cycles", { includeInactive }],
    queryFn: async () => {
      let query = supabase.from("md_billing_cycles")
        .select("id, code, name, months, discount_percentage, is_active, display_order, created_at, updated_at")
        .order("display_order", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true });
      if (!includeInactive) query = query.eq("is_active", true);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data as BillingCycle[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useCreateBillingCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: BillingCycleInsert) => {
      const d = await withCreatedBy(item);
      const { data, error } = await supabase.from("md_billing_cycles").insert(d).select().single();
      if (error) throw new Error(error.message);
      return data as BillingCycle;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["billing-cycles"] }); toast.success("Billing cycle created successfully"); },
    onError: (e: Error) => handleMutationError(e, { operation: "create_billing_cycle" }),
  });
}

export function useUpdateBillingCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: BillingCycleUpdate & { id: string }) => {
      const d = await withUpdatedBy(updates);
      const { data, error } = await supabase.from("md_billing_cycles").update(d).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return data as BillingCycle;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["billing-cycles"] }); toast.success("Billing cycle updated successfully"); },
    onError: (e: Error) => handleMutationError(e, { operation: "update_billing_cycle" }),
  });
}

export function useDeleteBillingCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("md_billing_cycles").update({ is_active: false }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["billing-cycles"] }); toast.success("Billing cycle deactivated"); },
    onError: (e: Error) => handleMutationError(e, { operation: "deactivate_billing_cycle" }),
  });
}

export function useRestoreBillingCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("md_billing_cycles").update({ is_active: true }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["billing-cycles"] }); toast.success("Billing cycle restored"); },
    onError: (e: Error) => handleMutationError(e, { operation: "restore_billing_cycle" }),
  });
}

export function useHardDeleteBillingCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("md_billing_cycles").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["billing-cycles"] }); toast.success("Billing cycle permanently deleted"); },
    onError: (e: Error) => handleMutationError(e, { operation: "delete_billing_cycle" }),
  });
}
