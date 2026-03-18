/**
 * useDuplicateReview — Hooks for the duplicate challenge review workflow.
 *
 * - useCreateDuplicateReview: Creates a PENDING review when high-similarity detected
 * - usePendingDuplicateReviews: Fetches pending reviews for a challenge
 * - useDuplicateFlagForChallenge: Quick check if challenge has a pending flag
 * - useResolveDuplicateReview: Confirm or dismiss a duplicate flag
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';
import { withCreatedBy, withUpdatedBy } from '@/lib/auditFields';
import { CACHE_STANDARD } from '@/config/queryCache';

/* ─── Types ──────────────────────────────────────────────── */

export interface DuplicateReview {
  id: string;
  challenge_id: string;
  matched_challenge_id: string;
  similarity_percent: number;
  status: 'PENDING' | 'CONFIRMED_DUPLICATE' | 'DISMISSED';
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  matchedChallengeTitle?: string;
  matchedChallengeStatus?: string;
  challengeTitle?: string;
}

/* ─── useCreateDuplicateReview ───────────────────────────── */

export function useCreateDuplicateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      challengeId,
      matchedChallengeId,
      similarityPercent,
    }: {
      challengeId: string;
      matchedChallengeId: string;
      similarityPercent: number;
    }) => {
      // Check if a review already exists for this pair
      const { data: existing } = await supabase
        .from('duplicate_reviews')
        .select('id')
        .eq('challenge_id', challengeId)
        .eq('matched_challenge_id', matchedChallengeId)
        .eq('status', 'PENDING')
        .maybeSingle();

      if (existing) return existing; // Already flagged

      const withAudit = await withCreatedBy({
        challenge_id: challengeId,
        matched_challenge_id: matchedChallengeId,
        similarity_percent: similarityPercent,
        status: 'PENDING',
      });

      const { data, error } = await supabase
        .from('duplicate_reviews')
        .insert(withAudit as any)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['duplicate-reviews', variables.challengeId] });
      queryClient.invalidateQueries({ queryKey: ['duplicate-flag'] });
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'create_duplicate_review' });
    },
  });
}

/* ─── usePendingDuplicateReviews ─────────────────────────── */

export function usePendingDuplicateReviews(challengeId: string | undefined) {
  return useQuery({
    queryKey: ['duplicate-reviews', challengeId],
    queryFn: async (): Promise<DuplicateReview[]> => {
      if (!challengeId) return [];

      const { data, error } = await supabase
        .from('duplicate_reviews')
        .select('id, challenge_id, matched_challenge_id, similarity_percent, status, reviewed_by, reviewed_at, review_notes, created_at')
        .eq('challenge_id', challengeId)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);

      // Enrich with matched challenge titles
      const matchedIds = (data ?? []).map(d => d.matched_challenge_id);
      if (matchedIds.length === 0) return [];

      const { data: challenges } = await supabase
        .from('challenges')
        .select('id, title, master_status')
        .in('id', matchedIds);

      const titleMap = new Map(
        (challenges ?? []).map(c => [c.id, { title: c.title, status: c.master_status }])
      );

      return (data ?? []).map(d => ({
        ...d,
        status: d.status as DuplicateReview['status'],
        matchedChallengeTitle: titleMap.get(d.matched_challenge_id)?.title ?? 'Unknown',
        matchedChallengeStatus: titleMap.get(d.matched_challenge_id)?.status ?? 'UNKNOWN',
      }));
    },
    enabled: !!challengeId,
    ...CACHE_STANDARD,
  });
}

/* ─── useDuplicateFlagForChallenge ───────────────────────── */

export function useDuplicateFlagForChallenge(challengeId: string | undefined) {
  return useQuery({
    queryKey: ['duplicate-flag', challengeId],
    queryFn: async (): Promise<boolean> => {
      if (!challengeId) return false;

      const { count, error } = await supabase
        .from('duplicate_reviews')
        .select('id', { count: 'exact', head: true })
        .eq('challenge_id', challengeId)
        .eq('status', 'PENDING');

      if (error) return false;
      return (count ?? 0) > 0;
    },
    enabled: !!challengeId,
    ...CACHE_STANDARD,
  });
}

/* ─── useResolveDuplicateReview ──────────────────────────── */

export function useResolveDuplicateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reviewId,
      challengeId,
      resolution,
      userId,
      notes,
    }: {
      reviewId: string;
      challengeId: string;
      resolution: 'CONFIRMED_DUPLICATE' | 'DISMISSED';
      userId: string;
      notes?: string;
    }) => {
      const now = new Date().toISOString();

      // 1. Update duplicate review record
      const withAudit = await withUpdatedBy({
        status: resolution,
        reviewed_by: userId,
        reviewed_at: now,
        review_notes: notes ?? null,
        updated_at: now,
      });

      const { error: updateErr } = await supabase
        .from('duplicate_reviews')
        .update(withAudit as any)
        .eq('id', reviewId);

      if (updateErr) throw new Error(updateErr.message);

      // 2. If confirmed duplicate: terminate the challenge
      if (resolution === 'CONFIRMED_DUPLICATE') {
        const statusUpdate = await withUpdatedBy({
          master_status: 'TERMINATED',
          is_active: false,
          updated_at: now,
        });

        const { error: chErr } = await supabase
          .from('challenges')
          .update(statusUpdate as any)
          .eq('id', challengeId);

        if (chErr) throw new Error(chErr.message);
      }

      // 3. Audit trail
      const { error: auditErr } = await supabase
        .from('audit_trail')
        .insert({
          user_id: userId,
          action: resolution === 'CONFIRMED_DUPLICATE'
            ? 'DUPLICATE_CONFIRMED'
            : 'DUPLICATE_DISMISSED',
          method: 'UI',
          challenge_id: challengeId,
          details: {
            review_id: reviewId,
            resolution,
            notes: notes ?? null,
            timestamp: now,
          },
        });

      if (auditErr) throw new Error(auditErr.message);

      return { resolution };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['duplicate-reviews', variables.challengeId] });
      queryClient.invalidateQueries({ queryKey: ['duplicate-flag', variables.challengeId] });
      queryClient.invalidateQueries({ queryKey: ['cogni-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['manage-challenge', variables.challengeId] });

      if (result.resolution === 'CONFIRMED_DUPLICATE') {
        toast.success('Duplicate confirmed — challenge terminated.');
      } else {
        toast.success('Duplicate flag dismissed — challenge proceeds normally.');
      }
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'resolve_duplicate_review' });
    },
  });
}
