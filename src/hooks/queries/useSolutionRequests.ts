/**
 * CRUD hooks for Solution Requests Queue & Assignment History (MOD-02)
 * BRD Ref: BR-MP-ASSIGN-001–005, SCR-04/06/07
 * 
 * All role codes and min_required derive from md_slm_role_codes master data.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { withCreatedBy, withUpdatedBy } from "@/lib/auditFields";
import { handleMutationError } from "@/lib/errorHandler";
import type { SlmRoleCode } from "@/hooks/queries/useSlmRoleCodes";

/* ─── Types ────────────────────────────────────────────── */

export interface TeamComposition {
  roleCounts: Record<string, number>;
  total: number;
  isComplete: boolean;
  missingRoles: { role: string; displayName: string; required: number; assigned: number }[];
}

export interface SolutionRequestRow {
  id: string;
  title: string;
  status: string;
  organization_id: string;
  org_name: string;
  engagement_model_id: string | null;
  created_at: string;
  assignment_count: number;
  team: TeamComposition;
  phase_status: string | null;
  current_phase: number;
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

/* ─── Helper: compute TeamComposition from assignments ── */

export function computeTeamComposition(
  assignments: { role_code: string; pool_member_id: string }[],
  mpRoles: SlmRoleCode[]
): TeamComposition {
  // Count unique pool_member_id per role_code
  const uniquePerRole: Record<string, Set<string>> = {};
  for (const a of assignments) {
    if (!uniquePerRole[a.role_code]) uniquePerRole[a.role_code] = new Set();
    uniquePerRole[a.role_code].add(a.pool_member_id);
  }

  const roleCounts: Record<string, number> = {};
  for (const role of mpRoles) {
    roleCounts[role.code] = uniquePerRole[role.code]?.size ?? 0;
  }

  const missingRoles: TeamComposition["missingRoles"] = [];
  for (const role of mpRoles) {
    const assigned = roleCounts[role.code] ?? 0;
    if (assigned < role.min_required) {
      missingRoles.push({
        role: role.code,
        displayName: role.display_name,
        required: role.min_required,
        assigned,
      });
    }
  }

  return {
    roleCounts,
    total: Object.values(roleCounts).reduce((s, n) => s + n, 0),
    isComplete: missingRoles.length === 0,
    missingRoles,
  };
}

/* ─── useSolutionRequests ──────────────────────────────── */

export function useSolutionRequests(mpRoles: SlmRoleCode[] = []) {
  return useQuery({
    queryKey: ["solution-requests", mpRoles.map((r) => r.code)],
    queryFn: async () => {
      const [modelsRes, challengesRes] = await Promise.all([
        supabase
          .from("md_engagement_models")
          .select("id")
          .eq("code", "marketplace")
          .eq("is_active", true)
          .limit(1),
        supabase
          .from("challenges")
          .select(`
            id, title, status, organization_id, engagement_model_id, created_at, phase_status, current_phase,
            seeker_organizations!challenges_organization_id_fkey ( organization_name )
          `)
          .eq("is_active", true)
          .eq("is_deleted", false)
          .order("created_at", { ascending: false })
          .limit(200),
      ]);

      const marketplaceModelId = modelsRes.data?.[0]?.id;
      if (challengesRes.error) throw new Error(challengesRes.error.message);

      let challenges = challengesRes.data ?? [];
      if (marketplaceModelId) {
        challenges = challenges.filter((c: any) => c.engagement_model_id === marketplaceModelId);
      }

      const challengeIds = challenges.map((c: any) => c.id);

      let assignmentsByChallenge: Record<string, { role_code: string; pool_member_id: string }[]> = {};

      if (challengeIds.length > 0) {
        const { data: assignments } = await supabase
          .from("challenge_role_assignments")
          .select("challenge_id, role_code, pool_member_id")
          .in("challenge_id", challengeIds)
          .eq("status", "active")
          .limit(500);

        if (assignments) {
          for (const a of assignments) {
            if (!assignmentsByChallenge[a.challenge_id]) assignmentsByChallenge[a.challenge_id] = [];
            assignmentsByChallenge[a.challenge_id].push({ role_code: a.role_code, pool_member_id: a.pool_member_id });
          }
        }
      }

      return challenges.map((c: any) => {
        const team = computeTeamComposition(assignmentsByChallenge[c.id] ?? [], mpRoles);
        return {
          id: c.id,
          title: c.title,
          status: c.status,
          organization_id: c.organization_id,
          org_name: c.seeker_organizations?.organization_name ?? "Unknown Organization",
          engagement_model_id: c.engagement_model_id,
          created_at: c.created_at,
          assignment_count: team.total,
          team,
        };
      }) as SolutionRequestRow[];
    },
    enabled: mpRoles.length > 0,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/* ─── Shared mapping for challenge assignment rows ─────── */

function mapChallengeAssignmentRow(a: any): ChallengeAssignmentRow {
  return {
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
  };
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

      return (data ?? []).map(mapChallengeAssignmentRow) as ChallengeAssignmentRow[];
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
        .order("assigned_at", { ascending: false })
        .limit(200);

      if (error) throw new Error(error.message);

      return (data ?? []).map(mapChallengeAssignmentRow) as ChallengeAssignmentRow[];
    },
    staleTime: 2 * 60 * 1000,
  });
}

/* ─── useAssignMember (fresh slot fill) ────────────────── */

export function useAssignMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      challengeId,
      poolMemberId,
      roleCode,
    }: {
      challengeId: string;
      poolMemberId: string;
      roleCode: string;
    }) => {
      const newAssignment = await withCreatedBy({
        challenge_id: challengeId,
        pool_member_id: poolMemberId,
        role_code: roleCode,
        status: "active",
        assigned_at: new Date().toISOString(),
      });
      const { error } = await supabase
        .from("challenge_role_assignments")
        .insert(newAssignment as any);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["challenge-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["all-challenge-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["solution-requests"] });
      queryClient.invalidateQueries({ queryKey: ["pool-members"] });
      toast.success("Team member assigned successfully.");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: "assign_challenge_member" });
    },
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
