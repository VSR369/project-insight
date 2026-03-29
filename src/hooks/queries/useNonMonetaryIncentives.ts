import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { withCreatedBy, withUpdatedBy } from "@/lib/auditFields";
import { handleMutationError } from "@/lib/errorHandler";

export interface NonMonetaryIncentive {
  id: string;
  name: string;
  description: string;
  cash_equivalent_min: number;
  cash_equivalent_max: number;
  applicable_maturity_levels: string[];
  minimum_complexity: string;
  seeker_requirement: string;
  credibility_note: string;
  solver_appeal: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string | null;
  created_by: string | null;
  updated_by: string | null;
}

export type NonMonetaryIncentiveInsert = Omit<NonMonetaryIncentive, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'>;
export type NonMonetaryIncentiveUpdate = Partial<NonMonetaryIncentiveInsert>;

export function useNonMonetaryIncentives(includeInactive = false) {
  return useQuery({
    queryKey: ["non_monetary_incentives", { includeInactive }],
    queryFn: async () => {
      let query = supabase
        .from("non_monetary_incentives")
        .select("id, name, description, cash_equivalent_min, cash_equivalent_max, applicable_maturity_levels, minimum_complexity, seeker_requirement, credibility_note, solver_appeal, is_active, display_order, created_at, updated_at, created_by, updated_by")
        .order("display_order", { ascending: true })
        .order("name", { ascending: true });

      if (!includeInactive) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data as NonMonetaryIncentive[];
    },
    staleTime: 300000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useCreateNonMonetaryIncentive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (item: NonMonetaryIncentiveInsert) => {
      const withAudit = await withCreatedBy(item);
      const { data, error } = await supabase.from("non_monetary_incentives").insert(withAudit).select().single();
      if (error) throw new Error(error.message);
      return data as NonMonetaryIncentive;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["non_monetary_incentives"] });
      toast.success("Incentive created successfully");
    },
    onError: (error: Error) => handleMutationError(error, { operation: 'create_incentive' }),
  });
}

export function useUpdateNonMonetaryIncentive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: NonMonetaryIncentiveUpdate & { id: string }) => {
      const withAudit = await withUpdatedBy(updates);
      const { data, error } = await supabase.from("non_monetary_incentives").update(withAudit).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return data as NonMonetaryIncentive;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["non_monetary_incentives"] });
      toast.success("Incentive updated successfully");
    },
    onError: (error: Error) => handleMutationError(error, { operation: 'update_incentive' }),
  });
}

export function useDeleteNonMonetaryIncentive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("non_monetary_incentives").update({ is_active: false }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["non_monetary_incentives"] });
      toast.success("Incentive deactivated");
    },
    onError: (error: Error) => handleMutationError(error, { operation: 'deactivate_incentive' }),
  });
}

export function useRestoreNonMonetaryIncentive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("non_monetary_incentives").update({ is_active: true }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["non_monetary_incentives"] });
      toast.success("Incentive restored");
    },
    onError: (error: Error) => handleMutationError(error, { operation: 'restore_incentive' }),
  });
}

export function useHardDeleteNonMonetaryIncentive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("non_monetary_incentives").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["non_monetary_incentives"] });
      toast.success("Incentive permanently deleted");
    },
    onError: (error: Error) => handleMutationError(error, { operation: 'delete_incentive' }),
  });
}
