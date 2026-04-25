/**
 * Master registry of legal-template variables, indexed by document code.
 *
 * Documentation-only — drives the variable-reference UI in Org Settings →
 * Legal Templates. The actual interpolation lives in
 * `src/services/legal/cpaPreviewInterpolator.ts` (server-mirrored).
 */

export interface TemplateVariable {
  name: string;
  description: string;
}

export type LegalDocCode =
  | 'SPA'
  | 'SKPA'
  | 'PWA'
  | 'CPA_QUICK'
  | 'CPA_STRUCTURED'
  | 'CPA_CONTROLLED';

const CHALLENGE_VARS: TemplateVariable[] = [
  { name: 'challenge_title', description: 'Title of the challenge' },
  { name: 'problem_statement', description: 'Problem statement' },
  { name: 'scope', description: 'Scope of work' },
  { name: 'ip_clause', description: 'IP clause text (server-resolved from ip_model)' },
  { name: 'ip_model', description: 'IP model code' },
  { name: 'governance_mode', description: 'QUICK / STRUCTURED / CONTROLLED' },
  { name: 'prize_amount', description: 'Prize amount (numeric)' },
  { name: 'total_fee', description: 'Alias for prize_amount' },
  { name: 'currency', description: 'Currency code' },
  { name: 'submission_deadline', description: 'Submission deadline' },
  { name: 'evaluation_method', description: 'Evaluation method (with evaluator count)' },
  { name: 'solver_audience', description: 'ALL / INTERNAL / EXTERNAL' },
];

const ORG_VARS: TemplateVariable[] = [
  { name: 'seeker_org_name', description: 'Organization name' },
  { name: 'seeker_legal_entity', description: 'Legal entity name' },
  { name: 'seeker_country', description: 'Headquarters country' },
  { name: 'seeker_industry', description: 'Industry segment' },
];

const GEO_VARS: TemplateVariable[] = [
  { name: 'jurisdiction', description: 'Resolved jurisdiction' },
  { name: 'governing_law', description: 'Governing law' },
  { name: 'data_privacy_laws', description: 'Applicable data-privacy laws' },
  { name: 'regulatory_frameworks', description: 'Industry regulatory frameworks' },
];

const INDUSTRY_VARS: TemplateVariable[] = [
  { name: 'industry_name', description: 'Industry pack name' },
  { name: 'industry_certifications', description: 'Common certifications' },
  { name: 'industry_frameworks', description: 'Common frameworks' },
];

const USER_VARS: TemplateVariable[] = [
  { name: 'user_full_name', description: 'Acceptor full name' },
  { name: 'user_email', description: 'Acceptor email' },
  { name: 'user_role', description: 'Role being accepted' },
  { name: 'acceptance_date', description: 'Acceptance date' },
];

const ESCROW_VARS: TemplateVariable[] = [
  { name: 'escrow_terms', description: 'Escrow clause (CONTROLLED only)' },
  { name: 'escrow_required', description: 'Yes / No' },
  { name: 'payment_mode', description: 'Payment mode' },
  { name: 'installment_count', description: 'Number of installments' },
  { name: 'platform_fee_pct', description: 'Platform fee percentage' },
];

const AGG_VARS: TemplateVariable[] = [
  { name: 'anti_disintermediation', description: 'Anti-disintermediation clause (AGG only)' },
];

const PLATFORM_VARS: TemplateVariable[] = [
  { name: 'platform_name', description: 'Platform name' },
];

export const VARIABLES_BY_DOCUMENT: Record<LegalDocCode, readonly TemplateVariable[]> = {
  SPA: [...USER_VARS, ...ORG_VARS, ...PLATFORM_VARS],
  SKPA: [...USER_VARS, ...ORG_VARS, ...PLATFORM_VARS, ...ORG_VARS.filter((v) => v.name === 'seeker_industry')],
  PWA: [...USER_VARS, ...ORG_VARS, ...CHALLENGE_VARS, ...PLATFORM_VARS],
  CPA_QUICK: [...CHALLENGE_VARS, ...ORG_VARS, ...USER_VARS, ...GEO_VARS, ...PLATFORM_VARS],
  CPA_STRUCTURED: [...CHALLENGE_VARS, ...ORG_VARS, ...USER_VARS, ...GEO_VARS, ...INDUSTRY_VARS, ...ESCROW_VARS, ...PLATFORM_VARS],
  CPA_CONTROLLED: [...CHALLENGE_VARS, ...ORG_VARS, ...USER_VARS, ...GEO_VARS, ...INDUSTRY_VARS, ...ESCROW_VARS, ...AGG_VARS, ...PLATFORM_VARS],
};

/** Flat list of every variable known to the system — for editor dropdowns. */
export const ALL_TEMPLATE_VARIABLES: readonly TemplateVariable[] = Array.from(
  new Map(
    Object.values(VARIABLES_BY_DOCUMENT)
      .flat()
      .map((v) => [v.name, v]),
  ).values(),
);
