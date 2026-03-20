/**
 * challengeOptions.constants.ts
 *
 * Shared master-data options for Visibility and Eligibility Models.
 * Used by both the Manual Editor (wizard) and AI Spec Review.
 *
 * Simplified access model:
 *   - Eligible Solvers: Can view AND submit solutions (defined by solver_eligibility_ids)
 *   - Visible Solvers: Can only view/discover the challenge (defined by challenge_visibility)
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
  { code: 'IO', label: 'Invite Only (IO)', description: 'Only explicitly invited solvers can participate. Maximum control over solver pool.' },
  { code: 'CE', label: 'Curated Expert (CE)', description: 'Verified experts at L2+ expertise. For complex, domain-specific challenges.' },
  { code: 'OC', label: 'Open Challenge (OC)', description: 'Any solver can enroll — no restrictions. Ideal for broad innovation challenges.' },
  { code: 'DR', label: 'Direct Registered (DR)', description: 'Registered platform members with NDA acceptance. Standard for IP-sensitive challenges.' },
  { code: 'OPEN', label: 'Open (OPEN)', description: 'Broadest access — any user on the platform can discover and participate.' },
] as const;

/* ─── Lookup helpers ─────────────────────────────────── */

export function findVisibilityOption(value: string | null | undefined) {
  return VISIBILITY_OPTIONS.find((o) => o.value === value) ?? null;
}

export function findEligibilityModel(code: string | null | undefined) {
  return ELIGIBILITY_MODELS.find((m) => m.code === code) ?? null;
}
