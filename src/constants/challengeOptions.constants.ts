/**
 * challengeOptions.constants.ts
 *
 * Shared master-data options for Visibility, Enrollment, Submission,
 * and Eligibility Models. Used by both the Manual Editor (wizard) and
 * AI Spec Review to ensure consistent option sets.
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

/* ─── Enrollment ─────────────────────────────────────── */

export const ENROLLMENT_OPTIONS: readonly TierOption[] = [
  { value: 'open_auto', label: 'Open Enrollment (auto-approved)', description: 'Anyone eligible can enroll without approval' },
  { value: 'curator_approved', label: 'Curator-Approved Enrollment', description: 'Curator reviews and approves enrollment requests' },
  { value: 'direct_nda', label: 'Direct Registration (NDA required)', description: 'Enrollment requires signing an NDA first' },
  { value: 'org_curated', label: 'Organization-Curated', description: 'The seeking organization selects who can enroll' },
  { value: 'invitation_only', label: 'Invitation Only', description: 'Only specifically invited solvers can enroll' },
] as const;

/* ─── Submission ─────────────────────────────────────── */

export const SUBMISSION_OPTIONS: readonly TierOption[] = [
  { value: 'all_enrolled', label: 'All Enrolled', description: 'Any enrolled participant can submit solutions' },
  { value: 'shortlisted_only', label: 'Shortlisted Only', description: 'Only shortlisted participants can submit' },
  { value: 'invited_solvers', label: 'Invited Solvers Only', description: 'Only specifically invited solvers can submit' },
] as const;

/* ─── Eligibility Models ─────────────────────────────── */

export const ELIGIBILITY_MODELS: readonly EligibilityModelOption[] = [
  { code: 'OC', label: 'Open Challenge (OC)', description: 'Any solver can enroll — no restrictions. Ideal for broad innovation challenges.' },
  { code: 'DR', label: 'Direct Registered (DR)', description: 'Registered platform members with NDA acceptance. Standard for IP-sensitive challenges.' },
  { code: 'CE', label: 'Curated Expert (CE)', description: 'Verified experts at L2+ expertise. For complex, domain-specific challenges.' },
  { code: 'IO', label: 'Invite Only (IO)', description: 'Only explicitly invited solvers can participate. Maximum control over solver pool.' },
  { code: 'HY', label: 'Hybrid (HY)', description: 'Combines multiple models — e.g., CE for evaluation, OC for submission. Contact admin to configure.' },
] as const;

/* ─── Lookup helpers ─────────────────────────────────── */

export function findVisibilityOption(value: string | null | undefined) {
  return VISIBILITY_OPTIONS.find((o) => o.value === value) ?? null;
}

export function findEnrollmentOption(value: string | null | undefined) {
  return ENROLLMENT_OPTIONS.find((o) => o.value === value) ?? null;
}

export function findSubmissionOption(value: string | null | undefined) {
  return SUBMISSION_OPTIONS.find((o) => o.value === value) ?? null;
}

export function findEligibilityModel(code: string | null | undefined) {
  return ELIGIBILITY_MODELS.find((m) => m.code === code) ?? null;
}
