/**
 * legalVariableContract — Single registry of every {{variable}} that legal
 * templates may reference. The client preview interpolator and the server
 * `assemble_cpa` / `assemble_role_doc` SQL functions both bind to this list.
 *
 * Adding a variable here is the contract step. Implementation:
 *  1. Add the key + human label below.
 *  2. Resolve a server value inside the matching SQL assembler.
 *  3. Resolve a client value inside `cpaPreviewInterpolator.buildPreviewVariables`.
 *
 * Without all three, the preview/assembly will show `[Not set: …]` chips.
 */

export interface LegalVariable {
  /** {{snake_case_key}} as used inside template content */
  key: string;
  /** Human label shown in completeness reports and "Not set" chips */
  label: string;
  /** Source of truth — informational only */
  source:
    | 'challenge'
    | 'seeker_organization'
    | 'industry_pack'
    | 'geography'
    | 'user'
    | 'computed'
    | 'platform';
  /** Which document codes this variable is expected in */
  appliesTo: ReadonlyArray<'SPA' | 'SKPA' | 'PWA' | 'CPA'>;
}

export const LEGAL_VARIABLES: ReadonlyArray<LegalVariable> = [
  // ── Challenge fields ─────────────────────────────────────────────────────
  { key: 'challenge_title', label: 'Challenge title', source: 'challenge', appliesTo: ['CPA'] },
  { key: 'problem_statement', label: 'Problem statement', source: 'challenge', appliesTo: ['CPA'] },
  { key: 'scope', label: 'Scope', source: 'challenge', appliesTo: ['CPA'] },
  { key: 'ip_model', label: 'IP model', source: 'challenge', appliesTo: ['CPA'] },
  { key: 'ip_clause', label: 'IP clause', source: 'computed', appliesTo: ['CPA'] },
  { key: 'governance_mode', label: 'Governance mode', source: 'challenge', appliesTo: ['CPA'] },
  { key: 'operating_model', label: 'Operating model', source: 'challenge', appliesTo: ['CPA'] },
  { key: 'prize_amount', label: 'Prize amount', source: 'challenge', appliesTo: ['CPA'] },
  { key: 'total_fee', label: 'Total fee', source: 'challenge', appliesTo: ['CPA'] },
  { key: 'currency', label: 'Currency', source: 'challenge', appliesTo: ['CPA'] },
  { key: 'evaluation_method', label: 'Evaluation method', source: 'challenge', appliesTo: ['CPA'] },
  { key: 'solver_audience', label: 'Solver audience', source: 'challenge', appliesTo: ['CPA'] },
  { key: 'submission_deadline', label: 'Submission deadline', source: 'challenge', appliesTo: ['CPA'] },
  { key: 'escrow_terms', label: 'Escrow terms', source: 'computed', appliesTo: ['CPA'] },
  { key: 'anti_disintermediation', label: 'Anti-disintermediation clause', source: 'computed', appliesTo: ['CPA'] },

  // ── Seeker organization fields ───────────────────────────────────────────
  { key: 'seeker_org_name', label: 'Seeking organization name', source: 'seeker_organization', appliesTo: ['SPA', 'SKPA', 'PWA', 'CPA'] },
  { key: 'seeker_legal_entity', label: 'Seeking organization legal entity', source: 'seeker_organization', appliesTo: ['SKPA', 'PWA', 'CPA'] },
  { key: 'seeker_org_address', label: 'Seeking organization registered address', source: 'seeker_organization', appliesTo: ['SKPA', 'PWA', 'CPA'] },
  { key: 'seeker_website', label: 'Seeking organization website', source: 'seeker_organization', appliesTo: ['SKPA', 'CPA'] },
  { key: 'seeker_country', label: 'Seeking organization country', source: 'seeker_organization', appliesTo: ['SKPA', 'PWA', 'CPA'] },
  { key: 'seeker_industry', label: 'Seeking organization industry', source: 'seeker_organization', appliesTo: ['SKPA', 'CPA'] },
  { key: 'seeker_registration_number', label: 'Seeking organization registration number', source: 'seeker_organization', appliesTo: ['SKPA', 'CPA'] },

  // ── Industry pack ────────────────────────────────────────────────────────
  { key: 'industry_name', label: 'Industry name', source: 'industry_pack', appliesTo: ['CPA'] },
  { key: 'industry_certifications', label: 'Industry certifications', source: 'industry_pack', appliesTo: ['CPA'] },
  { key: 'industry_frameworks', label: 'Industry frameworks', source: 'industry_pack', appliesTo: ['CPA'] },
  { key: 'regulatory_frameworks', label: 'Regulatory frameworks', source: 'industry_pack', appliesTo: ['CPA'] },

  // ── Geography ────────────────────────────────────────────────────────────
  { key: 'jurisdiction', label: 'Jurisdiction', source: 'geography', appliesTo: ['SPA', 'SKPA', 'PWA', 'CPA'] },
  { key: 'governing_law', label: 'Governing law', source: 'geography', appliesTo: ['SPA', 'SKPA', 'PWA', 'CPA'] },
  { key: 'data_privacy_laws', label: 'Data privacy laws', source: 'geography', appliesTo: ['SPA', 'SKPA', 'PWA', 'CPA'] },
  { key: 'dispute_resolution_venue', label: 'Dispute resolution venue', source: 'geography', appliesTo: ['SPA', 'SKPA', 'PWA', 'CPA'] },

  // ── User identity ────────────────────────────────────────────────────────
  { key: 'user_full_name', label: 'User full name', source: 'user', appliesTo: ['SPA', 'SKPA', 'PWA', 'CPA'] },
  { key: 'user_email', label: 'User email', source: 'user', appliesTo: ['SPA', 'SKPA', 'PWA', 'CPA'] },
  { key: 'user_role', label: 'User role', source: 'computed', appliesTo: ['SPA', 'SKPA', 'PWA', 'CPA'] },
  { key: 'acceptance_date', label: 'Acceptance date', source: 'computed', appliesTo: ['SPA', 'SKPA', 'PWA', 'CPA'] },

  // ── Engagement / commercial ──────────────────────────────────────────────
  { key: 'engagement_model', label: 'Engagement model', source: 'computed', appliesTo: ['SKPA', 'CPA'] },
  { key: 'escrow_required', label: 'Escrow required', source: 'computed', appliesTo: ['CPA'] },
  { key: 'payment_mode', label: 'Payment mode', source: 'computed', appliesTo: ['CPA'] },
  { key: 'installment_count', label: 'Installment count', source: 'computed', appliesTo: ['CPA'] },
  { key: 'platform_fee_pct', label: 'Platform fee percentage', source: 'computed', appliesTo: ['CPA'] },

  // ── Platform branding ────────────────────────────────────────────────────
  { key: 'platform_name', label: 'Platform name', source: 'platform', appliesTo: ['SPA', 'SKPA', 'PWA', 'CPA'] },
];

export const LEGAL_VARIABLE_LABEL_MAP: Readonly<Record<string, string>> =
  Object.freeze(
    LEGAL_VARIABLES.reduce<Record<string, string>>((acc, v) => {
      acc[v.key] = v.label;
      return acc;
    }, {}),
  );

/** Subset of variable keys that apply to a given document code. */
export function variablesForDoc(docCode: 'SPA' | 'SKPA' | 'PWA' | 'CPA'): readonly LegalVariable[] {
  return LEGAL_VARIABLES.filter((v) => v.appliesTo.includes(docCode));
}
