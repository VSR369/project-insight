/**
 * useCuratorCorrections — Query hook for curator_corrections table.
 * Used by the Supervisor Learning Admin page.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CuratorCorrectionRow {
  id: string;
  challenge_id: string;
  section_key: string;
  curator_action: string;
  edit_distance_percent: number;
  time_spent_seconds: number;
  confidence_score: number | null;
  ai_suggestion_hash: string | null;
  pattern_extracted: boolean | null;
  embedding: string | null;
  created_at: string;
  created_by: string | null;
}

interface CuratorCorrectionFilters {
  action?: string;
  sectionKey?: string;
}

export interface CorpusStats {
  total: number;
  byAction: Record<string, number>;
  embedded: number;
  patternsExtracted: number;
  avgEditDistance: number;
  avgTimeSpent: number;
}

function computeStats(rows: CuratorCorrectionRow[]): CorpusStats {
  const byAction: Record<string, number> = {};
  let totalEdit = 0;
  let totalTime = 0;
  let embedded = 0;
  let patternsExtracted = 0;

  for (const r of rows) {
    byAction[r.curator_action] = (byAction[r.curator_action] ?? 0) + 1;
    totalEdit += r.edit_distance_percent;
    totalTime += r.time_spent_seconds;
    if (r.embedding) embedded++;
    if (r.pattern_extracted) patternsExtracted++;
  }

  return {
    total: rows.length,
    byAction,
    embedded,
    patternsExtracted,
    avgEditDistance: rows.length > 0 ? Math.round(totalEdit / rows.length) : 0,
    avgTimeSpent: rows.length > 0 ? Math.round(totalTime / rows.length) : 0,
  };
}

export function useCuratorCorrections(filters: CuratorCorrectionFilters = {}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['curator-corrections', filters.action, filters.sectionKey],
    queryFn: async () => {
      let query = supabase
        .from('curator_corrections')
        .select('id, challenge_id, section_key, curator_action, edit_distance_percent, time_spent_seconds, confidence_score, ai_suggestion_hash, pattern_extracted, embedding, created_at, created_by')
        .order('created_at', { ascending: false })
        .limit(200);

      if (filters.action && filters.action !== 'all') {
        query = query.eq('curator_action', filters.action);
      }
      if (filters.sectionKey && filters.sectionKey !== 'all') {
        query = query.eq('section_key', filters.sectionKey);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data ?? []) as CuratorCorrectionRow[];
    },
    staleTime: 30_000,
  });

  const stats = computeStats(data ?? []);

  return { corrections: data ?? [], stats, isLoading, error };
}
