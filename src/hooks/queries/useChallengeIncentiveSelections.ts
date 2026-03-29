/**
 * useChallengeIncentiveSelections — CRUD hook for challenge_incentive_selections join table.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { withCreatedBy } from "@/lib/auditFields";
import { handleMutationError } from "@/lib/errorHandler";

export interface ChallengeIncentiveSelection {
  id: string;
  challenge_id: string;
  incentive_id: string;
  seeker_commitment: string | null;
  created_at: string;
  created_by: string | null;
  // Joined fields from non_monetary_incentives
  incentive?: {
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
  } | null;
}

export function useChallengeIncentiveSelections(challengeId: string | undefined) {
  return useQuery({
    queryKey: ["challenge_incentive_selections", challengeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenge_incentive_selections")
        .select("id, challenge_id, incentive_id, seeker_commitment, created_at, created_by, non_monetary_incentives(id, name, description, cash_equivalent_min, cash_equivalent_max, applicable_maturity_levels, minimum_complexity, seeker_requirement, credibility_note, solver_appeal)")
        .eq("challenge_id", challengeId!);
      if (error) throw new Error(error.message);
      return (data ?? []).map((row: any) => ({
        ...row,
        incentive: row.non_monetary_incentives ?? null,
      })) as ChallengeIncentiveSelection[];
    },
    enabled: !!challengeId,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useAddIncentiveSelection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (selection: { challenge_id: string; incentive_id: string; seeker_commitment?: string }) => {
      const withAudit = await withCreatedBy(selection);
      const { data, error } = await supabase
        .from("challenge_incentive_selections")
        .insert(withAudit)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["challenge_incentive_selections", data.challenge_id] });
      toast.success("Incentive added to challenge");
    },
    onError: (error: Error) => handleMutationError(error, { operation: 'add_incentive_selection' }),
  });
}

export function useUpdateIncentiveCommitment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, challengeId, seeker_commitment }: { id: string; challengeId: string; seeker_commitment: string }) => {
      const { error } = await supabase
        .from("challenge_incentive_selections")
        .update({ seeker_commitment })
        .eq("id", id);
      if (error) throw new Error(error.message);
      return challengeId;
    },
    onSuccess: (challengeId) => {
      queryClient.invalidateQueries({ queryKey: ["challenge_incentive_selections", challengeId] });
    },
    onError: (error: Error) => handleMutationError(error, { operation: 'update_incentive_commitment' }),
  });
}

export function useRemoveIncentiveSelection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, challengeId }: { id: string; challengeId: string }) => {
      const { error } = await supabase
        .from("challenge_incentive_selections")
        .delete()
        .eq("id", id);
      if (error) throw new Error(error.message);
      return challengeId;
    },
    onSuccess: (challengeId) => {
      queryClient.invalidateQueries({ queryKey: ["challenge_incentive_selections", challengeId] });
      toast.success("Incentive removed from challenge");
    },
    onError: (error: Error) => handleMutationError(error, { operation: 'remove_incentive_selection' }),
  });
}
