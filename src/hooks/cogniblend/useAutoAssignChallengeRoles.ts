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
 * Persists via `auto_assign_challenge_role` SECURITY DEFINER RPC.
 *
 * BRD Ref: BR-MP-ASSIGN-001–005, MOD-02 Tech Spec
 */

import { supabase } from "@/integrations/supabase/client";
import { validateRoleAssignment } from "@/hooks/cogniblend/useValidateRoleAssignment";
import { getPoolCodesForGovernanceRole } from "@/constants/roleCodeMapping.constants";
import { logWarning } from "@/lib/errorHandler";

interface AssignmentInput {
  challengeId: string;
  roleCode: string;
  engagementModel?: string;
  industrySegmentId?: string;
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
  matchedSlmCode: string;
}

/** Governance role → assignment_phase mapping */
const PHASE_MAP: Record<string, string | null> = {
  CU: "curation",
  ER: "abstract_screening",
  LC: "legal_review",
  FC: "finance_review",
  CR: null,
};

/**
 * Find the best-fit pool member for a given role and taxonomy context,
 * then persist via the auto_assign_challenge_role RPC.
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

  // 5. Persist via SECURITY DEFINER RPC
  return persistViaRpc(winner, input);
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
      if (input.industrySegmentId && industryIds.length > 0 && !industryIds.includes(input.industrySegmentId)) {
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

      // Track which SLM code matched for this candidate
      const codes: string[] = Array.isArray(m.role_codes) ? m.role_codes : [];
      const matchedSlmCode = codes.find((c) => poolCodes.includes(c)) ?? poolCodes[0];

      return { ...m, matchScore: score, workload: m.current_assignments ?? 0, matchedSlmCode };
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

    // ALLOWED — use this candidate
    return candidate;
  }
  return null;
}

async function persistViaRpc(
  winner: ScoredCandidate,
  input: AssignmentInput,
): Promise<AssignmentResult | null> {
  const assignmentPhase = PHASE_MAP[input.roleCode] ?? null;

  const { data, error } = await supabase.rpc("assign_challenge_role", {
    p_challenge_id: input.challengeId,
    p_pool_member_id: winner.id,
    p_user_id: winner.user_id!,
    p_slm_role_code: winner.matchedSlmCode,
    p_governance_role_code: input.roleCode,
    p_assigned_by: input.assignedBy,
    p_assignment_phase: assignmentPhase,
  });

  if (error) {
    logWarning("Auto-assign: RPC call failed", {
      operation: "assign_challenge_role",
      additionalData: { error: error.message, challengeId: input.challengeId },
    });
    return null;
  }

  const result = data as { success: boolean; assignment_id?: string; error?: string } | null;

  if (!result?.success) {
    logWarning("Auto-assign: RPC returned failure", {
      operation: "assign_challenge_role",
      additionalData: { rpcError: result?.error, challengeId: input.challengeId },
    });
    return null;
  }

  return { poolMemberId: winner.id, userId: winner.user_id! };
}
