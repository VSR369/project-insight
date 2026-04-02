/**
 * useAutoAssignChallengeRoles — Taxonomy-based auto-assignment for
 * challenge roles (CU, ER, etc.) from the platform_provider_pool.
 *
 * Matching hierarchy:
 *   Industry Segment (MUST match)
 *   └── Proficiency Area (optional — empty = ALL)
 *       └── Sub Domain (optional — empty = ALL)
 *           └── Speciality (optional — empty = ALL)
 *
 * Ranks by highest taxonomy match score, then lowest workload.
 *
 * BRD Ref: BR-MP-ASSIGN-001–005, MOD-02 Tech Spec
 */

import { supabase } from "@/integrations/supabase/client";
import { withCreatedBy } from "@/lib/auditFields";
import { validateRoleAssignment } from "@/hooks/cogniblend/useValidateRoleAssignment";
import { getPoolCodesForGovernanceRole } from "@/constants/roleCodeMapping.constants";
import { logWarning } from "@/lib/errorHandler";

interface AssignmentInput {
  challengeId: string;
  roleCode: string;
  engagementModel?: string;
  industrySegmentId: string;
  proficiencyAreaIds?: string[];
  subDomainIds?: string[];
  specialityIds?: string[];
  assignedBy: string;
}

interface AssignmentResult {
  poolMemberId: string;
  userId: string;
}

interface PoolRow {
  id: string;
  user_id: string | null;
  role_codes: string[];
  domain_scope: {
    industry_segment_ids?: string[];
    proficiency_area_ids?: string[];
    sub_domain_ids?: string[];
    speciality_ids?: string[];
  } | null;
  current_assignments: number;
  max_concurrent: number;
}

interface ScoredCandidate extends PoolRow {
  matchScore: number;
  workload: number;
}

/**
 * Find the best-fit pool member for a given role and taxonomy context,
 * then insert into challenge_role_assignments and user_challenge_roles.
 */
export async function autoAssignChallengeRole(
  input: AssignmentInput,
): Promise<AssignmentResult | null> {
  // 1. Resolve governance code → SLM pool codes
  let poolCodes = getPoolCodesForGovernanceRole(input.roleCode, input.engagementModel);

  // 2. Single query for eligible pool members
  const { data: members, error: fetchError } = await supabase
    .from("platform_provider_pool")
    .select("id, user_id, role_codes, domain_scope, current_assignments, max_concurrent")
    .eq("is_active", true)
    .in("availability_status", ["available", "partially_available"]);

  if (fetchError || !members?.length) return null;

  // 3. Filter and score candidates
  let candidates = filterAndScore(members as unknown as PoolRow[], poolCodes, input);

  // Fallback: if model-specific filtering yielded zero, try all-model codes
  if (candidates.length === 0 && input.engagementModel) {
    const allCodes = getPoolCodesForGovernanceRole(input.roleCode);
    if (allCodes.length !== poolCodes.length) {
      poolCodes = allCodes;
      candidates = filterAndScore(members as unknown as PoolRow[], poolCodes, input);
    }
  }

  if (candidates.length === 0) return null;

  // 4. Validate against role fusion rules
  const winner = await findValidCandidate(candidates, input);
  if (!winner) return null;

  // 5. Persist assignment
  return persistAssignment(winner, input);
}

function filterAndScore(
  members: PoolRow[],
  poolCodes: string[],
  input: AssignmentInput,
): ScoredCandidate[] {
  return members
    .filter((m) => {
      const codes: string[] = Array.isArray(m.role_codes) ? m.role_codes : [];
      if (!codes.some((c) => poolCodes.includes(c))) return false;
      if (!m.user_id) return false;
      if ((m.current_assignments ?? 0) >= (m.max_concurrent ?? 5)) return false;

      const scope = m.domain_scope ?? {};
      const industryIds: string[] = scope.industry_segment_ids ?? [];
      if (industryIds.length > 0 && !industryIds.includes(input.industrySegmentId)) {
        return false;
      }
      return true;
    })
    .map((m) => {
      const scope = m.domain_scope ?? {};
      let score = 0;

      if (input.proficiencyAreaIds?.length) {
        const memberPAs: string[] = scope.proficiency_area_ids ?? [];
        score += memberPAs.length === 0
          ? 1
          : input.proficiencyAreaIds.filter((id) => memberPAs.includes(id)).length * 2;
      }
      if (input.subDomainIds?.length) {
        const memberSDs: string[] = scope.sub_domain_ids ?? [];
        score += memberSDs.length === 0
          ? 1
          : input.subDomainIds.filter((id) => memberSDs.includes(id)).length * 2;
      }
      if (input.specialityIds?.length) {
        const memberSpecs: string[] = scope.speciality_ids ?? [];
        score += memberSpecs.length === 0
          ? 1
          : input.specialityIds.filter((id) => memberSpecs.includes(id)).length * 2;
      }

      return { ...m, matchScore: score, workload: m.current_assignments ?? 0 };
    })
    .sort((a, b) => b.matchScore !== a.matchScore
      ? b.matchScore - a.matchScore
      : a.workload - b.workload,
    );
}

