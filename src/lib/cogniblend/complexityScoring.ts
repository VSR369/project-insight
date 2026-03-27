/**
 * complexityScoring.ts — Single source of truth for complexity score calculation
 * and level derivation. Used by both CurationReviewPage and ComplexityAssessmentModule.
 */

export interface ComplexityThreshold {
  level: string;
  label: string;
  min: number;
  max: number;
  description: string;
}

export const COMPLEXITY_THRESHOLDS: readonly ComplexityThreshold[] = [
  { level: "L1", label: "Very Low", min: 0, max: 2, description: "Routine, well-defined challenges with established methods and minimal ambiguity." },
  { level: "L2", label: "Low", min: 2, max: 4, description: "Moderately defined challenges with some novel elements requiring limited exploration." },
  { level: "L3", label: "Medium", min: 4, max: 6, description: "Challenges requiring cross-domain thinking, moderate research, and creative approaches." },
  { level: "L4", label: "High", min: 6, max: 8, description: "Complex, multi-faceted challenges demanding deep expertise and innovative solutions." },
  { level: "L5", label: "Very High", min: 8, max: 10, description: "Frontier-level challenges with high uncertainty, novel domains, and breakthrough potential." },
] as const;

/** Derive complexity level code (e.g. "L4") from a numeric score */
export function deriveComplexityLevel(score: number): string {
  const clamped = Math.max(0, Math.min(10, score));
  const match = COMPLEXITY_THRESHOLDS.find((t) => clamped >= t.min && clamped < t.max);
  return match?.level ?? "L5";
}

/** Derive complexity label (e.g. "High") from a numeric score */
export function deriveComplexityLabel(score: number): string {
  const clamped = Math.max(0, Math.min(10, score));
  const match = COMPLEXITY_THRESHOLDS.find((t) => clamped >= t.min && clamped < t.max);
  return match?.label ?? "Very High";
}

/** Get label for a level code (e.g. "L4" → "High") */
export function getLabelForLevel(level: string): string {
  return COMPLEXITY_THRESHOLDS.find((t) => t.level === level)?.label ?? "Unknown";
}

/** Format level + label for display (e.g. "L4 — High") */
export function formatLevelLabel(score: number): string {
  return `${deriveComplexityLevel(score)} — ${deriveComplexityLabel(score)}`;
}

/** Level badge color mapping */
export const LEVEL_COLORS: Record<string, string> = {
  L1: "bg-green-100 text-green-800 border-green-300",
  L2: "bg-blue-100 text-blue-800 border-blue-300",
  L3: "bg-yellow-100 text-yellow-800 border-yellow-300",
  L4: "bg-orange-100 text-orange-800 border-orange-300",
  L5: "bg-red-100 text-red-800 border-red-300",
};

export const LEVEL_CARD_COLORS: Record<string, { ring: string; bg: string; text: string }> = {
  L1: { ring: "ring-green-400", bg: "bg-green-50", text: "text-green-800" },
  L2: { ring: "ring-blue-400", bg: "bg-blue-50", text: "text-blue-800" },
  L3: { ring: "ring-yellow-400", bg: "bg-yellow-50", text: "text-yellow-800" },
  L4: { ring: "ring-orange-400", bg: "bg-orange-50", text: "text-orange-800" },
  L5: { ring: "ring-red-400", bg: "bg-red-50", text: "text-red-800" },
};

/**
 * Compute weighted average complexity score from AI ratings + master params.
 * Clamps individual ratings to [1, 10], returns rounded to 2 decimal places.
 */
export function computeWeightedComplexityScore(
  ratings: Record<string, { rating: number; justification: string }>,
  complexityParams: { param_key: string; weight: number }[],
): number {
  const totalWeight = complexityParams.reduce((s, p) => s + p.weight, 0);
  if (totalWeight > 0) {
    const raw = complexityParams.reduce((s, p) => {
      const r = ratings[p.param_key];
      const val = r ? Math.max(1, Math.min(10, r.rating)) : 5;
      return s + val * p.weight;
    }, 0) / totalWeight;
    return Math.round(raw * 100) / 100;
  }
  // Fallback: simple average
  const entries = Object.values(ratings);
  if (entries.length === 0) return 5;
  const raw = entries.reduce((s, r) => s + Math.max(1, Math.min(10, r.rating)), 0) / entries.length;
  return Math.round(raw * 100) / 100;
}

/**
 * Build a human-readable markdown summary from AI complexity ratings.
 */
export function buildComplexitySuggestionMd(
  ratings: Record<string, { rating: number; justification: string }>,
  complexityParams: { param_key: string; weight: number; name?: string }[],
): string {
  const ws = computeWeightedComplexityScore(ratings, complexityParams);
  const score = ws.toFixed(2);
  const level = formatLevelLabel(ws);

  let md = `**Suggested Complexity: ${level} (Score: ${score})**\n\n`;
  for (const [key, r] of Object.entries(ratings)) {
    const param = complexityParams.find((p) => p.param_key === key);
    const label = param?.name ?? key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    md += `- **${label}**: ${r.rating}/10 — ${r.justification}\n`;
  }
  return md;
}
