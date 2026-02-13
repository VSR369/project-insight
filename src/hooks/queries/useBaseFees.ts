import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { withCreatedBy, withUpdatedBy } from "@/lib/auditFields";
import { handleMutationError } from "@/lib/errorHandler";
import type { Database } from "@/integrations/supabase/types";

export type BaseFee = Database["public"]["Tables"]["md_challenge_base_fees"]["Row"];
export type BaseFeeInsert = Database["public"]["Tables"]["md_challenge_base_fees"]["Insert"];

const TABLE = "md_challenge_base_fees";
const KEY = ["base-fees"];

export function useBaseFees(includeInactive = false) {
  return useQuery({
    queryKey: [...KEY, { includeInactive }],
    queryFn: async () => {
      let q = supabase.from(TABLE).select(`id, country_id, tier_id, engagement_model_id, consulting_base_fee, management_base_fee, currency_code, is_active, created_at, countries(name), md_subscription_tiers(name), md_engagement_models(name)`).order("created_at");
      if (!includeInactive) q = q.eq("is_active", true);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useCreateBaseFee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: BaseFeeInsert) => {
      const d = await withCreatedBy(item);
      const { data, error } = await supabase.from(TABLE).insert(d).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success("Base fee created successfully"); },
    onError: (e: Error) => handleMutationError(e, { operation: "create_base_fee" }),
  });
}

export function useUpdateBaseFee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BaseFee> & { id: string }) => {
      const d = await withUpdatedBy(updates);
      const { data, error } = await supabase.from(TABLE).update(d).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success("Base fee updated successfully"); },
    onError: (e: Error) => handleMutationError(e, { operation: "update_base_fee" }),
  });
}

export function useDeleteBaseFee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLE).update({ is_active: false }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success("Base fee deactivated"); },
    onError: (e: Error) => handleMutationError(e, { operation: "deactivate_base_fee" }),
  });
}

export function useRestoreBaseFee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLE).update({ is_active: true }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success("Base fee restored"); },
    onError: (e: Error) => handleMutationError(e, { operation: "restore_base_fee" }),
  });
}

export function useHardDeleteBaseFee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLE).delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success("Base fee permanently deleted"); },
    onError: (e: Error) => handleMutationError(e, { operation: "delete_base_fee" }),
  });
}
