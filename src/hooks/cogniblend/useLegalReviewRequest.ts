/**
 * useLegalReviewRequest — Mutation hook for sending legal docs to LC for review.
 *
 * Creates a legal_review_requests record and sets lc_status = 'pending_review'
 * on the target document(s). Invokes notify-lc-review edge function.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ReviewRequestParams {
  challengeId: string;
  /** Specific document ID, or null to request review for all docs */
  documentId: string | null;
  /** LC user_id if known; null = first LC on challenge */
  lcUserId: string | null;
  /** true when triggered by mandatory lc_review_required workflow */
  isMandatory: boolean;
  notes?: string;
}

export function useLegalReviewRequest() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: ReviewRequestParams) => {
      if (!user?.id) throw new Error('Authentication required');

      // If no specific LC user, resolve the first active LC on the challenge
      let lcUserId = params.lcUserId;
      if (!lcUserId) {
        const { data: lcRoles } = await supabase
          .from('user_challenge_roles')
          .select('user_id')
          .eq('challenge_id', params.challengeId)
          .eq('role_code', 'LC')
          .eq('is_active', true)
          .limit(1);

        lcUserId = lcRoles?.[0]?.user_id ?? null;
      }

      // Insert review request
      const { data: request, error } = await supabase
        .from('legal_review_requests' as any)
        .insert({
          challenge_id: params.challengeId,
          document_id: params.documentId,
          requested_by: user.id,
          lc_user_id: lcUserId,
          is_mandatory: params.isMandatory,
          notes: params.notes ?? null,
          status: 'pending',
          created_by: user.id,
        })
        .select('id')
        .single();

      if (error) throw new Error(error.message);

      // Set lc_status = 'pending_review' on target doc(s)
      if (params.documentId) {
        await supabase
          .from('challenge_legal_docs')
          .update({ lc_status: 'pending_review' } as any)
          .eq('id', params.documentId);
      } else {
        // All docs on the challenge
        await supabase
          .from('challenge_legal_docs')
          .update({ lc_status: 'pending_review' } as any)
          .eq('challenge_id', params.challengeId);
      }

      // Best-effort notification to LC
      if (lcUserId) {
        supabase.functions.invoke('notify-lc-review', {
          body: {
            challenge_id: params.challengeId,
            document_id: params.documentId,
            lc_user_id: lcUserId,
            requested_by: user.id,
            request_id: (request as any)?.id,
          },
        }).catch(() => {
          // Non-blocking — notification is best-effort
        });
      }

      return request;
    },
    onSuccess: (_data, params) => {
      queryClient.invalidateQueries({ queryKey: ['lc-review-status', params.challengeId] });
      queryClient.invalidateQueries({ queryKey: ['legal-review-requests', params.challengeId] });
      toast.success('Legal review request sent to Legal Coordinator');
    },
    onError: (error: Error) => {
      toast.error(`Failed to send review request: ${error.message}`);
    },
  });
}
