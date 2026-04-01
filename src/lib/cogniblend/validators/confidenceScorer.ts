/**
 * Confidence Scorer — Rule 8: Scores AI output confidence 0-100 per section
 * based on context availability. Returns riskLevel (low/medium/high).
 */

import type { ChallengeContext } from '../challengeContextAssembler';
import { getSectionFormat } from '../curationSectionFormats';

export type RiskLevel = 'low' | 'medium' | 'high';

export interface ConfidenceScore {
  score: number;
  riskLevel: RiskLevel;
  factors: string[];
}

/**
 * Compute a confidence score for a given section based on how much
 * supporting context is available.
 */
export function scoreConfidence(
  sectionKey: string,
  context: ChallengeContext,
): ConfidenceScore {
  let score = 50; // baseline
  const factors: string[] = [];

  const config = getSectionFormat(sectionKey);
  const aiUsesContext = config?.aiUsesContext ?? [];
  const sections = context.sections ?? {};

  // Factor 1: How many referenced sections have content (0-25 pts)
  if (aiUsesContext.length > 0) {
    let filled = 0;
    for (const ref of aiUsesContext) {
      const key = ref.replace(/^(intake|spec)\./, '');
      const val = sections[key] ?? sections[ref];
      if (val && String(val).length > 30) filled++;
    }
    const ratio = filled / aiUsesContext.length;
    const pts = Math.round(ratio * 25);
    score += pts;
    if (ratio >= 0.8) factors.push('Rich cross-section context');
    else if (ratio < 0.3) factors.push('Sparse cross-section context');
  } else {
    score += 10; // No dependencies = simpler section
    factors.push('No cross-references needed');
  }

  // Factor 2: Problem statement presence (+10)
  if (sections.problem_statement && String(sections.problem_statement).length > 50) {
    score += 10;
    factors.push('Problem statement present');
  } else {
    factors.push('Missing problem statement');
  }

  // Factor 3: Maturity level set (+5)
  if (context.maturityLevel) {
    score += 5;
    factors.push('Maturity level set');
  }

  // Factor 4: Domain tags present (+5)
  const domainTags = context.masterData?.validDomainTags ?? [];
  if (domainTags.length > 0) {
    score += 5;
    factors.push(`${domainTags.length} domain tags`);
  }

  // Factor 5: Organization context (+5)
  if (context.seekerSegment) {
    score += 5;
    factors.push('Organization context available');
  }

  // Factor 6: Context digest available (+5)
  if (context.sections && Object.keys(context.sections).length > 5) {
    score += 5;
  }

  // Factor 7: Master data available for checkbox/select sections (+5)
  if (config?.masterDataTable && context.masterData) {
    const mdKey = Object.keys(context.masterData).find(
      (k) => (context.masterData as any)[k]?.length > 0,
    );
    if (mdKey) {
      score += 5;
      factors.push('Master data available');
    }
  }

  // Cap at 100
  score = Math.min(100, Math.max(0, score));

  const riskLevel: RiskLevel =
    score >= 75 ? 'low' :
    score >= 50 ? 'medium' :
    'high';

  return { score, riskLevel, factors };
}
