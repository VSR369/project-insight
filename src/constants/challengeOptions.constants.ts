/**
 * challengeOptions.constants.ts
 *
 * Shared master-data options for Visibility and Eligibility Models.
 * Used by both the Manual Editor (wizard) and AI Spec Review.
 *
 * BR-CHL-P10 (DEF-0035 / DEF-0363): the Visibility picklist has exactly
 * three options, defaulting to "Eligible certified providers".
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

/* ─── Visibility (BR-CHL-P10) ────────────────────────── */

export const VISIBILITY_ELIGIBLE_CERTIFIED = 'eligible_certified';
export const VISIBILITY_INVITE_ONLY = 'invite_only';
export const VISIBILITY_PUBLIC = 'public';

export const DEFAULT_CHALLENGE_VISIBILITY = VISIBILITY_ELIGIBLE_CERTIFIED;

export const VISIBILITY_OPTIONS: readonly TierOption[] = [
  {
    value: VISIBILITY_ELIGIBLE_CERTIFIED,
    label: 'Eligible certified providers',
    description:
      'Visible to and joinable by certified Solution Providers whose industry and level match (default)',
  },
  {
    value: VISIBILITY_INVITE_ONLY,
    label: 'Invite only',
    description: 'Visible only to Solution Providers invited by the Curator',
  },
  {
    value: VISIBILITY_PUBLIC,
    label: 'Public',
    description: 'Visible to any registered Solution Provider',
  },
] as const;

/* ─── Eligibility Models ─────────────────────────────── */

export const ELIGIBILITY_MODELS: readonly EligibilityModelOption[] = [
  { code: 'certified_basic', label: 'Certified Proven', description: 'Entry-level certified Solution Providers. Minimum verified competency.' },
  { code: 'certified_competent', label: 'Certified Acclaimed', description: 'Mid-level certified Solution Providers with demonstrated domain expertise.' },
  { code: 'certified_expert', label: 'Certified Eminent', description: 'Top-tier certified Solution Providers. For complex, IP-sensitive challenges.' },
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
