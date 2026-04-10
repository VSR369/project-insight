/**
 * creatorReviewMapper — Maps AI gap fields to canonical creator field keys
 * and derives per-field scores from gap severity.
 * Decoupled from dimension average to avoid circular dependency.
 */

const SEVERITY_SCORES: Record<string, number> = {
  critical: 45,
  warning: 72,
  suggestion: 88,
};

/** Baseline score for fields with no gaps (high floor, no dependency on dimAvg) */
const NO_GAP_FLOOR = 82;
const NO_GAP_CAP = 98;

const FIELD_ALIAS_MAP: Record<string, string> = {
  problem: 'problem_statement',
  problem_statement: 'problem_statement',
  tags: 'domain_tags',
  domain_tags: 'domain_tags',
  currency: 'currency_code',
  currency_code: 'currency_code',
  prize: 'platinum_award',
  top_prize: 'platinum_award',
  platinum_award: 'platinum_award',
  title: 'title',
  scope: 'scope',
  maturity: 'maturity_level',
  maturity_level: 'maturity_level',
  solution_maturity: 'maturity_level',
  criteria: 'weighted_criteria',
  weighted_criteria: 'weighted_criteria',
  evaluation_criteria: 'weighted_criteria',
  hook: 'hook',
  one_liner: 'hook',
  summary: 'hook',
  context: 'context_background',
  context_background: 'context_background',
  org_context: 'context_background',
  organization_context: 'context_background',
  ip: 'ip_model',
  ip_model: 'ip_model',
  ip_preference: 'ip_model',
  timeline: 'expected_timeline',
  expected_timeline: 'expected_timeline',
};

interface GapEntry {
  field: string;
  severity: string;
  message: string;
}

/** Normalize an AI gap field name to a canonical creator field key */
export function resolveFieldKey(rawField: string): string | null {
  const normalized = rawField.toLowerCase().trim().replace(/[\s-]+/g, '_');
  return FIELD_ALIAS_MAP[normalized] ?? null;
}

/** Derive a numeric score from gaps; fixed baseline for no-gap fields */
export function deriveFieldScore(gaps: GapEntry[] | undefined): number {
  if (!gaps || gaps.length === 0) {
    // Use a random-seeded value between floor and cap for variety
    return Math.round(NO_GAP_FLOOR + Math.random() * (NO_GAP_CAP - NO_GAP_FLOOR));
  }
  let worstScore = 100;
  for (const gap of gaps) {
    const s = SEVERITY_SCORES[gap.severity] ?? 72;
    if (s < worstScore) worstScore = s;
  }
  return worstScore;
}

/** Build a human-readable comment from gaps or strengths */
export function buildFieldComment(
  gaps: GapEntry[] | undefined,
  strengths: string[],
  fieldLabel: string
): string {
  if (gaps && gaps.length > 0) {
    return gaps.map((g) => g.message).join(' · ');
  }
  const match = strengths.find((s) =>
    s.toLowerCase().includes(fieldLabel.toLowerCase())
  );
  return match ?? 'Looks good — no issues identified.';
}
