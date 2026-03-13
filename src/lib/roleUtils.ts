/**
 * Shared role management utilities — used by both Marketplace (Platform Admin)
 * and Aggregator (Seeking Org Admin) portals.
 * Eliminates duplicated getRoleLabel / deduplicateMembers logic across 10+ files.
 */

import type { SlmRoleCode } from "@/hooks/queries/useSlmRoleCodes";

/**
 * Resolve a role code to its display name from master data.
 * Falls back to the raw code if not found.
 */
export function getRoleLabel(
  roleCodes: SlmRoleCode[] | undefined | null,
  code: string
): string {
  const found = roleCodes?.find((r) => r.code === code);
  return found?.display_name ?? code;
}

/**
 * Resolve a role code to "Display Name (CODE)" format.
 * Used in forms and modals where both name and code should be visible.
 */
export function getRoleDisplayLabel(
  roleCodes: SlmRoleCode[] | undefined | null,
  code: string
): string {
  const found = roleCodes?.find((r) => r.code === code);
  return found ? `${found.display_name} (${code})` : code;
}

/**
 * Deduplicated member record built from role assignments.
 */
export interface DeduplicatedMember {
  email: string;
  name: string | null;
  roles: { code: string; status: string }[];
}

/**
 * Build a deduplicated list of team members from role assignments.
 * Filters to active/invited status and groups by email.
 * Used by AssignRoleSheet and MsmeQuickAssignModal.
 */
export function deduplicateMembers(
  assignments: { user_email: string; user_name: string | null; role_code: string; status: string }[] | undefined | null
): DeduplicatedMember[] {
  if (!assignments) return [];

  const memberMap = new Map<string, DeduplicatedMember>();

  for (const a of assignments) {
    if (a.status !== "active" && a.status !== "invited") continue;
    const existing = memberMap.get(a.user_email);
    if (existing) {
      if (!existing.roles.some((r) => r.code === a.role_code)) {
        existing.roles.push({ code: a.role_code, status: a.status });
      }
    } else {
      memberMap.set(a.user_email, {
        email: a.user_email,
        name: a.user_name,
        roles: [{ code: a.role_code, status: a.status }],
      });
    }
  }

  return Array.from(memberMap.values());
}
