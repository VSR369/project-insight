/**
 * useChallengeTelemetry — Query hook for per-challenge AI review telemetry.
 *
 * Returns the most recent telemetry rows for a single challenge, ordered newest-first,
 * along with derived trend statistics (delta vs. previous review).
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TelemetryRow } from './useQualityTelemetry';

export interface ChallengeTelemetryTrend {
  /** Most recent review row, or null if none. */
  latest: TelemetryRow | null;
  /** Previous review row for delta computation, or null if only one exists. */
  previous: TelemetryRow | null;
  /** Findings delta (latest - previous). Positive = more findings this run. */
  findingsDelta: number | null;
  /** Corrections delta (latest - previous). Positive = more corrections this run. */
  correctionsDelta: number | null;
  /** True when latest run has fewer findings AND corrections than previous. */
  isImproving: boolean;
}

function computeTrend(rows: TelemetryRow[]): ChallengeTelemetryTrend {
  const latest = rows[0] ?? null;
  const previous = rows[1] ?? null;

  if (!latest || !previous) {
    return { latest, previous, findingsDelta: null, correctionsDelta: null, isImproving: false };
  }

  const latestFindings = latest.consistency_findings_count + latest.ambiguity_findings_count;
  const previousFindings = previous.consistency_findings_count + previous.ambiguity_findings_count;
  const findingsDelta = latestFindings - previousFindings;
  const correctionsDelta = latest.total_corrections - previous.total_corrections;

  return {
    latest,
    previous,
    findingsDelta,
    correctionsDelta,
    isImproving: findingsDelta < 0 && correctionsDelta <= 0,
  };
}

export function useChallengeTelemetry(challengeId: string | undefined, limit = 10) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['challenge-telemetry', challengeId, limit],
    queryFn: async () => {
      if (!challengeId) return [] as TelemetryRow[];
      const { data, error } = await supabase
        .from('challenge_quality_telemetry')
        .select(
          'id, challenge_id, sections_reviewed, pass1_tokens, pass2_tokens, consistency_findings_count, ambiguity_findings_count, total_corrections, avg_edit_magnitude, model_used, review_duration_seconds, is_baseline, principal_compliance_pct, created_at',
        )
        .eq('challenge_id', challengeId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw new Error(error.message);
      return (data ?? []) as TelemetryRow[];
    },
    enabled: !!challengeId,
    staleTime: 30_000,
  });

  const rows = data ?? [];
  const trend = computeTrend(rows);

  return { rows, trend, isLoading, error };
}
