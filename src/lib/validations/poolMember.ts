/**
 * Zod validation schema for Pool Member form (SCR-02)
 * BRD Ref: BR-PP-004 — mandatory role + industry + proficiency
 * 
 * Role codes are fetched from md_slm_role_codes master data table.
 * No hardcoded role codes or labels — all driven by DB.
 */

import { z } from "zod";

export const poolMemberSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(1, "Full name is required")
    .max(120, "Full name must be 120 characters or less"),
  email: z.string().trim().email("Valid email required").max(255),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  role_codes: z
    .array(z.string().min(1))
    .min(1, "At least one SLM role is required"),
  industry_ids: z
    .array(z.string().uuid())
    .min(1, "At least one Industry Segment is required"),
  proficiency_id: z.string().uuid({ message: "Proficiency Level is required" }),
  max_concurrent: z.coerce
    .number()
    .int()
    .min(1, "Minimum 1")
    .max(20, "Max 20 concurrent challenges"),
});

export type PoolMemberFormValues = z.infer<typeof poolMemberSchema>;
