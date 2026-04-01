/**
 * useAIQualityMetrics — React Query hooks for AI quality dashboard data.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface QualityMetricRow {
  id: string;
  challenge_id: string;
  ai_accuracy_percent: number;
  ai_assist_rate_percent: number;
  ai_rewrite_rate_percent: number;
  grade: string;
  total_sections_reviewed: number;
  sections_accepted_unchanged: number;
  sections_accepted_with_edits: number;
  sections_rejected_rewritten: number;
  avg_edit_distance_percent: number | null;
  avg_time_spent_seconds: number | null;
  governance_mode: string | null;
  maturity_level: string | null;
  domain_tags: string[];
  section_breakdown: Record<string, unknown>;
  computed_at: string;
}

export function useAIQualityMetrics(limit = 50) {
  return useQuery({
    queryKey: ['ai-quality-metrics', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curation_quality_metrics' as any)
        .select('*')
        .order('computed_at', { ascending: false })
        .limit(limit);
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as QualityMetricRow[];
    },
    staleTime: 60_000,
  });
}

export interface SolverFeedbackRow {
  id: string;
  challenge_id: string;
  solver_id: string;
  clarity_overall: number;
  clarity_problem: number | null;
  clarity_deliverables: number | null;
  clarity_evaluation: number | null;
  missing_info: string | null;
  created_at: string;
}

export function useSolverFeedbackSummary(challengeId?: string) {
  return useQuery({
    queryKey: ['solver-feedback-summary', challengeId],
    queryFn: async () => {
      let query = supabase
        .from('solver_challenge_feedback' as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (challengeId) {
        query = query.eq('challenge_id', challengeId);
      }
      const { data, error } = await query.limit(100);
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as SolverFeedbackRow[];
    },
    staleTime: 60_000,
    enabled: true,
  });
}

export function useAIQualityAggregates() {
  return useQuery({
    queryKey: ['ai-quality-aggregates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curation_quality_metrics' as any)
        .select('ai_accuracy_percent, ai_assist_rate_percent, ai_rewrite_rate_percent, grade, maturity_level');
      if (error) throw new Error(error.message);

      const rows = (data ?? []) as unknown as QualityMetricRow[];
      if (rows.length === 0) return null;

      const avgAccuracy = rows.reduce((s, r) => s + r.ai_accuracy_percent, 0) / rows.length;
      const avgAssist = rows.reduce((s, r) => s + r.ai_assist_rate_percent, 0) / rows.length;
      const avgRewrite = rows.reduce((s, r) => s + r.ai_rewrite_rate_percent, 0) / rows.length;

      const gradeDistribution = { A: 0, B: 0, C: 0, D: 0 };
      for (const r of rows) {
        gradeDistribution[r.grade as keyof typeof gradeDistribution]++;
      }

      return {
        totalChallenges: rows.length,
        avgAccuracyPercent: Math.round(avgAccuracy),
        avgAssistRatePercent: Math.round(avgAssist),
        avgRewriteRatePercent: Math.round(avgRewrite),
        gradeDistribution,
      };
    },
    staleTime: 5 * 60_000,
  });
}
