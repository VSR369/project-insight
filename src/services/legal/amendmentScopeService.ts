/**
 * amendmentScopeService — Phase 9 v4 — Prompt 4
 *
 * Pure functions that classify amendment scope and answer two questions
 * downstream callers (useInitiateAmendment, useApproveAmendment, the
 * notification router) need to make routing decisions:
 *
 *   1. Which canonical scope buckets does this amendment touch?
 *      → normalizeScopes(rawScopes)
 *
 *   2. Which signatory roles must re-sign / re-accept as a result?
 *      → resolveSignatoryMatrix(canonicalScopes)
 *
 *   3. Which lifecycle event_types should be fanned out to which
 *      recipients?
 *      → resolveAmendmentRoutingEvents(canonicalScopes)
 *
 * Mirrors the SQL helper public.amendment_scope_normalize and the
 * notification_routing rows seeded by the Prompt 4 migration.
 */

/* ─── Canonical scopes ───────────────────────────────────────────── */

export const CANONICAL_SCOPES = [
  'LEGAL',
  'FINANCIAL',
  'ESCROW',
  'EDITORIAL',
  'SCOPE_CHANGE',
  'GOVERNANCE_CHANGE',
  'OTHER',
] as const;

export type CanonicalScope = (typeof CANONICAL_SCOPES)[number];

/* ─── Signatory roles ────────────────────────────────────────────── */

export const SIGNATORY_ROLES = ['LC', 'FC', 'CR', 'SP'] as const;
export type SignatoryRole = (typeof SIGNATORY_ROLES)[number];

/* ─── Routed-event types (must match notification_routing seed) ──── */

export const AMENDMENT_ROUTED_EVENTS = [
  'AMENDMENT_APPROVED_LEGAL',
  'AMENDMENT_APPROVED_FINANCIAL',
  'AMENDMENT_APPROVED_GOVERNANCE_ESCALATION',
  'AMENDMENT_REACCEPT_REQUIRED',
] as const;

export type AmendmentRoutedEvent = (typeof AMENDMENT_ROUTED_EVENTS)[number];

/* ─── Normalization ──────────────────────────────────────────────── */

const SCOPE_ALIAS_MAP: Record<string, CanonicalScope> = {
  LEGAL: 'LEGAL',
  LEGAL_TERMS: 'LEGAL',
  'LEGAL TERMS': 'LEGAL',
  FINANCIAL: 'FINANCIAL',
  FINANCE: 'FINANCIAL',
  PRICING: 'FINANCIAL',
  REWARD: 'FINANCIAL',
  ESCROW: 'ESCROW',
  ESCROW_TERMS: 'ESCROW',
  FUNDING: 'ESCROW',
  EDITORIAL: 'EDITORIAL',
  COPY: 'EDITORIAL',
  TYPO: 'EDITORIAL',
  CLARIFICATION: 'EDITORIAL',
  SCOPE_CHANGE: 'SCOPE_CHANGE',
  SCOPE: 'SCOPE_CHANGE',
  DELIVERABLES: 'SCOPE_CHANGE',
  GOVERNANCE_CHANGE: 'GOVERNANCE_CHANGE',
  GOVERNANCE_ESCALATION: 'GOVERNANCE_CHANGE',
  GOVERNANCE: 'GOVERNANCE_CHANGE',
};

/**
 * Normalize a raw scope string to its canonical bucket. Mirrors the
 * SQL public.amendment_scope_normalize so client and server agree.
 */
export function normalizeScope(raw: string | null | undefined): CanonicalScope {
  if (!raw) return 'OTHER';
  const key = raw.trim().toUpperCase();
  if (key === '') return 'OTHER';
  return SCOPE_ALIAS_MAP[key] ?? 'OTHER';
}

/**
 * Normalize an array of raw scope strings into a deduped, ordered list
 * of canonical scopes. Order follows CANONICAL_SCOPES for stability.
 */
export function normalizeScopes(rawScopes: readonly string[]): CanonicalScope[] {
  const seen = new Set<CanonicalScope>();
  rawScopes.forEach((s) => seen.add(normalizeScope(s)));
  return CANONICAL_SCOPES.filter((s) => seen.has(s));
}

/* ─── Signatory matrix ───────────────────────────────────────────── */

