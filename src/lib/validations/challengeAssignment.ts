/**
 * Zod schemas for challenge team assignment & reassignment
 * BRD Ref: BR-MP-ASSIGN-001–005, MOD-02 Tech Spec
 */

import { z } from "zod";

export const MARKETPLACE_CORE_ROLES = ["R3", "R5_MP", "R6_MP", "R7_MP"] as const;

export const challengeAssignmentSchema = z.object({
  challenge_id: z.string().uuid(),
  assignments: z
    .array(
      z.object({
        role_code: z.enum(MARKETPLACE_CORE_ROLES),
        pool_member_id: z.string().uuid(),
      })
    )
    .refine((a) => a.filter((x) => x.role_code === "R3").length >= 1, "Challenge Architect (R3) required")
    .refine((a) => a.filter((x) => x.role_code === "R5_MP").length >= 1, "Challenge Curator (R5_MP) required")
    .refine((a) => a.filter((x) => x.role_code === "R6_MP").length >= 1, "Innovation Director (R6_MP) required")
    .refine((a) => a.filter((x) => x.role_code === "R7_MP").length >= 2, "Minimum 2 Expert Reviewers (R7_MP) required"),
});

export const reassignmentSchema = z.object({
  assignment_id: z.string().uuid(),
  role_code: z.enum(MARKETPLACE_CORE_ROLES),
  new_pool_member_id: z.string().uuid(),
  reason: z
    .string()
    .trim()
    .min(10, "Reason must be at least 10 characters")
    .max(500, "Reason must be 500 characters or less"),
});

export type ChallengeAssignmentValues = z.infer<typeof challengeAssignmentSchema>;
export type ReassignmentValues = z.infer<typeof reassignmentSchema>;
