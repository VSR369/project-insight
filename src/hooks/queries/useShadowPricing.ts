import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

export type ShadowPricing = Database["public"]["Tables"]["md_shadow_pricing"]["Row"];
export type ShadowPricingInsert = Database["public"]["Tables"]["md_shadow_pricing"]["Insert"];

const TABLE = "md_shadow_pricing";
const KEY = ["shadow-pricing"];

export function useShadowPricing(includeInactive = false) {
  return useQuery({
    queryKey: [...KEY, { includeInactive }],
    queryFn: async () => {
      let q = supabase.from(TABLE).select(`*, md_subscription_tiers(name), countries(name, currency_code, currency_symbol)`).order("created_at");
      if (!includeInactive) q = q.eq("is_active", true);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateShadowPricing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: ShadowPricingInsert) => {
      const { data, error } = await supabase.from(TABLE).insert(item).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success("Shadow pricing created successfully"); },
    onError: (e: Error) => toast.error(`Failed to create: ${e.message}`),
  });
}

export function useUpdateShadowPricing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ShadowPricing> & { id: string }) => {
      const { data, error } = await supabase.from(TABLE).update(updates).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success("Shadow pricing updated successfully"); },
    onError: (e: Error) => toast.error(`Failed to update: ${e.message}`),
  });
}

export function useDeleteShadowPricing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLE).update({ is_active: false }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success("Shadow pricing deactivated"); },
    onError: (e: Error) => toast.error(`Failed to deactivate: ${e.message}`),
  });
}

export function useRestoreShadowPricing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLE).update({ is_active: true }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success("Shadow pricing restored"); },
    onError: (e: Error) => toast.error(`Failed to restore: ${e.message}`),
  });
}

export function useHardDeleteShadowPricing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLE).delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success("Shadow pricing permanently deleted"); },
    onError: (e: Error) => toast.error(`Failed to delete: ${e.message}`),
  });
}
