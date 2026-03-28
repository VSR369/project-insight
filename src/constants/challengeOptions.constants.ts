/**
 * challengeOptions.constants.ts
 *
 * Shared master-data options for Visibility and Eligibility Models.
 * Used by both the Manual Editor (wizard) and AI Spec Review.
 *
 * Simplified access model:
 *   - Eligible Solvers: Can view AND submit solutions (defined by solver_eligibility_ids)
 *   - Visible Solvers: Can only view/discover the challenge (defined by visibility section)
 */

export interface TierOption {
  value: string;
  label: string;
  description: string;
}

export interface EligibilityModelOption {
  code: string;
  label: string;
  description: string;
}

/* ─── Visibility ─────────────────────────────────────── */

export const VISIBILITY_OPTIONS: readonly TierOption[] = [
  { value: 'public', label: 'Public', description: 'Visible to everyone on the platform and search engines' },
  { value: 'registered_users', label: 'Registered Users', description: 'Visible only to authenticated platform users' },
  { value: 'platform_members', label: 'Platform Members', description: 'Visible only to users with active memberships' },
  { value: 'curated_experts', label: 'Curated Experts', description: 'Visible only to experts curated by the platform' },
  { value: 'invited_only', label: 'Invited Only', description: 'Visible only to specifically invited participants' },
] as const;

/* ─── Eligibility Models ─────────────────────────────── */

export const ELIGIBILITY_MODELS: readonly EligibilityModelOption[] = [
  { code: 'certified_basic', label: 'Certified Basic', description: 'Entry-level certified solvers. Minimum verified competency.' },
  { code: 'certified_competent', label: 'Certified Competent', description: 'Mid-level certified solvers with demonstrated domain expertise.' },
  { code: 'certified_expert', label: 'Certified Expert', description: 'Top-tier certified experts. For complex, IP-sensitive challenges.' },
  { code: 'registered', label: 'Registered', description: 'Registered platform members with identity verification. Standard eligibility.' },
  { code: 'expert_invitee', label: 'Expert (Invitee)', description: 'Experts specifically invited by the challenge creator or platform.' },
  { code: 'signed_in', label: 'Signed In', description: 'Any authenticated user on the platform can participate.' },
  { code: 'open_community', label: 'Open Community', description: 'Open to the broader community — minimal barriers to entry.' },
  { code: 'hybrid', label: 'Hybrid', description: 'Broadest access — certified experts get priority + open community can also submit.' },
] as const;

/* ─── Lookup helpers ─────────────────────────────────── */

export function findVisibilityOption(value: string | null | undefined) {
  return VISIBILITY_OPTIONS.find((o) => o.value === value) ?? null;
}

export function findEligibilityModel(code: string | null | undefined) {
  return ELIGIBILITY_MODELS.find((m) => m.code === code) ?? null;
}
