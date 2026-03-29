import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { withCreatedBy, withUpdatedBy } from "@/lib/auditFields";
import { handleMutationError } from "@/lib/errorHandler";

export interface RateCard {
  id: string;
  organization_type_id: string;
  maturity_level: string;
  effort_rate_floor: number;
  reward_floor_amount: number;
  reward_ceiling: number | null;
  big4_benchmark_multiplier: number;
  non_monetary_weight: number;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
  created_by: string | null;
  updated_by: string | null;
}

export type RateCardWithOrgType = RateCard & {
  organization_types?: { id: string; code: string; name: string } | null;
};

export type RateCardInsert = Omit<RateCard, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'>;
export type RateCardUpdate = Partial<RateCardInsert>;

export function useRateCards(includeInactive = false) {
  return useQuery({
    queryKey: ["rate_cards", { includeInactive }],
    queryFn: async () => {
      let query = supabase
        .from("rate_cards")
        .select("id, organization_type_id, maturity_level, effort_rate_floor, reward_floor_amount, reward_ceiling, big4_benchmark_multiplier, non_monetary_weight, is_active, created_at, updated_at, created_by, updated_by, organization_types(id, code, name)")
        .order("maturity_level", { ascending: true });

      if (!includeInactive) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data as RateCardWithOrgType[];
    },
    staleTime: 300000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useCreateRateCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (rateCard: RateCardInsert) => {
      const withAudit = await withCreatedBy(rateCard);
      const { data, error } = await supabase
        .from("rate_cards")
        .insert(withAudit)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as RateCard;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rate_cards"] });
      toast.success("Rate card created successfully");
    },
    onError: (error: Error) => handleMutationError(error, { operation: 'create_rate_card' }),
  });
}

export function useUpdateRateCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: RateCardUpdate & { id: string }) => {
      const withAudit = await withUpdatedBy(updates);
      const { data, error } = await supabase
        .from("rate_cards")
        .update(withAudit)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as RateCard;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rate_cards"] });
      toast.success("Rate card updated successfully");
    },
    onError: (error: Error) => handleMutationError(error, { operation: 'update_rate_card' }),
  });
}

export function useDeleteRateCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rate_cards").update({ is_active: false }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rate_cards"] });
      toast.success("Rate card deactivated");
    },
    onError: (error: Error) => handleMutationError(error, { operation: 'deactivate_rate_card' }),
  });
}

export function useRestoreRateCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rate_cards").update({ is_active: true }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rate_cards"] });
      toast.success("Rate card restored");
    },
    onError: (error: Error) => handleMutationError(error, { operation: 'restore_rate_card' }),
  });
}

export function useHardDeleteRateCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rate_cards").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rate_cards"] });
      toast.success("Rate card permanently deleted");
    },
    onError: (error: Error) => handleMutationError(error, { operation: 'delete_rate_card' }),
  });
}
