/**
 * useChallengeQA — Hooks for the Challenge Q&A data model.
 * - useChallengeQuestions: fetches published Q&A for a challenge
 * - useMyQuestions: fetches the current user's questions (published or not)
 * - useSubmitQuestion: calls the submit_question RPC
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { logCommunication } from '@/lib/communicationLogger';

export interface ChallengeQARow {
  qa_id: string;
  challenge_id: string;
  asked_by: string;
  question_text: string;
  anonymous_id: string | null;
  answer_text: string | null;
  answered_by: string | null;
  is_published: boolean;
  is_closed: boolean;
  asked_at: string;
  answered_at: string | null;
}

/**
 * Fetch all published Q&A entries for a challenge.
 */
export function useChallengeQuestions(challengeId: string | undefined) {
  return useQuery({
    queryKey: ['challenge_qa', 'published', challengeId],
    queryFn: async (): Promise<ChallengeQARow[]> => {
      if (!challengeId) return [];
      const { data, error } = await supabase
        .from('challenge_qa' as any)
        .select('qa_id, challenge_id, asked_by, question_text, anonymous_id, answer_text, answered_by, is_published, is_closed, asked_at, answered_at, compliance_flagged')
        .eq('challenge_id', challengeId)
        .eq('is_published', true)
        .order('asked_at', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as ChallengeQARow[];
    },
    enabled: !!challengeId,
    staleTime: 30_000,
  });
}

/**
 * Fetch the current user's own questions for a challenge (published or not).
 */
export function useMyQuestions(challengeId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['challenge_qa', 'mine', challengeId, user?.id],
    queryFn: async (): Promise<ChallengeQARow[]> => {
      if (!challengeId || !user?.id) return [];
      const { data, error } = await supabase
        .from('challenge_qa' as any)
        .select('qa_id, challenge_id, asked_by, question_text, anonymous_id, answer_text, answered_by, is_published, is_closed, asked_at, answered_at, compliance_flagged')
        .eq('challenge_id', challengeId)
        .eq('asked_by', user.id)
        .order('asked_at', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as ChallengeQARow[];
    },
    enabled: !!challengeId && !!user?.id,
    staleTime: 30_000,
  });
}

/**
 * Submit a new question via the submit_question RPC.
 */
export function useSubmitQuestion() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      challengeId,
      questionText,
      complianceFlagged,
      complianceFlagReason,
    }: {
      challengeId: string;
      questionText: string;
      complianceFlagged?: boolean;
      complianceFlagReason?: string;
    }): Promise<string> => {
      if (!user?.id) throw new Error('Authentication required');

      const { data, error } = await supabase.rpc('submit_question' as any, {
        p_challenge_id: challengeId,
        p_user_id: user.id,
        p_question_text: questionText,
      });
      if (error) throw new Error(error.message);
      const qaId = data as unknown as string;

      // BR-COM-003: Flag for compliance review if contact info detected
      if (complianceFlagged && qaId) {
        await supabase
          .from('challenge_qa' as any)
          .update({
            compliance_flagged: true,
            compliance_flagged_at: new Date().toISOString(),
            compliance_flag_reason: complianceFlagReason ?? null,
          })
          .eq('qa_id', qaId);
      }

      return qaId;
    },
    onSuccess: (_qaId, variables) => {
      queryClient.invalidateQueries({ queryKey: ['challenge_qa', 'published', variables.challengeId] });
      queryClient.invalidateQueries({ queryKey: ['challenge_qa', 'mine', variables.challengeId] });
      toast.success('Question submitted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to submit question: ${error.message}`);
    },
  });
}
