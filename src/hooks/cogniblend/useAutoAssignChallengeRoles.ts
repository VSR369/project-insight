/**
 * useAutoAssignChallengeRoles — Taxonomy-based auto-assignment for
 * challenge roles (CR, CU, ID) from the platform_provider_pool.
 *
 * Matching hierarchy:
 *   Industry Segment (MUST match)
 *   └── Proficiency Area (optional — empty = ALL)
 *       └── Sub Domain (optional — empty = ALL)
 *           └── Speciality (optional — empty = ALL)
 *
 * Ranks by fewest current_assignments (workload balance).
 */

import { supabase } from '@/integrations/supabase/client';
import { withCreatedBy } from '@/lib/auditFields';

interface AssignmentInput {
  challengeId: string;
  roleCode: string;             // 'CR' | 'CU' | 'ID'
  industrySegmentId: string;
  proficiencyAreaIds?: string[];
  subDomainIds?: string[];
  specialityIds?: string[];
  assignedBy: string;           // user performing the action
}

interface AssignmentResult {
  poolMemberId: string;
  userId: string;
}

/**
 * Find the best-fit pool member for a given role and taxonomy context,
 * then insert into challenge_role_assignments and user_challenge_roles.
 */
export async function autoAssignChallengeRole(
  input: AssignmentInput,
): Promise<AssignmentResult | null> {
  // 1. Fetch eligible pool members with the target role code
  const { data: members, error: fetchError } = await supabase
    .from('platform_provider_pool')
    .select('id, user_id, domain_scope, current_assignments, max_concurrent')
    .eq('is_active', true)
    .in('availability_status', ['available', 'partially_available']);

  if (fetchError || !members?.length) return null;

  // 2. Filter by role_code match and capacity
  const eligible = members.filter((m: any) => {
    // Check role_codes array contains target
    const roleCodes: string[] = Array.isArray(m.role_codes)
      ? m.role_codes
      : (typeof (m as any).role_codes === 'string' ? JSON.parse((m as any).role_codes) : []);

    // Since role_codes may not be in the select, we need a different approach
    // The platform_provider_pool stores role_codes — let's check via domain_scope
    return true; // We'll do a broader query below
  });

  // Re-query with role_codes included
  const { data: fullMembers, error: fullError } = await supabase
    .from('platform_provider_pool')
    .select('id, user_id, role_codes, domain_scope, current_assignments, max_concurrent')
    .eq('is_active', true)
    .in('availability_status', ['available', 'partially_available']);

  if (fullError || !fullMembers?.length) return null;

  // 3. Score and filter candidates
  const scored = fullMembers
    .filter((m: any) => {
      // Must have the target role code
      const codes: string[] = Array.isArray(m.role_codes) ? m.role_codes : [];
      if (!codes.includes(input.roleCode)) return false;

      // Must have capacity
      if ((m.current_assignments ?? 0) >= (m.max_concurrent ?? 5)) return false;

      // Must match industry — empty array means ALL industries
      const scope: any = m.domain_scope ?? {};
      const industryIds: string[] = scope.industry_segment_ids ?? [];
      if (industryIds.length > 0 && !industryIds.includes(input.industrySegmentId)) {
        return false;
      }

      return true;
    })
    .map((m: any) => {
      const scope: any = m.domain_scope ?? {};
      let score = 0;

      // Score for proficiency match
      if (input.proficiencyAreaIds?.length) {
        const memberPAs: string[] = scope.proficiency_area_ids ?? [];
        if (memberPAs.length === 0) {
          score += 1; // ALL = matches
        } else {
          const overlap = input.proficiencyAreaIds.filter(id => memberPAs.includes(id)).length;
          score += overlap * 2;
        }
      }

      // Score for sub-domain match
      if (input.subDomainIds?.length) {
        const memberSDs: string[] = scope.sub_domain_ids ?? [];
        if (memberSDs.length === 0) {
          score += 1;
        } else {
          const overlap = input.subDomainIds.filter(id => memberSDs.includes(id)).length;
          score += overlap * 2;
        }
      }

      // Score for speciality match
      if (input.specialityIds?.length) {
        const memberSpecs: string[] = scope.speciality_ids ?? [];
        if (memberSpecs.length === 0) {
          score += 1;
        } else {
          const overlap = input.specialityIds.filter(id => memberSpecs.includes(id)).length;
          score += overlap * 2;
        }
      }

      return {
        ...m,
        matchScore: score,
        workload: m.current_assignments ?? 0,
      };
    })
    // Sort: highest match score first, then lowest workload
    .sort((a: any, b: any) => {
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      return a.workload - b.workload;
    });

  if (scored.length === 0) return null;

  const winner = scored[0];

  // 4. Insert into challenge_role_assignments
  const assignmentData = await withCreatedBy({
    challenge_id: input.challengeId,
    pool_member_id: winner.id,
    role_code: input.roleCode,
    assigned_by: input.assignedBy,
    assigned_at: new Date().toISOString(),
    status: 'ACTIVE',
    assignment_phase: (input.roleCode === 'CR' || input.roleCode === 'CA') ? 'PHASE_2' : input.roleCode === 'CU' ? 'PHASE_3' : 'PHASE_4',
  });

  const { error: assignError } = await supabase
    .from('challenge_role_assignments')
    .insert(assignmentData as any);

  if (assignError) {
    console.error('Auto-assign: assignment insert failed', assignError.message);
    return null;
  }

  // 5. Insert into user_challenge_roles for permission/notification routing
  const roleData = await withCreatedBy({
    challenge_id: input.challengeId,
    user_id: winner.user_id,
    role_code: input.roleCode,
    assigned_at: new Date().toISOString(),
    is_active: true,
  });

  const { error: roleError } = await supabase
    .from('user_challenge_roles')
    .insert(roleData as any);

  if (roleError) {
    console.error('Auto-assign: user_challenge_roles insert failed', roleError.message);
  }

  // 6. Increment current_assignments
  await supabase
    .from('platform_provider_pool')
    .update({ current_assignments: (winner.current_assignments ?? 0) + 1 } as any)
    .eq('id', winner.id);

  // 7. Audit trail
  await supabase.from('audit_trail').insert({
    user_id: input.assignedBy,
    challenge_id: input.challengeId,
    action: 'ROLE_AUTO_ASSIGNED',
    method: 'SYSTEM',
    details: {
      role_code: input.roleCode,
      assigned_to_pool_member: winner.id,
      assigned_to_user: winner.user_id,
      match_score: winner.matchScore,
      industry_segment_id: input.industrySegmentId,
    },
  });

  return {
    poolMemberId: winner.id,
    userId: winner.user_id,
  };
}
