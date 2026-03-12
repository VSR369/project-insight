/**
 * Hook for pending_challenge_refs — tracks challenges blocked by missing roles
 * BRD Ref: BR-CORE-007, BR-MP-CONTACT-003
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { withCreatedBy, withUpdatedBy } from "@/lib/auditFields";
import { handleMutationError } from "@/lib/errorHandler";
import { toast } from "sonner";

export interface PendingChallengeRef {
  id: string;
  challenge_id: string;
  org_id: string;
  engagement_model: string;
  missing_role_codes: string[];
  blocking_reason: string;
  is_resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
}

/** Fetch unresolved pending refs for an org */
export function usePendingChallengeRefs(orgId?: string) {
  return useQuery({
    queryKey: ["pending-challenge-refs", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("pending_challenge_refs")
        .select("id, challenge_id, org_id, engagement_model, missing_role_codes, blocking_reason, is_resolved, resolved_at, resolved_by, created_at")
        .eq("org_id", orgId)
        .eq("is_resolved", false)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw new Error(error.message);
      return (data ?? []) as PendingChallengeRef[];
    },
    enabled: !!orgId,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });
}

/** Fetch pending refs for a specific challenge */
export function usePendingChallengeRefsByChallenge(challengeId?: string) {
  return useQuery({
    queryKey: ["pending-challenge-refs-by-challenge", challengeId],
    queryFn: async () => {
      if (!challengeId) return [];
      const { data, error } = await supabase
        .from("pending_challenge_refs")
        .select("id, challenge_id, org_id, engagement_model, missing_role_codes, blocking_reason, is_resolved, resolved_at, created_at")
        .eq("challenge_id", challengeId)
        .eq("is_resolved", false);
      if (error) throw new Error(error.message);
      return (data ?? []) as PendingChallengeRef[];
    },
    enabled: !!challengeId,
    staleTime: 0,
  });
}

/** Create a pending challenge ref when NOT_READY detected */
export function useCreatePendingChallengeRef() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      challenge_id: string;
      org_id: string;
      engagement_model: string;
      missing_role_codes: string[];
      blocking_reason: string;
    }) => {
      // Check if an unresolved ref already exists for this challenge
      const { data: existing } = await supabase
        .from("pending_challenge_refs")
        .select("id")
        .eq("challenge_id", params.challenge_id)
        .eq("is_resolved", false)
        .limit(1);

      if (existing && existing.length > 0) {
        // Update existing ref with latest missing roles
        const updateData = await withUpdatedBy({
          missing_role_codes: params.missing_role_codes,
          blocking_reason: params.blocking_reason,
        });
        const { error } = await supabase
          .from("pending_challenge_refs")
          .update(updateData as any)
          .eq("id", existing[0].id);
        if (error) throw new Error(error.message);
        return existing[0];
      }

      // Create new ref
      const record = await withCreatedBy({
        challenge_id: params.challenge_id,
        org_id: params.org_id,
        engagement_model: params.engagement_model,
        missing_role_codes: params.missing_role_codes,
        blocking_reason: params.blocking_reason,
      });
      const { data, error } = await supabase
        .from("pending_challenge_refs")
        .insert(record as any)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pending-challenge-refs", variables.org_id] });
      queryClient.invalidateQueries({ queryKey: ["pending-challenge-refs-by-challenge", variables.challenge_id] });
    },
    onError: (error: Error) => handleMutationError(error, { operation: "create_pending_challenge_ref" }),
  });
}

/** Resolve a pending challenge ref when READY detected */
export function useResolvePendingChallengeRef() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { challengeId: string; orgId: string }) => {
      const updateData = await withUpdatedBy({
        is_resolved: true,
        resolved_at: new Date().toISOString(),
      });
      const { error } = await supabase
        .from("pending_challenge_refs")
        .update(updateData as any)
        .eq("challenge_id", params.challengeId)
        .eq("is_resolved", false);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pending-challenge-refs", variables.orgId] });
      queryClient.invalidateQueries({ queryKey: ["pending-challenge-refs-by-challenge", variables.challengeId] });
      queryClient.invalidateQueries({ queryKey: ["role-readiness"] });
    },
    onError: (error: Error) => handleMutationError(error, { operation: "resolve_pending_challenge_ref" }),
  });
}
