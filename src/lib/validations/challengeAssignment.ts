/**
 * Zod schemas for challenge team assignment & reassignment
 * BRD Ref: BR-MP-ASSIGN-001–005, MOD-02 Tech Spec
 * 
 * IMPORTANT: Role codes and min_required are validated dynamically
 * using master data from md_slm_role_codes. No hardcoded role arrays.
 */

import { z } from "zod";
import type { SlmRoleCode } from "@/hooks/queries/useSlmRoleCodes";

/**
 * Creates a dynamic challenge assignment schema using live master data.
 * Validates that all required marketplace roles meet their min_required counts.
 */
export function createChallengeAssignmentSchema(mpRoles: SlmRoleCode[]) {
  return z.object({
    challenge_id: z.string().uuid(),
    assignments: z
      .array(
        z.object({
          role_code: z.string(),
          pool_member_id: z.string().uuid(),
        })
      )
      .refine(
        (assignments) => {
          // Validate each role meets its min_required from master data
          for (const role of mpRoles) {
            const count = assignments.filter((a) => a.role_code === role.code).length;
            if (count < role.min_required) return false;
          }
          return true;
        },
        (assignments) => {
          // Build descriptive error message from master data
          const missing = mpRoles
            .filter((role) => {
              const count = assignments.filter((a) => a.role_code === role.code).length;
              return count < role.min_required;
            })
            .map((role) => `${role.display_name} (${role.code}): min ${role.min_required}`)
            .join(", ");
          return { message: `Missing required roles: ${missing}` };
        }
      ),
  });
}

export const reassignmentSchema = z.object({
  assignment_id: z.string().uuid(),
  role_code: z.string(),
  new_pool_member_id: z.string().uuid(),
  reason: z
    .string()
    .trim()
    .min(10, "Reason must be at least 10 characters")
    .max(500, "Reason must be 500 characters or less"),
});

export type ReassignmentValues = z.infer<typeof reassignmentSchema>;
