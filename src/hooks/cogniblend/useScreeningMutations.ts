/** Mutations for abstract scoring, review decisions and final shortlist approval. */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';
import { withCreatedBy, withUpdatedBy } from '@/lib/auditFields';
import {
  approveAbstractShortlist,
  setAbstractSelection,
  type AbstractSelection,
} from '@/services/cogniblend/lifecycle/shortlisting';

interface ScoreAbstractInput {
  existingEvalId: string | null;
  solutionId: string;
  reviewerId: string;
  rubricScores: Record<string, number>;
  commentary: string;
  individualScore: number;
}

export function useScoreAbstract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ScoreAbstractInput) => {
      const values = {
        solution_id: input.solutionId,
        reviewer_id: input.reviewerId,
        review_round: 1,
        rubric_scores: input.rubricScores,
        commentary: input.commentary,
        individual_score: input.individualScore,
        conflict_declared: false,
        submitted_at: new Date().toISOString(),
      };
      if (input.existingEvalId) {
        const audited = await withUpdatedBy({ ...values, updated_at: new Date().toISOString() });
        const { data, error } = await supabase
          .from('evaluation_records')
          .update(audited)
          .eq('id', input.existingEvalId)
          .select('id, solution_id, reviewer_id, individual_score, rubric_scores, commentary')
          .single();
        if (error) throw new Error(error.message);
        return data;
      }
      const audited = await withCreatedBy(values);
      const { data, error } = await supabase
        .from('evaluation_records')
        .insert(audited)
        .select('id, solution_id, reviewer_id, individual_score, rubric_scores, commentary')
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['screening-review'] });
      toast.success('Scores saved successfully');
    },
    onError: (error: Error) => handleMutationError(error, { operation: 'score_abstract' }),
  });
}

function useAbstractSelectionMutation(selection: AbstractSelection) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ solutionId }: { solutionId: string }) => setAbstractSelection(solutionId, selection),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['screening-review'] });
      toast.success(selection === 'SHORTLISTED' ? 'Abstract shortlisted' : 'Abstract rejected');
    },
    onError: (error: Error) => handleMutationError(error, {
      operation: selection === 'SHORTLISTED' ? 'shortlist_abstract' : 'reject_abstract',
      component: 'AbstractDetail',
    }),
  });
}

export function useShortlistAbstract() {
  return useAbstractSelectionMutation('SHORTLISTED');
}

export function useRejectAbstract() {
  return useAbstractSelectionMutation('REJECTED');
}

export function useApproveShortlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ challengeId }: { challengeId: string }) => approveAbstractShortlist(challengeId),
    onSuccess: (result, { challengeId }) => {
      queryClient.invalidateQueries({ queryKey: ['screening-review', challengeId] });
      queryClient.invalidateQueries({ queryKey: ['shortlist-status', challengeId] });
      toast.success(
        `Shortlist approved: ${result.shortlistedCount} shortlisted, ${result.rejectedCount} rejected. Solution Providers notified.`,
      );
    },
    onError: (error: Error) => handleMutationError(error, {
      operation: 'approve_shortlist',
      component: 'ScreeningReviewPage',
    }),
  });
}
