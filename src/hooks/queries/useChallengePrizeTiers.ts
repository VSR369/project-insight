/**
 * useChallengePrizeTiers — CRUD hook for challenge_prize_tiers table.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { withCreatedBy, withUpdatedBy } from "@/lib/auditFields";
import { handleMutationError } from "@/lib/errorHandler";

export interface ChallengePrizeTier {
  id: string;
  challenge_id: string;
  tier_name: string;
  rank: number;
  percentage_of_pool: number;
  fixed_amount: number | null;
  max_winners: number;
  description: string | null;
  created_by_role: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string | null;
  created_by: string | null;
  updated_by: string | null;
}

export type PrizeTierInsert = Omit<ChallengePrizeTier, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'>;
export type PrizeTierUpdate = Partial<Omit<PrizeTierInsert, 'challenge_id'>>;

export function useChallengePrizeTiers(challengeId: string | undefined) {
  return useQuery({
    queryKey: ["challenge_prize_tiers", challengeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenge_prize_tiers")
        .select("id, challenge_id, tier_name, rank, percentage_of_pool, fixed_amount, max_winners, description, created_by_role, is_default, created_at, updated_at, created_by, updated_by")
        .eq("challenge_id", challengeId!)
        .order("rank", { ascending: true });
      if (error) throw new Error(error.message);
      return data as ChallengePrizeTier[];
    },
    enabled: !!challengeId,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useCreatePrizeTier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tier: PrizeTierInsert) => {
      const withAudit = await withCreatedBy(tier);
      const { data, error } = await supabase
        .from("challenge_prize_tiers")
        .insert(withAudit)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as ChallengePrizeTier;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["challenge_prize_tiers", data.challenge_id] });
      toast.success("Prize tier added");
    },
    onError: (error: Error) => handleMutationError(error, { operation: 'create_prize_tier' }),
  });
}

export function useUpdatePrizeTier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, challengeId, ...updates }: PrizeTierUpdate & { id: string; challengeId: string }) => {
      const withAudit = await withUpdatedBy(updates);
      const { data, error } = await supabase
        .from("challenge_prize_tiers")
        .update(withAudit)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return { ...data, _challengeId: challengeId } as ChallengePrizeTier & { _challengeId: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["challenge_prize_tiers", (data as any)._challengeId ?? data.challenge_id] });
    },
    onError: (error: Error) => handleMutationError(error, { operation: 'update_prize_tier' }),
  });
}

export function useDeletePrizeTier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, challengeId }: { id: string; challengeId: string }) => {
      const { error } = await supabase.from("challenge_prize_tiers").delete().eq("id", id);
      if (error) throw new Error(error.message);
      return challengeId;
    },
    onSuccess: (challengeId) => {
      queryClient.invalidateQueries({ queryKey: ["challenge_prize_tiers", challengeId] });
      toast.success("Prize tier removed");
    },
    onError: (error: Error) => handleMutationError(error, { operation: 'delete_prize_tier' }),
  });
}

export function useBulkUpdatePrizeTiers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ challengeId, tiers }: { challengeId: string; tiers: { id: string; rank: number; percentage_of_pool?: number; fixed_amount?: number | null; max_winners?: number; tier_name?: string; description?: string | null }[] }) => {
      for (const tier of tiers) {
        const { id, ...updates } = tier;
        const withAudit = await withUpdatedBy(updates);
        const { error } = await supabase
          .from("challenge_prize_tiers")
          .update(withAudit)
          .eq("id", id);
        if (error) throw new Error(error.message);
      }
      return challengeId;
    },
    onSuccess: (challengeId) => {
      queryClient.invalidateQueries({ queryKey: ["challenge_prize_tiers", challengeId] });
      toast.success("Prize tiers updated");
    },
    onError: (error: Error) => handleMutationError(error, { operation: 'bulk_update_prize_tiers' }),
  });
}
