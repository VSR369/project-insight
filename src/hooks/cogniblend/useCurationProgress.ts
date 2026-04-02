/**
 * useCurationProgress — Live curation progress tracking with Supabase Realtime.
 * Provides Creator-side visibility into AI review + curator editing progress.
 */

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CurationProgress {
  challenge_id: string;
  status: 'waiting' | 'context_research' | 'ai_review' | 'curator_editing' | 'sent_for_approval' | 'completed';
  sections_reviewed: number;
  sections_total: number;
  current_wave: number | null;
  context_sources_count: number;
  digest_generated: boolean;
  ai_review_started_at: string | null;
  ai_review_completed_at: string | null;
  curator_editing_started_at: string | null;
  last_section_saved_at: string | null;
  estimated_minutes_remaining: number | null;
  updated_at: string;
}

export function useCurationProgress(challengeId: string | undefined) {
  const queryClient = useQueryClient();
  const queryKey = ['curation-progress', challengeId];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!challengeId) return null;
      const { data, error } = await (supabase
        .from('curation_progress' as any)
        .select('*')
        .eq('challenge_id', challengeId)
        .maybeSingle() as any);
      if (error) throw error;
      return (data as CurationProgress) ?? null;
    },
    enabled: !!challengeId,
    staleTime: 10_000,
  });

  // Subscribe to Realtime updates
  useEffect(() => {
    if (!challengeId) return;
    const channel = supabase
      .channel(`progress-${challengeId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'curation_progress',
        filter: `challenge_id=eq.${challengeId}`,
      }, (payload) => {
        queryClient.setQueryData(queryKey, payload.new as CurationProgress);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challengeId, queryClient]);

  return query;
}

/** Mutation to update progress (called from Curator-side code) */
export function useUpdateCurationProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      params: { challengeId: string } & Partial<Omit<CurationProgress, 'challenge_id'>>
    ) => {
      const { challengeId, ...updates } = params;
      const { error } = await supabase
        .from('curation_progress' as any)
        .upsert({
          challenge_id: challengeId,
          ...updates,
          updated_at: new Date().toISOString(),
        } as any);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['curation-progress', vars.challengeId] });
    },
  });
}
