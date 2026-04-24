/**
 * CPA Preview Interpolator
 *
 * Pure functions that mirror server-side `assemble_cpa` substitution rules.
 * Used to render real challenge values inside CPA template previews at draft
 * time (before any `challenge_legal_docs` row exists).
 *
 * SAFETY: This is preview-only. The DB template `template_content` keeps
 * `{{variables}}`. The server's `assemble_cpa` RPC remains the source of truth
 * at freeze. Mirror any change here in the SQL function.
 */

import {
  CPA_VARIABLE_LABELS,
  IP_CLAUSE_TEXT,
  IP_CLAUSE_FALLBACK,
  ANTI_DISINT_CLAUSE_AGG,
  DEFAULT_JURISDICTION,
  DEFAULT_GOVERNING_LAW,
  buildEscrowTermsText,
} from '@/constants/legalPreview.constants';
import { formatLegalPlainText } from '@/services/legal/legalTextFormatter';

export interface CpaPreviewInput {
  challenge_title?: string | null;
  problem_statement?: string | null;
  scope?: string | null;
  ip_model?: string | null;
  governance_mode?: string | null;
  operating_model?: string | null;
  prize_amount?: number | string | null;
  currency?: string | null;
  evaluation_method?: string | null;
  evaluator_count?: number | null;
  solver_audience?: string | null;
  submission_deadline?: string | null;
  seeker_org_name?: string | null;
  jurisdiction?: string | null;
  governing_law?: string | null;
}

/**
 * Resolved variable map matching the JSONB `v_variables` block in `assemble_cpa`.
 * Empty string values are treated as "not set" by the interpolator.
 */
export type CpaPreviewVariables = Record<string, string>;

const VARIABLE_REGEX = /\{\{([a-z_]+)\}\}/gi;

/* ─────────────────────────────────────────────────────────── */

function safeString(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return v.toString();
  return String(v).trim();
}

function formatPrize(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return '';
  const num = typeof amount === 'number' ? amount : Number(amount);
  if (!Number.isFinite(num) || num <= 0) return '';
  return num.toString();
}

/**
 * Build the same variable map the server emits, applying the same CASE rules
 * for `ip_clause`, `escrow_terms`, and `anti_disintermediation`.
 */
export function buildPreviewVariables(input: CpaPreviewInput): CpaPreviewVariables {
  const govMode = safeString(input.governance_mode) || 'QUICK';
  const opModel = safeString(input.operating_model);
  const ipModel = safeString(input.ip_model);
  const currency = safeString(input.currency) || 'USD';
  const prize = formatPrize(input.prize_amount);

  // ip_clause — mirrors assemble_cpa CASE
  let ipClause = '';
  if (ipModel) {
    ipClause = IP_CLAUSE_TEXT[ipModel] ?? IP_CLAUSE_FALLBACK;
  }

  // escrow_terms — CONTROLLED only
  let escrowTerms = '';
  if (govMode === 'CONTROLLED' && prize) {
    escrowTerms = buildEscrowTermsText(currency, prize);
  }

  // anti_disintermediation — AGG only
  const antiDisint = opModel === 'AGG' ? ANTI_DISINT_CLAUSE_AGG : '';

  // evaluation_method with count suffix
  const evalMethod = safeString(input.evaluation_method);
  const evalCount = input.evaluator_count ?? 0;
  const evaluationMethod = evalMethod
    ? evalCount > 1
      ? `${evalMethod} (${evalCount} evaluators)`
      : evalMethod
    : '';

  return {
    challenge_title: safeString(input.challenge_title),
    seeker_org_name: safeString(input.seeker_org_name),
    ip_clause: ipClause,
    ip_model: ipModel,
    escrow_terms: escrowTerms,
    anti_disintermediation: antiDisint,
    prize_amount: prize,
    total_fee: prize,
    currency,
    jurisdiction: safeString(input.jurisdiction) || DEFAULT_JURISDICTION,
    governing_law: safeString(input.governing_law) || DEFAULT_GOVERNING_LAW,
    evaluation_method: evaluationMethod,
    solver_audience: safeString(input.solver_audience) || 'ALL',
    governance_mode: govMode,
    problem_statement: safeString(input.problem_statement),
    scope: safeString(input.scope),
    submission_deadline: safeString(input.submission_deadline),
  };
}

/* ─────────────────────────────────────────────────────────── */

function missingMarker(varName: string): string {
  const label = CPA_VARIABLE_LABELS[varName] ?? varName;
  return `<span class="legal-preview-missing">[Not set: ${label}]</span>`;
}

/**
 * Replace `{{variable}}` tokens in `template` with values from `vars`.
 *
 * @param mode 'preview' renders missing values as styled `[Not set: …]` chips.
 *             'strict' leaves the original `{{variable}}` token in place.
 */
export function interpolateCpaTemplate(
  template: string,
  vars: CpaPreviewVariables,
  mode: 'preview' | 'strict' = 'preview',
): string {
  if (!template) return template;

  return template.replace(VARIABLE_REGEX, (_match, rawKey: string) => {
    const key = rawKey.toLowerCase();
    const value = vars[key];

    // Variables that are intentionally empty for the active governance/engagement
    // (escrow outside CONTROLLED, anti-disint outside AGG) are rendered as empty
    // strings — same behavior as the server, no "not set" chip.
    if (key === 'escrow_terms' && (vars.governance_mode ?? '') !== 'CONTROLLED') {
      return '';
    }
    // Note: anti_disintermediation truly missing (AGG with no value) won't happen;
    // if operating_model is AGG it's always set to the canonical sentence.

    if (value && value.length > 0) return value;
    if (mode === 'strict') return `{{${rawKey}}}`;
    return missingMarker(key);
  });
}

/* ─────────────────────────────────────────────────────────── */

export interface TemplateCompleteness {
  total: number;
  filled: number;
  missing: number;
  missingNames: string[];
}

/**
 * Inspect a template + variable map and report which variables are still
 * unresolved (so the preview can show a "X/Y filled" banner).
 *
 * Variables that the server intentionally leaves blank for the current mode
 * (escrow outside CONTROLLED) are excluded from the count.
 */
export function analyzeTemplateCompleteness(
  template: string,
  vars: CpaPreviewVariables,
): TemplateCompleteness {
  if (!template) return { total: 0, filled: 0, missing: 0, missingNames: [] };

  const seen = new Set<string>();
  const missingNames: string[] = [];
  let total = 0;
  let filled = 0;

  let m: RegExpExecArray | null;
  const regex = new RegExp(VARIABLE_REGEX.source, 'gi');
  while ((m = regex.exec(template)) !== null) {
    const key = m[1].toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    // Skip variables that are blank by design for current mode
    if (key === 'escrow_terms' && (vars.governance_mode ?? '') !== 'CONTROLLED') {
      continue;
    }

    total += 1;
    const value = vars[key];
    if (value && value.length > 0) {
      filled += 1;
    } else {
      missingNames.push(CPA_VARIABLE_LABELS[key] ?? key);
    }
  }

  return { total, filled, missing: total - filled, missingNames };
}