async function findValidCandidate(
  candidates: ScoredCandidate[],
  input: AssignmentInput,
): Promise<ScoredCandidate | null> {
  for (const candidate of candidates) {
    const conflict = await validateRoleAssignment({
      userId: candidate.user_id!,
      challengeId: input.challengeId,
      newRole: input.roleCode,
    });

    if (conflict.conflictType === "HARD_BLOCK") continue;

    if (conflict.conflictType === "SOFT_WARN") {
      await supabase.from("audit_trail").insert({
        user_id: input.assignedBy,
        challenge_id: input.challengeId,
        action: "ROLE_CONFLICT_OVERRIDE",
        method: "SYSTEM",
        details: {
          role_code: input.roleCode,
          candidate_user: candidate.user_id,
          candidate_pool_member: candidate.id,
          conflict_message: conflict.message,
          auto_assigned: true,
        },
      });
    }

    return candidate;
  }
  return null;
}

async function persistAssignment(
  winner: ScoredCandidate,
  input: AssignmentInput,
): Promise<AssignmentResult | null> {
  const phaseMap: Record<string, string> = {
    CU: "PHASE_3", CR: "PHASE_2", ER: "PHASE_4", LC: "PHASE_4", FC: "PHASE_4",
  };

  const assignmentData = await withCreatedBy({
    challenge_id: input.challengeId,
    pool_member_id: winner.id,
    role_code: input.roleCode,
    assigned_by: input.assignedBy,
    assigned_at: new Date().toISOString(),
    status: "ACTIVE",
    assignment_phase: phaseMap[input.roleCode] ?? "PHASE_4",
  });

  const { error: assignError } = await supabase
    .from("challenge_role_assignments")
    .insert([assignmentData] as unknown as Record<string, unknown>[]);

  if (assignError) {
    logWarning("Auto-assign: assignment insert failed", {
      operation: "auto_assign_challenge_role",
      additionalData: { error: assignError.message, challengeId: input.challengeId },
    });
    return null;
  }

  // Insert into user_challenge_roles (uses governance code, not SLM code)
  const roleData = await withCreatedBy({
    challenge_id: input.challengeId,
    user_id: winner.user_id,
    role_code: input.roleCode,
    assigned_at: new Date().toISOString(),
    is_active: true,
  });

  const { error: roleError } = await supabase
    .from("user_challenge_roles")
    .insert([roleData] as unknown as Record<string, unknown>[]);

  if (roleError) {
    logWarning("Auto-assign: user_challenge_roles insert failed", {
      operation: "auto_assign_challenge_role",
      additionalData: { error: roleError.message, challengeId: input.challengeId },
    });
  }

  // Increment current_assignments
  await supabase
    .from("platform_provider_pool")
    .update({ current_assignments: (winner.current_assignments ?? 0) + 1 } as Record<string, unknown>)
    .eq("id", winner.id);

  // Audit trail
  await supabase.from("audit_trail").insert({
    user_id: input.assignedBy,
    challenge_id: input.challengeId,
    action: "ROLE_AUTO_ASSIGNED",
    method: "SYSTEM",
    details: {
      role_code: input.roleCode,
      engagement_model: input.engagementModel,
      assigned_to_pool_member: winner.id,
      assigned_to_user: winner.user_id,
      match_score: winner.matchScore,
      industry_segment_id: input.industrySegmentId,
    },
  });

  return { poolMemberId: winner.id, userId: winner.user_id! };
}
