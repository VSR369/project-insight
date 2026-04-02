/**
 * Governance-to-SLM role code mapping for platform_provider_pool.
 *
 * Pool members store SLM codes (R5_MP, R7_AGG, etc.) but the governance
 * layer uses shorthand codes (CU, ER, LC, FC, CR). This mapping bridges
 * the two systems for auto-assignment and admin filtering.
 *
 * BRD Ref: MOD-01 Resource Pool, MOD-02 Challenge Staffing
 */

interface RoleMapping {
  mp: string[];
  agg: string[];
  both: string[];
}

const GOVERNANCE_TO_SLM: Record<string, RoleMapping> = {
  CR: { mp: ["R3"], agg: ["R4", "R10_CR"], both: [] },
  CU: { mp: ["R5_MP"], agg: ["R5_AGG"], both: [] },
  ER: { mp: ["R7_MP"], agg: ["R7_AGG"], both: [] },
  LC: { mp: [], agg: [], both: ["R9"] },
  FC: { mp: [], agg: [], both: ["R8"] },
};

/**
 * Convert a governance shorthand code to the SLM pool codes used in
 * platform_provider_pool.role_codes.
 *
 * @param govCode - Governance role code (CU, ER, LC, FC, CR)
 * @param engagementModel - Optional: 'marketplace' or 'aggregator'.
 *   When provided, returns model-specific codes first. Falls back to
 *   all codes if no model-specific codes exist.
 * @returns Array of SLM codes to match against pool member role_codes.
 */
export function getPoolCodesForGovernanceRole(
  govCode: string,
  engagementModel?: string,
): string[] {
  const mapping = GOVERNANCE_TO_SLM[govCode];
  if (!mapping) return [govCode]; // Unknown code — pass through as-is

  const allCodes = [...mapping.mp, ...mapping.agg, ...mapping.both];

  if (!engagementModel) return allCodes;

  const modelKey = engagementModel === "marketplace" ? "mp" : "agg";
  const modelSpecific = [...mapping[modelKey], ...mapping.both];

  // If model-specific codes exist, prefer them; otherwise fall back to all
  return modelSpecific.length > 0 ? modelSpecific : allCodes;
}
