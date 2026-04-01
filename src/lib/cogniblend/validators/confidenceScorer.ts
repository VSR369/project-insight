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
  let score = 0; // start from 0 per spec
  const factors: string[] = [];

  const config = getSectionFormat(sectionKey);
  const sections = context.sections ?? {};

  // Factor 1: Creator input present (+30 pts)
  // Check if the section itself has creator-provided content
  const sectionContent = sections[sectionKey] ?? '';
  if (sectionContent && String(sectionContent).length > 30) {
    score += 30;
    factors.push('Creator input present');
  } else if (sections.problem_statement && String(sections.problem_statement).length > 50) {
    // Partial credit if problem statement exists even if this section is empty
    score += 15;
    factors.push('Problem statement available (partial creator input)');
  }

  // Factor 2: Reference materials available (+20 pts)
  const aiUsesContext = config?.aiUsesContext ?? [];
  if (aiUsesContext.length > 0) {
    let filled = 0;
    for (const ref of aiUsesContext) {
      const key = ref.replace(/^(intake|spec)\./, '');
      const val = sections[key] ?? sections[ref];
      if (val && String(val).length > 30) filled++;
    }
    const ratio = filled / aiUsesContext.length;
    const pts = Math.round(ratio * 20);
    score += pts;
    if (ratio >= 0.8) factors.push('Rich cross-section context');
    else if (ratio < 0.3) factors.push('Sparse cross-section context');
  }

  // Factor 3: Context digest available (+15 pts)
  if (context.sections && Object.keys(context.sections).length > 5) {
    score += 15;
    factors.push('Context digest available');
  } else if (context.sections && Object.keys(context.sections).length > 2) {
    score += 8;
    factors.push('Partial context digest');
  }

  // Factor 4: Master data constrained (+20 pts)
  if (config?.masterDataTable && context.masterData) {
    const mdKey = Object.keys(context.masterData).find(
      (k) => (context.masterData as any)[k]?.length > 0,
    );
    if (mdKey) {
      score += 20;
      factors.push('Master data constrained');
    }
  } else if (!config?.masterDataTable) {
    // Rich text unconstrained section (-10 pts)
    const format = config?.format;
    if (format === 'rich_text' || format === 'text') {
      score -= 10;
      factors.push('Unconstrained rich text section');
    }
  }

  // Factor 5: Strong domain coverage (+15 pts) or Niche domain (-15 pts)
  const domainTags = context.masterData?.validDomainTags ?? [];
  if (domainTags.length > 0) {
    // Simple heuristic: common domains get a boost
    const WELL_COVERED = new Set([
      'technology', 'software', 'data science', 'healthcare', 'fintech',
      'finance', 'education', 'energy', 'sustainability', 'manufacturing',
      'cybersecurity', 'ai', 'machine learning', 'biotech',
    ]);
    const normalized = domainTags.map((t: string) => t.toLowerCase().trim());
    const wellCovered = normalized.some((t: string) => WELL_COVERED.has(t));
    if (wellCovered) {
      score += 15;
      factors.push('Strong domain coverage');
    } else {
      score -= 15;
      factors.push('Niche domain — limited AI reference data');
    }
  }

  // Factor 6: Maturity level set (+5 bonus)
  if (context.maturityLevel) {
    score += 5;
    factors.push('Maturity level set');
  }

  // Factor 7: Organization context (+5 bonus)
  if (context.seekerSegment) {
    score += 5;
    factors.push('Organization context available');
  }

  // Cap at 0-100
  score = Math.min(100, Math.max(0, score));

  const riskLevel: RiskLevel =
    score >= 75 ? 'low' :
    score >= 50 ? 'medium' :
    'high';

  return { score, riskLevel, factors };
}
