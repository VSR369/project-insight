import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { handleMutationError } from "@/lib/errorHandler";
import type { Database } from "@/integrations/supabase/types";

export type MembershipTier = Database["public"]["Tables"]["md_membership_tiers"]["Row"];
export type MembershipTierInsert = Database["public"]["Tables"]["md_membership_tiers"]["Insert"];

const TABLE = "md_membership_tiers";
const KEY = ["membership-tiers"];

export function useMembershipTiers(includeInactive = false) {
  return useQuery({
    queryKey: [...KEY, { includeInactive }],
    queryFn: async () => {
      let q = supabase.from(TABLE).select("*").order("display_order").order("name");
      if (!includeInactive) q = q.eq("is_active", true);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data as MembershipTier[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useCreateMembershipTier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: MembershipTierInsert) => {
      const { data, error } = await supabase.from(TABLE).insert(item).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success("Membership tier created successfully"); },
    onError: (e: Error) => handleMutationError(e, { operation: "create_membership_tier" }),
  });
}

export function useUpdateMembershipTier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MembershipTier> & { id: string }) => {
      const { data, error } = await supabase.from(TABLE).update(updates).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success("Membership tier updated successfully"); },
    onError: (e: Error) => handleMutationError(e, { operation: "update_membership_tier" }),
  });
}

export function useDeleteMembershipTier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLE).update({ is_active: false }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success("Membership tier deactivated"); },
    onError: (e: Error) => handleMutationError(e, { operation: "deactivate_membership_tier" }),
  });
}

export function useRestoreMembershipTier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLE).update({ is_active: true }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success("Membership tier restored"); },
    onError: (e: Error) => handleMutationError(e, { operation: "restore_membership_tier" }),
  });
}

export function useHardDeleteMembershipTier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLE).delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success("Membership tier permanently deleted"); },
    onError: (e: Error) => handleMutationError(e, { operation: "delete_membership_tier" }),
  });
}
