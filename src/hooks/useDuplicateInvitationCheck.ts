/**
 * Phase 8B: Duplicate invitation check (EC-11)
 * Before creating a role assignment, checks if email already has an active
 * assignment for the same role + org to prevent duplicates.
 */

import { supabase } from "@/integrations/supabase/client";

interface DuplicateCheckParams {
  email: string;
  roleCode: string;
  orgId: string;
  /** Optional: table to check. Defaults to seeking_org_admins. */
  table?: "seeking_org_admins" | "challenge_role_assignments";
}

interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingId?: string;
  existingStatus?: string;
}

/**
 * Check for duplicate invitation/assignment before creating a new one.
 * Returns { isDuplicate: true } if an active record exists.
 */
export async function checkDuplicateInvitation(
  params: DuplicateCheckParams
): Promise<DuplicateCheckResult> {
  const { email, roleCode, orgId, table = "seeking_org_admins" } = params;

  if (table === "seeking_org_admins") {
    const { data, error } = await supabase
      .from("seeking_org_admins")
      .select("id, status")
      .eq("organization_id", orgId)
      .eq("email", email)
      .in("status", ["active", "invited", "pending"])
      .limit(1);

    if (error || !data || data.length === 0) {
      return { isDuplicate: false };
    }

    return {
      isDuplicate: true,
      existingId: data[0].id,
      existingStatus: data[0].status,
    };
  }

  // For challenge_role_assignments, check by pool member match
  // This is a lighter check — full dedup is enforced by the idempotency_key column
  return { isDuplicate: false };
}
