/**
 * Zod validation schema for Pool Member form (SCR-02)
 * BRD Ref: BR-PP-004 — mandatory industry segments via domain_scope
 * 
 * Role codes are fetched from md_slm_role_codes master data table.
 * No hardcoded role codes or labels — all driven by DB.
 */

import { z } from "zod";
import type { DomainScope } from "@/hooks/queries/useDelegatedAdmins";

export const domainScopeSchema = z.object({
  industry_segment_ids: z.array(z.string().uuid()), // empty = ALL industries
  proficiency_area_ids: z
    .array(z.string().uuid())
    .min(1, "At least one proficiency area is required"), // BR-PP-004
  sub_domain_ids: z.array(z.string().uuid()),
  speciality_ids: z.array(z.string().uuid()),
  department_ids: z.array(z.string().uuid()),
  functional_area_ids: z.array(z.string().uuid()),
});

export const poolMemberSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(1, "Full name is required")
    .max(120, "Full name must be 120 characters or less"),
  email: z.string().trim().email("Valid email required").max(255),
  phone_country_code: z.string().optional().or(z.literal("")),
  phone_number: z.string().max(15, "Phone number too long").optional().or(z.literal("")),
  role_codes: z
    .array(z.string().min(1))
    .min(1, "At least one SLM role is required"),
  domain_scope: domainScopeSchema,
  max_concurrent: z.coerce
    .number()
    .int()
    .min(1, "Minimum 1")
    .max(20, "Max 20 concurrent challenges"),
});

export interface PoolMemberFormValues {
  full_name: string;
  email: string;
  phone_country_code?: string;
  phone_number?: string;
  role_codes: string[];
  domain_scope: DomainScope;
  max_concurrent: number;
}
