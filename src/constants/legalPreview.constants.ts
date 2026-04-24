/**
 * Legal Preview Constants
 *
 * Mirrors server-side `assemble_cpa` substitution rules so that the
 * client-side preview renders the same text the server will emit at freeze.
 *
 * DO NOT modify these strings without updating `assemble_cpa` in the same migration.
 */

/** Friendly labels for the [Not set: …] placeholder chips. */
export const CPA_VARIABLE_LABELS: Record<string, string> = {
  challenge_title: 'Challenge title',
  seeker_org_name: 'Organization name',
  ip_clause: 'IP clause',
  ip_model: 'IP model',
  escrow_terms: 'Escrow terms',
  anti_disintermediation: 'Anti-disintermediation clause',
  prize_amount: 'Prize amount',
  total_fee: 'Total fee',
  currency: 'Currency',
  jurisdiction: 'Jurisdiction',
  governing_law: 'Governing law',
  evaluation_method: 'Evaluation method',
  solver_audience: 'Solution Provider audience',
  governance_mode: 'Governance mode',
  problem_statement: 'Problem statement',
  scope: 'Scope',
  submission_deadline: 'Submission deadline',
};

/**
 * IP clause text — must match `assemble_cpa` CASE block exactly.
 * Source: supabase/migrations/20260420114205_*.sql lines 78-84.
 */
export const IP_CLAUSE_TEXT: Record<string, string> = {
  'IP-EA': 'EXCLUSIVE ASSIGNMENT: Solver assigns all rights, title, and interest to Organization. Organization becomes sole IP owner.',
  'IP-NEL': 'NON-EXCLUSIVE LICENSE: Solver retains ownership. Organization receives a non-exclusive, royalty-free, perpetual license.',
  'IP-EL': 'EXCLUSIVE LICENSE: Solver retains ownership. Organization receives an exclusive license. Solver may not license to others.',
  'IP-JO': 'JOINT OWNERSHIP: Both parties share ownership equally. Either party may commercialize independently.',
};

export const IP_CLAUSE_FALLBACK = 'NO TRANSFER: Solver retains all intellectual property rights.';

export const ANTI_DISINT_CLAUSE_AGG =
  'ANTI-DISINTERMEDIATION: Solver agrees not to engage directly with Organization outside Platform for services related to this challenge for 12 months post-completion.';

export const DEFAULT_JURISDICTION = 'Applicable jurisdiction';
export const DEFAULT_GOVERNING_LAW = 'As per applicable regulations';

/** Build the escrow-terms sentence (CONTROLLED only). */
export function buildEscrowTermsText(currency: string, prizeAmount: string): string {
  return `ESCROW REQUIREMENT: Organization must deposit full prize (${currency} ${prizeAmount}) into Platform escrow before solver enrollment. Released upon winner confirmation + IP agreement execution.`;
}

/* ─── Creator Legal Preview copy (engagement-aware) ────────────── */

/**
 * CPA descriptions shown in the Creator Legal Preview card.
 * Indexed first by engagement source ('PLATFORM' | 'ORG'), then by governance mode.
 */
export const CPA_PREVIEW_DESCRIPTIONS: Record<'PLATFORM' | 'ORG', Record<string, string>> = {
  ORG: {
    QUICK:
      "Assembled automatically from your org's CPA-Quick template with this challenge's details (IP model, prize, jurisdiction). Solution Providers auto-accept at enrollment. No manual review.",
    STRUCTURED:
      "Assembled after curation freeze from your org's CPA-Structured template. The Curator reviews, can edit legal terms, and optionally add addenda before publishing.",
    CONTROLLED:
      "Assembled after curation freeze from your org's CPA-Controlled template. The Legal Coordinator reviews with AI assistance, can edit terms, add addenda, and must approve.",
  },
  PLATFORM: {
    QUICK:
      "Assembled automatically from the Platform Marketplace CPA-Quick template with this challenge's details (IP model, prize, jurisdiction). Solution Providers auto-accept at enrollment.",
    STRUCTURED:
      'Assembled after curation freeze from the Platform Marketplace CPA-Structured template. The Curator reviews and can attach addenda before publishing.',
    CONTROLLED:
      'Assembled after curation freeze from the Platform Marketplace CPA-Controlled template. The Legal Coordinator reviews with AI assistance and must approve.',
  },
};

/** Source-of-template chip text shown next to the CPA card. */
export const CPA_SOURCE_LABEL: Record<'PLATFORM' | 'ORG', string> = {
  PLATFORM: 'Platform template',
  ORG: 'Organization template',
};

