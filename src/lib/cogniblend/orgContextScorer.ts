/**
 * Org Context Scorer — Scores organization profile completeness 0-100.
 *
 * Checks 9 fields and returns missing list + recommendation.
 */

export interface OrgContextResult {
  score: number;
  missingFields: string[];
  recommendation: string;
}

interface OrgProfile {
  name?: string;
  industry?: string;
  description?: string;
  website?: string;
  headquarters?: string;
  employee_count?: number | string;
  founding_year?: number | string;
  revenue_range?: string;
  mission_statement?: string;
}

const FIELD_WEIGHTS: Array<{ key: keyof OrgProfile; label: string; weight: number }> = [
  { key: 'name', label: 'Organization Name', weight: 15 },
  { key: 'industry', label: 'Industry', weight: 15 },
  { key: 'description', label: 'Description', weight: 15 },
  { key: 'website', label: 'Website', weight: 5 },
  { key: 'headquarters', label: 'Headquarters', weight: 10 },
  { key: 'employee_count', label: 'Employee Count', weight: 10 },
  { key: 'founding_year', label: 'Founding Year', weight: 5 },
  { key: 'revenue_range', label: 'Revenue Range', weight: 10 },
  { key: 'mission_statement', label: 'Mission Statement', weight: 15 },
];

export function scoreOrgContext(org: OrgProfile | null | undefined): OrgContextResult {
  if (!org) {
    return {
      score: 0,
      missingFields: FIELD_WEIGHTS.map((f) => f.label),
      recommendation: 'No organization profile available. AI will generate generic content.',
    };
  }

  let score = 0;
  const missing: string[] = [];

  for (const { key, label, weight } of FIELD_WEIGHTS) {
    const val = org[key];
    if (val && String(val).trim().length > 0) {
      score += weight;
    } else {
      missing.push(label);
    }
  }

  score = Math.min(100, Math.max(0, score));

  let recommendation: string;
  if (score >= 80) {
    recommendation = 'Rich org context. AI can generate industry-specific content.';
  } else if (score >= 50) {
    recommendation = `Moderate org context. Missing: ${missing.slice(0, 3).join(', ')}. Adding these will improve AI quality.`;
  } else {
    recommendation = `Sparse org context (${missing.length} fields missing). AI output will be generic. Consider enriching the organization profile.`;
  }

  return { score, missingFields: missing, recommendation };
}
