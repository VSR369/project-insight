/**
 * masterData.ts — Master data fetching for prompt injection.
 * Extracted from index.ts (Phase D2.2).
 */

/** Sections that need master data options injected into the prompt */
export const MASTER_DATA_SECTION_TABLES: Record<string, string> = {
  eligibility: "md_solver_eligibility",
  complexity: "md_challenge_complexity",
};

/** Static master data for sections that don't have DB tables */
export const STATIC_MASTER_DATA: Record<string, { code: string; label: string }[]> = {
  ip_model: [
    { code: "IP-EA", label: "Full IP Transfer (Exclusive Assignment)" },
    { code: "IP-NEL", label: "Non-Exclusive License" },
    { code: "IP-EL", label: "Exclusive License" },
    { code: "IP-JO", label: "Joint Ownership" },
    { code: "IP-SR", label: "Solution Provider Retains IP" },
  ],
  maturity_level: [
    { code: "BLUEPRINT", label: "Blueprint / Concept" },
    { code: "POC", label: "Proof of Concept" },
    { code: "PROTOTYPE", label: "Prototype" },
    { code: "PILOT", label: "Pilot" },
    { code: "PRODUCTION", label: "Production-Ready" },
  ],
  challenge_visibility: [
    { code: "public", label: "Public" },
    { code: "private", label: "Private" },
    { code: "invite_only", label: "Invite Only" },
  ],
};

/**
 * Fetch dynamic master data from DB for sections that need it.
 */
export async function fetchMasterDataOptions(
  adminClient: any,
): Promise<Record<string, { code: string; label: string }[]>> {
  const result: Record<string, { code: string; label: string }[]> = { ...STATIC_MASTER_DATA };

  // Fetch solver eligibility tiers
  const { data: eligibilityData } = await adminClient
    .from("md_solver_eligibility")
    .select("code, label")
    .eq("is_active", true)
    .order("display_order");
  if (eligibilityData?.length) {
    result.eligibility = eligibilityData.map((r: any) => ({ code: r.code, label: r.label }));
    // NOTE: visibility uses STATIC_MASTER_DATA values (public/private/invite_only),
    // NOT eligibility codes. Do NOT overwrite result.visibility here.
  }

  // Fetch complexity levels
  const { data: complexityData } = await adminClient
    .from("md_challenge_complexity")
    .select("complexity_code, complexity_label")
    .eq("is_active", true)
    .order("display_order");
  if (complexityData?.length) {
    result.complexity = complexityData.map((r: any) => ({ code: r.complexity_code, label: r.complexity_label }));
  }

  // Fetch solution types for domain_tags and solution_type sections
  const { data: solutionTypeData } = await adminClient
    .from("md_solution_types")
    .select("code, label")
    .eq("is_active", true)
    .order("display_order");
  if (solutionTypeData?.length) {
    result.solution_type = solutionTypeData.map((r: any) => ({ code: r.code, label: r.label }));
  }

  return result;
}
