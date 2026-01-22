/**
 * Proof Points Score Calculation Service
 * 
 * Implements the scoring formula:
 * - Weighted Quality = Σ(Score × Relevance) / (10 × N)
 * - Relevance Density = Σ(Relevance) / N
 * - Final Score = WeightedQuality × RelevanceDensity × 10
 * 
 * Where Relevance weights are:
 * - HIGH = 1.0
 * - MEDIUM = 0.6
 * - LOW = 0.2
 */

export type RelevanceRating = 'high' | 'medium' | 'low';

export const RELEVANCE_WEIGHTS: Record<RelevanceRating, number> = {
  high: 1.0,
  medium: 0.6,
  low: 0.2,
} as const;

export interface ProofPointRating {
  relevance: RelevanceRating;
  score: number; // 0-10
}

export interface ScoreBreakdown {
  weightedQuality: number;
  relevanceDensity: number;
  finalScore: number;
  totalContribution: number;
  ratedCount: number;
  totalCount: number;
}

/**
 * Calculate individual proof point contribution
 * Contribution = Score × Relevance Weight
 */
export function calculateContribution(rating: ProofPointRating): number {
  const weight = RELEVANCE_WEIGHTS[rating.relevance];
  return rating.score * weight;
}

/**
 * Calculate the full proof points score with breakdown
 */
export function calculateProofPointsScore(
  ratings: ProofPointRating[]
): ScoreBreakdown {
  const ratedCount = ratings.length;
  
  if (ratedCount === 0) {
    return {
      weightedQuality: 0,
      relevanceDensity: 0,
      finalScore: 0,
      totalContribution: 0,
      ratedCount: 0,
      totalCount: 0,
    };
  }

  let sumWeightedScores = 0;
  let sumWeights = 0;

  for (const rating of ratings) {
    const weight = RELEVANCE_WEIGHTS[rating.relevance];
    sumWeightedScores += rating.score * weight;
    sumWeights += weight;
  }

  // A) Weighted Quality: normalized by max possible (10 * N)
  const weightedQuality = sumWeightedScores / (10 * ratedCount);

  // B) Relevance Density: penalty for low relevance items
  const relevanceDensity = sumWeights / ratedCount;

  // C) Final Score: product of quality and density, scaled to 0-10
  const normalizedScore = weightedQuality * relevanceDensity;
  const finalScore = Math.round(normalizedScore * 10 * 100) / 100; // 2 decimal places

  return {
    weightedQuality: Math.round(weightedQuality * 100) / 100,
    relevanceDensity: Math.round(relevanceDensity * 100) / 100,
    finalScore,
    totalContribution: Math.round(sumWeightedScores * 100) / 100,
    ratedCount,
    totalCount: ratedCount,
  };
}

/**
 * Get relevance label for display
 */
export function getRelevanceLabel(relevance: RelevanceRating): string {
  const labels: Record<RelevanceRating, string> = {
    high: 'High (1.0)',
    medium: 'Medium (0.6)',
    low: 'Low (0.2)',
  };
  return labels[relevance];
}

/**
 * Format score for display
 */
export function formatScore(score: number): string {
  return score.toFixed(2);
}
