import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { withCreatedBy, withUpdatedBy } from "@/lib/auditFields";
import { handleMutationError } from "@/lib/errorHandler";

export type SubscriptionTier = Tables<"md_subscription_tiers">;
export type SubscriptionTierInsert = TablesInsert<"md_subscription_tiers">;
export type SubscriptionTierUpdate = TablesUpdate<"md_subscription_tiers">;

export function useSubscriptionTiers(includeInactive = false) {
  return useQuery({
    queryKey: ["subscription_tiers", { includeInactive }],
    queryFn: async () => {
      let query = supabase.from("md_subscription_tiers")
        .select("id, code, name, description, max_challenges, max_users, is_enterprise, display_order, is_active")
        .order("display_order", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true });
      if (!includeInactive) query = query.eq("is_active", true);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data as SubscriptionTier[];
    },
    staleTime: 300000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useCreateSubscriptionTier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: SubscriptionTierInsert) => {
      const d = await withCreatedBy(item);
      const { data, error } = await supabase.from("md_subscription_tiers").insert(d).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["subscription_tiers"] }); toast.success("Subscription tier created successfully"); },
    onError: (e: Error) => handleMutationError(e, { operation: "create_subscription_tier" }),
  });
}

export function useUpdateSubscriptionTier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: SubscriptionTierUpdate & { id: string }) => {
      const d = await withUpdatedBy(updates);
      const { data, error } = await supabase.from("md_subscription_tiers").update(d).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["subscription_tiers"] }); toast.success("Subscription tier updated successfully"); },
    onError: (e: Error) => handleMutationError(e, { operation: "update_subscription_tier" }),
  });
}

export function useDeleteSubscriptionTier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("md_subscription_tiers").update({ is_active: false }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["subscription_tiers"] }); toast.success("Subscription tier deactivated"); },
    onError: (e: Error) => handleMutationError(e, { operation: "deactivate_subscription_tier" }),
  });
}

export function useRestoreSubscriptionTier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("md_subscription_tiers").update({ is_active: true }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["subscription_tiers"] }); toast.success("Subscription tier restored"); },
    onError: (e: Error) => handleMutationError(e, { operation: "restore_subscription_tier" }),
  });
}

export function useHardDeleteSubscriptionTier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("md_subscription_tiers").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["subscription_tiers"] }); toast.success("Subscription tier permanently deleted"); },
    onError: (e: Error) => handleMutationError(e, { operation: "delete_subscription_tier" }),
  });
}
