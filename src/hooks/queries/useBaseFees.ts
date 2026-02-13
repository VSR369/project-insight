import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

export type BaseFee = Database["public"]["Tables"]["md_challenge_base_fees"]["Row"];
export type BaseFeeInsert = Database["public"]["Tables"]["md_challenge_base_fees"]["Insert"];

const TABLE = "md_challenge_base_fees";
const KEY = ["base-fees"];

export function useBaseFees(includeInactive = false) {
  return useQuery({
    queryKey: [...KEY, { includeInactive }],
    queryFn: async () => {
      let q = supabase.from(TABLE).select(`*, countries(name), md_subscription_tiers(name)`).order("created_at");
      if (!includeInactive) q = q.eq("is_active", true);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateBaseFee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: BaseFeeInsert) => {
      const { data, error } = await supabase.from(TABLE).insert(item).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success("Base fee created successfully"); },
    onError: (e: Error) => toast.error(`Failed to create: ${e.message}`),
  });
}

export function useUpdateBaseFee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BaseFee> & { id: string }) => {
      const { data, error } = await supabase.from(TABLE).update(updates).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success("Base fee updated successfully"); },
    onError: (e: Error) => toast.error(`Failed to update: ${e.message}`),
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
    onError: (e: Error) => toast.error(`Failed to deactivate: ${e.message}`),
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
    onError: (e: Error) => toast.error(`Failed to restore: ${e.message}`),
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
    onError: (e: Error) => toast.error(`Failed to delete: ${e.message}`),
  });
}
