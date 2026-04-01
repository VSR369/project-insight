/**
 * Domain Coverage Scorer — Evaluates whether a challenge's domain tags
 * fall into well-covered or thin knowledge domains.
 *
 * Returns coverage level + recommendation for pre-flight gating.
 */

export type CoverageLevel = 'well_covered' | 'moderate' | 'thin';

export interface DomainCoverageResult {
  coverageLevel: CoverageLevel;
  score: number;
  coveredDomains: string[];
  thinDomains: string[];
  recommendation: string;
}

/**
 * Well-covered domains — AI has strong training data and examples.
 */
const WELL_COVERED_DOMAINS = new Set([
  'technology', 'software', 'data science', 'machine learning',
  'artificial intelligence', 'healthcare', 'fintech', 'finance',
  'education', 'energy', 'sustainability', 'manufacturing',
  'logistics', 'supply chain', 'marketing', 'cybersecurity',
  'biotech', 'pharmaceutical', 'agriculture', 'cleantech',
  'iot', 'robotics', 'materials science', 'engineering',
]);

/**
 * Thin domains — AI has limited training data; expect lower quality.
 */
const THIN_DOMAINS = new Set([
  'indigenous knowledge', 'rare diseases', 'artisanal crafts',
  'deep sea exploration', 'space mining', 'quantum biology',
  'paleoclimatology', 'numismatics', 'ethnomusicology',
]);

export function scoreDomainCoverage(domainTags: string[]): DomainCoverageResult {
  if (!domainTags || domainTags.length === 0) {
    return {
      coverageLevel: 'thin',
      score: 20,
      coveredDomains: [],
      thinDomains: [],
      recommendation: 'No domain tags set. AI quality will be generic. Add domain tags for better results.',
    };
  }

  const normalized = domainTags.map((t) => t.toLowerCase().trim());
  const covered: string[] = [];
  const thin: string[] = [];
  const unknown: string[] = [];

  for (const tag of normalized) {
    if (WELL_COVERED_DOMAINS.has(tag)) {
      covered.push(tag);
    } else if (THIN_DOMAINS.has(tag)) {
      thin.push(tag);
    } else {
      unknown.push(tag);
    }
  }

  const total = normalized.length;
  const coveredRatio = covered.length / total;
  const thinRatio = thin.length / total;

  let score: number;
  let coverageLevel: CoverageLevel;

  if (coveredRatio >= 0.7) {
    score = 85 + Math.round(coveredRatio * 15);
    coverageLevel = 'well_covered';
  } else if (thinRatio >= 0.5) {
    score = 30 + Math.round((1 - thinRatio) * 20);
    coverageLevel = 'thin';
  } else {
    score = 50 + Math.round(coveredRatio * 30);
    coverageLevel = 'moderate';
  }

  score = Math.min(100, Math.max(0, score));

  let recommendation: string;
  if (coverageLevel === 'well_covered') {
    recommendation = 'Good domain coverage. AI has strong reference data for these areas.';
  } else if (coverageLevel === 'thin') {
    recommendation = `Thin domain coverage for: ${thin.join(', ')}. Expect more curator edits. Consider adding context/background to compensate.`;
  } else {
    recommendation = `Moderate coverage. ${unknown.length} domain(s) have limited reference data. Review AI output carefully.`;
  }

  return {
    coverageLevel,
    score,
    coveredDomains: covered,
    thinDomains: thin,
    recommendation,
  };
}
