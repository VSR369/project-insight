/**
 * useQualityTelemetry — Query hook for challenge_quality_telemetry table.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TelemetryRow {
  id: string;
  challenge_id: string;
  sections_reviewed: number | null;
  pass1_tokens: number | null;
  pass2_tokens: number | null;
  consistency_findings_count: number;
  ambiguity_findings_count: number;
  total_corrections: number;
  avg_edit_magnitude: number | null;
  model_used: string | null;
  review_duration_seconds: number | null;
  is_baseline: boolean;
  created_at: string;
}

export interface TelemetryStats {
  totalReviews: number;
  avgDurationSeconds: number;
  avgTokensPerReview: number;
  avgFindings: number;
}

function computeStats(rows: TelemetryRow[]): TelemetryStats {
  if (rows.length === 0) {
    return { totalReviews: 0, avgDurationSeconds: 0, avgTokensPerReview: 0, avgFindings: 0 };
  }

  let totalDuration = 0;
  let totalTokens = 0;
  let totalFindings = 0;

  for (const r of rows) {
    totalDuration += r.review_duration_seconds ?? 0;
    totalTokens += (r.pass1_tokens ?? 0) + (r.pass2_tokens ?? 0);
    totalFindings += r.consistency_findings_count + r.ambiguity_findings_count;
  }

  return {
    totalReviews: rows.length,
    avgDurationSeconds: Math.round(totalDuration / rows.length),
    avgTokensPerReview: Math.round(totalTokens / rows.length),
    avgFindings: Math.round((totalFindings / rows.length) * 10) / 10,
  };
}

export function useQualityTelemetry(limit = 200) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['quality-telemetry', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenge_quality_telemetry')
        .select('id, challenge_id, sections_reviewed, pass1_tokens, pass2_tokens, consistency_findings_count, ambiguity_findings_count, total_corrections, avg_edit_magnitude, model_used, review_duration_seconds, is_baseline, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw new Error(error.message);
      return (data ?? []) as TelemetryRow[];
    },
    staleTime: 60_000,
  });

  const stats = computeStats(data ?? []);

  return { rows: data ?? [], stats, isLoading, error };
}