/**
 * For each canonical scope, the signatories that must re-sign / re-accept
 * the amended package. Pure mapping — the actual user-id resolution and
 * record creation happens in hooks.
 *
 * SOURCE OF TRUTH: §5 of docs/Legal_Module_Feature_Matrix.md (amendment matrix).
 *
 * Matrix rationale (CONTROLLED-flavored — governance-mode mask is applied
 * downstream in amendmentMatrix to derive STRUCTURED/QUICK behavior):
 *   LEGAL              → LC + FC re-sign (both signed the assembled CPA;
 *                        any clause change increments CPA version and
 *                        invalidates every prior signatory). CR re-accepts.
 *                        SP re-accepts (legal terms always solver-facing).
 *   FINANCIAL          → LC + FC re-sign (FC owns the change; LC re-signs
 *                        because the CPA version they signed is stale).
 *                        CR re-accepts. SP re-accepts (material change).
 *   ESCROW             → Same as FINANCIAL (escrow terms are version-bound
 *                        clauses of the same assembled CPA).
 *   EDITORIAL          → No signatory impact (informational only).
 *   SCOPE_CHANGE       → CR + SP re-accept (changes deliverables; FC/LC
 *                        unaffected unless paired with another scope).
 *   GOVERNANCE_CHANGE  → LC + FC + CR re-sign (mode escalation forces full
 *                        pack). SP re-accepts (assurance regime changed).
 *   OTHER              → Conservative: CR re-accepts only.
 */
const SIGNATORY_MATRIX: Record<CanonicalScope, readonly SignatoryRole[]> = {
  LEGAL: ['LC', 'FC', 'CR', 'SP'],
  FINANCIAL: ['LC', 'FC', 'CR', 'SP'],
  ESCROW: ['LC', 'FC', 'CR', 'SP'],
  EDITORIAL: [],
  SCOPE_CHANGE: ['CR', 'SP'],
  GOVERNANCE_CHANGE: ['LC', 'FC', 'CR', 'SP'],
  OTHER: ['CR'],
};

export function resolveSignatoryMatrix(scopes: readonly CanonicalScope[]): SignatoryRole[] {
  const set = new Set<SignatoryRole>();
  scopes.forEach((s) => SIGNATORY_MATRIX[s].forEach((r) => set.add(r)));
  return SIGNATORY_ROLES.filter((r) => set.has(r));
}

/* ─── Routing events ─────────────────────────────────────────────── */

/**
 * Resolve which AMENDMENT_APPROVED_* events should be fanned out via
 * sendRoutedNotification when this amendment is approved. SP fan-out
 * is handled separately (it's a per-enrollment notification, not a
 * role-routed one), so AMENDMENT_REACCEPT_REQUIRED is only emitted
 * when at least one in-flight role-side reaccept exists.
 */
export function resolveAmendmentRoutingEvents(
  scopes: readonly CanonicalScope[],
): AmendmentRoutedEvent[] {
  const events: AmendmentRoutedEvent[] = [];
  if (scopes.includes('LEGAL')) events.push('AMENDMENT_APPROVED_LEGAL');
  if (scopes.includes('FINANCIAL') || scopes.includes('ESCROW')) {
    events.push('AMENDMENT_APPROVED_FINANCIAL');
  }
  if (scopes.includes('GOVERNANCE_CHANGE')) {
    events.push('AMENDMENT_APPROVED_GOVERNANCE_ESCALATION');
  }
  return events;
}

/* ─── SP-side reacceptance gate ──────────────────────────────────── */

/**
 * Whether enrolled solvers must re-accept the package as a result of
 * this amendment. True for every material scope: LEGAL, SCOPE_CHANGE,
 * FINANCIAL, ESCROW, GOVERNANCE_CHANGE. EDITORIAL and OTHER alone do
 * not trigger SP re-accept.
 *
 * Aligned with §5 of docs/Legal_Module_Feature_Matrix.md (SP re-accept
 * column "all modes"). Aligned with isMaterialAmendment + ESCROW.
 */
export function shouldRequireSolverReacceptance(
  scopes: readonly CanonicalScope[],
): boolean {
  return (
    scopes.includes('LEGAL') ||
    scopes.includes('SCOPE_CHANGE') ||
    scopes.includes('FINANCIAL') ||
    scopes.includes('ESCROW') ||
    scopes.includes('GOVERNANCE_CHANGE')
  );
}

/**
 * Whether this amendment is "material" enough to open the 7-day
 * solver withdrawal window. Material = LEGAL, SCOPE_CHANGE, FINANCIAL,
 * ESCROW, or GOVERNANCE_CHANGE. EDITORIAL and OTHER alone are non-material.
 */
export function isMaterialAmendment(scopes: readonly CanonicalScope[]): boolean {
  return scopes.some((s) =>
    s === 'LEGAL' ||
    s === 'SCOPE_CHANGE' ||
    s === 'FINANCIAL' ||
    s === 'ESCROW' ||
    s === 'GOVERNANCE_CHANGE',
  );
}
