import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { withCreatedBy, withUpdatedBy } from "@/lib/auditFields";
import { handleMutationError } from "@/lib/errorHandler";

export interface PlatformFee {
  id: string;
  engagement_model_id: string;
  tier_id: string;
  country_id: string | null;
  currency_code: string;
  platform_fee_pct: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
  created_by: string | null;
  updated_by: string | null;
}

export interface PlatformFeeInsert {
  engagement_model_id: string;
  tier_id: string;
  country_id: string;
  currency_code: string;
  platform_fee_pct: number;
  description?: string | null;
  is_active?: boolean;
}

type PlatformFeeWithJoins = PlatformFee & {
  md_engagement_models?: { name: string } | null;
  md_subscription_tiers?: { name: string } | null;
  countries?: { name: string; currency_code: string; currency_symbol: string } | null;
};

const TABLE = "md_platform_fees";
const KEY = ["platform-fees"];

export function usePlatformFees(includeInactive = false) {
  return useQuery({
    queryKey: [...KEY, { includeInactive }],
    queryFn: async () => {
      let q = supabase.from(TABLE).select(`*, md_engagement_models(name), md_subscription_tiers(name), countries(name, currency_code, currency_symbol)`).order("created_at");
      if (!includeInactive) q = q.eq("is_active", true);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data as PlatformFeeWithJoins[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreatePlatformFee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: PlatformFeeInsert) => {
      const d = await withCreatedBy(item);
      const { data, error } = await supabase.from(TABLE).insert(d).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success("Platform fee created successfully"); },
    onError: (e: Error) => handleMutationError(e, { operation: "create_platform_fee" }),
  });
}

export function useUpdatePlatformFee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PlatformFee> & { id: string }) => {
      const d = await withUpdatedBy(updates);
      const { data, error } = await supabase.from(TABLE).update(d).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success("Platform fee updated successfully"); },
    onError: (e: Error) => handleMutationError(e, { operation: "update_platform_fee" }),
  });
}

export function useDeletePlatformFee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLE).update({ is_active: false }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success("Platform fee deactivated"); },
    onError: (e: Error) => handleMutationError(e, { operation: "deactivate_platform_fee" }),
  });
}

export function useRestorePlatformFee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLE).update({ is_active: true }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success("Platform fee restored"); },
    onError: (e: Error) => handleMutationError(e, { operation: "restore_platform_fee" }),
  });
}

export function useHardDeletePlatformFee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLE).delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success("Platform fee permanently deleted"); },
    onError: (e: Error) => handleMutationError(e, { operation: "delete_platform_fee" }),
  });
}
