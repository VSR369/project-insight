/**
 * Zod schemas for role assignment forms
 * Dynamic validation — role codes validated against fetched master data, not static enums
 */

import { z } from "zod";

/** Schema for inviting a new user to a core/challenge role */
export const roleInviteSchema = z.object({
  org_id: z.string().uuid("Invalid organization ID"),
  role_code: z.string().min(1, "Role is required"),
  user_email: z.string().email("Invalid email address").max(255),
  user_name: z.string().trim().min(1, "Full name is required").max(120, "Name must be 120 characters or less"),
  domain_tags: z.object({
    industry_id: z.string().uuid().nullable().default(null),
    sub_domain_id: z.string().uuid().nullable().default(null),
    specialty_id: z.string().uuid().nullable().default(null),
    proficiency_id: z.string().uuid().nullable().default(null),
    dept_id: z.string().uuid().nullable().default(null),
    functional_area_id: z.string().uuid().nullable().default(null),
  }).optional(),
  model_applicability: z.string().default("both"),
});

export type RoleInviteFormValues = z.infer<typeof roleInviteSchema>;

/** Schema for assigning an existing team member */
export const existingMemberAssignSchema = z.object({
  org_id: z.string().uuid("Invalid organization ID"),
  role_code: z.string().min(1, "Role is required"),
  user_id: z.string().uuid("Select a team member"),
  user_email: z.string().email(),
  user_name: z.string().optional(),
  model_applicability: z.string().default("both"),
});

export type ExistingMemberAssignFormValues = z.infer<typeof existingMemberAssignSchema>;

/** Schema for admin contact profile */
export const adminContactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().email("Invalid email address"),
  phone_intl: z.string().regex(/^\+\d{7,15}$/, "International format required (+Country Code Number)").optional().or(z.literal("")),
});

export type AdminContactFormValues = z.infer<typeof adminContactSchema>;

/** Schema for SOA own profile edit */
export const soaProfileSchema = z.object({
  full_name: z.string().trim().min(1, "Full name is required").max(120, "Name must be 120 characters or less"),
  phone: z.string().regex(/^\+\d{7,15}$/, "International format required (+Country Code Number)").optional().or(z.literal("")),
  title: z.string().trim().max(150, "Title must be 150 characters or less").optional().or(z.literal("")),
});

export type SoaProfileFormValues = z.infer<typeof soaProfileSchema>;

/** Create a dynamic validator that checks role_code against fetched valid codes */
export function createRoleCodeValidator(validCodes: string[]) {
  return z.string().refine(
    (val) => validCodes.includes(val),
    { message: "Invalid role code" }
  );
}
