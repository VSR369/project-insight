/**
 * CRUD hooks for Solution Requests Queue & Assignment History (MOD-02)
 * BRD Ref: BR-MP-ASSIGN-001–005, SCR-04/06/07
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { withCreatedBy, withUpdatedBy } from "@/lib/auditFields";
import { handleMutationError } from "@/lib/errorHandler";

/* ─── Types ────────────────────────────────────────────── */

export interface SolutionRequestRow {
  id: string;
  title: string;
  status: string;
  organization_id: string;
  org_name: string;
  engagement_model_id: string | null;
  created_at: string;
  assignment_count: number;
}

export interface ChallengeAssignmentRow {
  id: string;
  challenge_id: string;
  pool_member_id: string;
  role_code: string;
  status: string;
  assigned_at: string;
  assigned_by: string | null;
  reassignment_reason: string | null;
  member_name: string;
  member_email: string;
  availability_status: string;
  domain_scope: Record<string, unknown> | null;
}

/* ─── useSolutionRequests ──────────────────────────────── */

export function useSolutionRequests() {
  return useQuery({
    queryKey: ["solution-requests"],
    queryFn: async () => {
      // Fetch challenges that use the Marketplace engagement model
      // First get the Marketplace model ID
      const { data: models } = await supabase
        .from("md_engagement_models")
        .select("id")
        .eq("code", "marketplace")
        .eq("is_active", true)
        .limit(1);

      const marketplaceModelId = models?.[0]?.id;

      let query = supabase
        .from("challenges")
        .select(`
          id, title, status, organization_id, engagement_model_id, created_at,
          seeker_organizations!challenges_organization_id_fkey ( organization_name )
        `)
        .eq("is_active", true)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });

      if (marketplaceModelId) {
        query = query.eq("engagement_model_id", marketplaceModelId);
      }

      const { data: challenges, error } = await query;
      if (error) throw new Error(error.message);

      // Get assignment counts for each challenge
      const challengeIds = (challenges ?? []).map((c: any) => c.id);
      let assignmentCounts: Record<string, number> = {};

      if (challengeIds.length > 0) {
        const { data: assignments } = await supabase
          .from("challenge_role_assignments")
          .select("challenge_id")
          .in("challenge_id", challengeIds)
          .eq("status", "active");

        if (assignments) {
          for (const a of assignments) {
            assignmentCounts[a.challenge_id] = (assignmentCounts[a.challenge_id] || 0) + 1;
          }
        }
      }

      return (challenges ?? []).map((c: any) => ({
        id: c.id,
        title: c.title,
        status: c.status,
        organization_id: c.organization_id,
        org_name: c.seeker_organizations?.legal_name ?? "Unknown Organization",
        engagement_model_id: c.engagement_model_id,
        created_at: c.created_at,
        assignment_count: assignmentCounts[c.id] ?? 0,
      })) as SolutionRequestRow[];
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/* ─── useChallengeAssignments ──────────────────────────── */

export function useChallengeAssignments(challengeId: string | undefined) {
  return useQuery({
    queryKey: ["challenge-assignments", challengeId],
    queryFn: async () => {
      if (!challengeId) return [];

      const { data, error } = await supabase
        .from("challenge_role_assignments")
        .select(`
          id, challenge_id, pool_member_id, role_code, status,
          assigned_at, assigned_by, reassignment_reason,
          platform_provider_pool!challenge_role_assignments_pool_member_id_fkey (
            full_name, email, availability_status, domain_scope
          )
        `)
        .eq("challenge_id", challengeId)
        .eq("status", "active")
        .order("assigned_at", { ascending: true });

      if (error) throw new Error(error.message);

      return (data ?? []).map((a: any) => ({
        id: a.id,
        challenge_id: a.challenge_id,
        pool_member_id: a.pool_member_id,
        role_code: a.role_code,
        status: a.status,
        assigned_at: a.assigned_at,
        assigned_by: a.assigned_by,
        reassignment_reason: a.reassignment_reason,
        member_name: a.platform_provider_pool?.full_name ?? "Unknown",
        member_email: a.platform_provider_pool?.email ?? "",
        availability_status: a.platform_provider_pool?.availability_status ?? "available",
        domain_scope: a.platform_provider_pool?.domain_scope ?? null,
      })) as ChallengeAssignmentRow[];
    },
    enabled: !!challengeId,
    staleTime: 1 * 60 * 1000,
  });
}

/* ─── useAllChallengeAssignments (for history page) ────── */

export function useAllChallengeAssignments() {
  return useQuery({
    queryKey: ["all-challenge-assignments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenge_role_assignments")
        .select(`
          id, challenge_id, pool_member_id, role_code, status,
          assigned_at, assigned_by, reassignment_reason,
          platform_provider_pool!challenge_role_assignments_pool_member_id_fkey (
            full_name, email, availability_status, domain_scope
          )
        `)
        .eq("status", "active")
        .order("assigned_at", { ascending: false });

      if (error) throw new Error(error.message);

      return (data ?? []).map((a: any) => ({
        id: a.id,
        challenge_id: a.challenge_id,
        pool_member_id: a.pool_member_id,
        role_code: a.role_code,
        status: a.status,
        assigned_at: a.assigned_at,
        assigned_by: a.assigned_by,
        reassignment_reason: a.reassignment_reason,
        member_name: a.platform_provider_pool?.full_name ?? "Unknown",
        member_email: a.platform_provider_pool?.email ?? "",
        availability_status: a.platform_provider_pool?.availability_status ?? "available",
        domain_scope: a.platform_provider_pool?.domain_scope ?? null,
      })) as ChallengeAssignmentRow[];
    },
    staleTime: 2 * 60 * 1000,
  });
}

/* ─── useReassignMember ────────────────────────────────── */

export function useReassignMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      assignmentId,
      newPoolMemberId,
      roleCode,
      challengeId,
      reason,
    }: {
      assignmentId: string;
      newPoolMemberId: string;
      roleCode: string;
      challengeId: string;
      reason: string;
    }) => {
      // 1. Mark old assignment as reassigned
      const auditUpdate = await withUpdatedBy({ status: "reassigned", reassignment_reason: reason });
      const { error: updateErr } = await supabase
        .from("challenge_role_assignments")
        .update(auditUpdate as any)
        .eq("id", assignmentId);
      if (updateErr) throw new Error(updateErr.message);

      // 2. Insert new active assignment
      const newAssignment = await withCreatedBy({
        challenge_id: challengeId,
        pool_member_id: newPoolMemberId,
        role_code: roleCode,
        status: "active",
        assigned_at: new Date().toISOString(),
        replaced_by: null,
      });
      const { error: insertErr } = await supabase
        .from("challenge_role_assignments")
        .insert(newAssignment as any);
      if (insertErr) throw new Error(insertErr.message);

      // 3. Update replaced_by on old assignment
      await supabase
        .from("challenge_role_assignments")
        .update({ replaced_by: assignmentId } as any)
        .eq("id", assignmentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["challenge-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["all-challenge-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["solution-requests"] });
      queryClient.invalidateQueries({ queryKey: ["pool-members"] });
      toast.success("Team member reassigned successfully.");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: "reassign_challenge_member" });
    },
  });
}
