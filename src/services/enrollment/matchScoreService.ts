/**
 * matchScoreService — Computes match score between a provider and a challenge.
 * Used by MatchScoreBadge for Level 2+ providers at 65%+ profile strength.
 */

import { supabase } from '@/integrations/supabase/client';

export interface MatchScoreResult {
  score: number; // 0-100
  breakdown: {
    expertiseMatch: number;
    geographyMatch: number;
    solutionTypeMatch: number;
  };
}

/**
 * Compute match score between a provider's profile and a challenge's requirements.
 */
export async function computeMatchScore(
  providerId: string,
  challengeId: string
): Promise<MatchScoreResult> {
  // Fetch provider data
  const [enrollmentRes, solutionTypesRes] = await Promise.all([
    supabase
      .from('provider_industry_enrollments')
      .select('industry_segment_id, geographies_served')
      .eq('provider_id', providerId)
      .limit(10),
    supabase
      .from('provider_solution_types')
      .select('solution_type_id')
      .eq('provider_id', providerId),
  ]);

  // Fetch challenge data
  const { data: challenge } = await supabase
    .from('challenges')
    .select('industry_segment_id, solution_type, domain_tags, functional_area')
    .eq('id', challengeId)
    .single();

  if (!challenge) return { score: 0, breakdown: { expertiseMatch: 0, geographyMatch: 0, solutionTypeMatch: 0 } };

  const enrollments = enrollmentRes.data ?? [];
  const providerSolutionTypes = solutionTypesRes.data ?? [];

  // 1. Expertise match (industry alignment) — 50% weight
  const providerIndustries = enrollments.map((e) => e.industry_segment_id);
  const expertiseMatch = challenge.industry_segment_id && providerIndustries.includes(challenge.industry_segment_id) ? 100 : 0;

  // 2. Geography match — 20% weight
  const providerGeos = enrollments.flatMap((e) => (e.geographies_served as string[] | null) ?? []);
  const geographyMatch = providerGeos.length > 0 ? 100 : 50; // Baseline if no geos declared

  // 3. Solution type match — 30% weight
  const providerSTIds = providerSolutionTypes.map((s) => s.solution_type_id);
  const solutionTypeMatch = challenge.solution_type && providerSTIds.length > 0
    ? (providerSTIds.some((id) => id === challenge.solution_type) ? 100 : 30)
    : 50;

  const score = Math.round(
    expertiseMatch * 0.5 + geographyMatch * 0.2 + solutionTypeMatch * 0.3
  );

  return {
    score,
    breakdown: { expertiseMatch, geographyMatch, solutionTypeMatch },
  };
}
