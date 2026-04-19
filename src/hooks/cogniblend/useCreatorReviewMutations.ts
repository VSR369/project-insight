/**
 * useCreatorReviewMutations — Sprint 6B Creator-side comment + edit mutations.
 *
 * Split out of useCreatorReview to keep that hook under the 250-line cap.
 * Owns the comment-only feedback channels for legal docs and escrow:
 *   - submitLegalComment → challenge_legal_docs.creator_comments (UNIFIED_SPA)
 *   - submitEscrowComment → challenges.creator_escrow_comments
 * Both insert a `challenge_edit_history` row for Curator visibility.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { withUpdatedBy } from '@/lib/auditFields';
import { handleMutationError } from '@/lib/errorHandler';

/** Sections Creator can ONLY add comments on (post Curator/LC/FC approval). */
export const CREATOR_COMMENT_ONLY_SECTIONS = new Set<string>([
  'legal_docs',
  'escrow_funding',
]);

interface UseCreatorReviewMutationsArgs {
  challengeId: string | undefined;
}

export function useCreatorReviewMutations({ challengeId }: UseCreatorReviewMutationsArgs) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['creator-review', challengeId] });
    queryClient.invalidateQueries({ queryKey: ['creator-review-legal', challengeId] });
    queryClient.invalidateQueries({ queryKey: ['pass3-legal-review', challengeId] });
  };

  const submitLegalComment = useMutation({
    mutationFn: async (comment: string) => {
      if (!challengeId || !user?.id) throw new Error('Missing challenge or user');
      // Find the latest UNIFIED_SPA row.
      const { data: doc, error: findErr } = await supabase
        .from('challenge_legal_docs')
        .select('id, creator_comments')
        .eq('challenge_id', challengeId)
        .eq('document_type', 'UNIFIED_SPA')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (findErr) throw new Error(findErr.message);
      if (!doc?.id) throw new Error('Legal document not found');

      const before = (doc as { creator_comments?: string | null }).creator_comments ?? null;
      const updates = await withUpdatedBy({ creator_comments: comment });
      const { error } = await supabase
        .from('challenge_legal_docs')
        .update(updates)
        .eq('id', doc.id as string);
      if (error) throw new Error(error.message);

      // Best-effort history insert.
      await supabase.from('challenge_edit_history').insert({
        challenge_id: challengeId,
        section_key: 'legal_docs',
        edited_by: user.id,
        role: 'CR',
        before_value: { creator_comments: before } as never,
        after_value: { creator_comments: comment } as never,
        edit_source: 'creator_comment',
      });
    },
    onSuccess: () => {
      invalidate();
      toast.success('Legal comment saved');
    },
    onError: (e) =>
      handleMutationError(e, {
        operation: 'submit_legal_comment',
        component: 'useCreatorReviewMutations',
      }),
  });

  const submitEscrowComment = useMutation({
    mutationFn: async (comment: string) => {
      if (!challengeId || !user?.id) throw new Error('Missing challenge or user');

      const { data: prior } = await supabase
        .from('challenges')
        .select('creator_escrow_comments')
        .eq('id', challengeId)
        .maybeSingle();
      const before =
        (prior as { creator_escrow_comments?: string | null } | null)
          ?.creator_escrow_comments ?? null;

      const updates = await withUpdatedBy({ creator_escrow_comments: comment });
      const { error } = await supabase
        .from('challenges')
        .update(updates)
        .eq('id', challengeId);
      if (error) throw new Error(error.message);

      await supabase.from('challenge_edit_history').insert({
        challenge_id: challengeId,
        section_key: 'escrow_funding',
        edited_by: user.id,
        role: 'CR',
        before_value: { creator_escrow_comments: before } as never,
        after_value: { creator_escrow_comments: comment } as never,
        edit_source: 'creator_comment',
      });
    },
    onSuccess: () => {
      invalidate();
      toast.success('Escrow comment saved');
    },
    onError: (e) =>
      handleMutationError(e, {
        operation: 'submit_escrow_comment',
        component: 'useCreatorReviewMutations',
      }),
  });

  return {
    submitLegalComment: (comment: string) => submitLegalComment.mutate(comment),
    submitEscrowComment: (comment: string) => submitEscrowComment.mutate(comment),
    isSubmittingLegalComment: submitLegalComment.isPending,
    isSubmittingEscrowComment: submitEscrowComment.isPending,
  };
}
