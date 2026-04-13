/**
 * Performance Score Service
 * 
 * Business logic for computing weighted composite scores from 6 spec-aligned dimensions.
 */

import type { PerformanceDimension } from '@/constants/enrollment.constants';
import { PERFORMANCE_DIMENSIONS, PERFORMANCE_DEFAULT_WEIGHTS } from '@/constants/enrollment.constants';

/** Raw dimension scores (0-100 each) */
export interface DimensionScores {
  community_engagement: number;
  abstracts_submitted: number;
  solution_quality: number;
  complexity_handled: number;
  win_achievement: number;
  knowledge_contrib: number;
}

/** Weight configuration from performance_score_weights table */
export type DimensionWeights = Record<PerformanceDimension, number>;

/** Computed score result */
export interface ComputedPerformanceScore {
  dimensions: DimensionScores;
  compositeScore: number;
  weightedBreakdown: Record<PerformanceDimension, number>;
}

/** Default weights (must sum to 1.0) */
export const DEFAULT_WEIGHTS: DimensionWeights = { ...PERFORMANCE_DEFAULT_WEIGHTS };

/**
 * Compute weighted composite score from dimension scores and weights.
 */
export function computeCompositeScore(
  scores: DimensionScores,
  weights: DimensionWeights = DEFAULT_WEIGHTS
): ComputedPerformanceScore {
  const weightedBreakdown: Record<string, number> = {};
  let composite = 0;

  for (const dim of PERFORMANCE_DIMENSIONS) {
    const score = clampScore(scores[dim]);
    const weight = weights[dim];
    const weighted = score * weight;
    weightedBreakdown[dim] = Math.round(weighted * 100) / 100;
    composite += weighted;
  }

  return {
    dimensions: scores,
    compositeScore: Math.round(composite * 100) / 100,
    weightedBreakdown: weightedBreakdown as Record<PerformanceDimension, number>,
  };
}

/**
 * Validate that weights sum to 1.0 (within tolerance).
 */
export function validateWeights(weights: DimensionWeights): boolean {
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  return Math.abs(sum - 1.0) < 0.01;
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, score));
}

/**
 * Determine the strongest and weakest dimensions.
 */
export function analyzeDimensions(scores: DimensionScores): {
  strongest: PerformanceDimension;
  weakest: PerformanceDimension;
  aboveAverage: PerformanceDimension[];
  belowAverage: PerformanceDimension[];
} {
  const entries = PERFORMANCE_DIMENSIONS.map((dim) => ({
    dim,
    score: scores[dim],
  }));

  const sorted = [...entries].sort((a, b) => b.score - a.score);
  const avg = entries.reduce((sum, e) => sum + e.score, 0) / entries.length;

  return {
    strongest: sorted[0].dim,
    weakest: sorted[sorted.length - 1].dim,
    aboveAverage: entries.filter((e) => e.score >= avg).map((e) => e.dim),
    belowAverage: entries.filter((e) => e.score < avg).map((e) => e.dim),
  };
}
