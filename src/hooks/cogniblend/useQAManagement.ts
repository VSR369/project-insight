/**
 * useQAManagement — Hooks for challenge Q&A management (answer, publish, route, close).
 * Fetches all questions for a challenge (not just published).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { withUpdatedBy } from '@/lib/auditFields';
import { toast } from 'sonner';
import { logCommunication } from '@/lib/communicationLogger';

export interface ManagedQARow {
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

/** Fetch ALL questions for a challenge (team view). */
export function useAllChallengeQuestions(challengeId: string | undefined) {
  return useQuery({
    queryKey: ['challenge_qa', 'all', challengeId],
    queryFn: async (): Promise<ManagedQARow[]> => {
      if (!challengeId) return [];
      const { data, error } = await supabase
        .from('challenge_qa' as any)
        .select('qa_id, challenge_id, asked_by, question_text, anonymous_id, answer_text, answered_by, is_published, is_closed, asked_at, answered_at')
        .eq('challenge_id', challengeId)
        .order('asked_at', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as ManagedQARow[];
    },
    enabled: !!challengeId,
    staleTime: 15_000,
  });
}

/** Answer a question inline. */
export function useAnswerQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ qaId, challengeId, answerText, userId }: {
      qaId: string; challengeId: string; answerText: string; userId: string;
    }) => {
      const payload = await withUpdatedBy({
        answer_text: answerText,
        answered_by: userId,
        answered_at: new Date().toISOString(),
      });
      const { error } = await supabase
        .from('challenge_qa' as any)
        .update(payload as any)
        .eq('qa_id', qaId);
      if (error) throw new Error(error.message);

      // Log answer to communication_log
      await logCommunication({
        challengeId,
        senderId: userId,
        messageText: answerText,
        channel: 'QA',
      });

      // Audit
      await supabase.from('audit_trail').insert({
        user_id: userId,
        challenge_id: challengeId,
        action: 'QA_ANSWERED',
        method: 'HUMAN',
        details: { qa_id: qaId },
      });
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['challenge_qa', 'all', v.challengeId] });
      qc.invalidateQueries({ queryKey: ['challenge_qa', 'published', v.challengeId] });
      toast.success('Answer saved');
    },
    onError: (e: Error) => toast.error(`Failed to save answer: ${e.message}`),
  });
}

/** Publish a Q&A pair (makes it visible to solvers). */
export function usePublishAnswer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ qaId, challengeId, userId }: {
      qaId: string; challengeId: string; userId: string;
    }) => {
      const payload = await withUpdatedBy({ is_published: true });
      const { error } = await supabase
        .from('challenge_qa' as any)
        .update(payload as any)
        .eq('qa_id', qaId);
      if (error) throw new Error(error.message);

      await supabase.from('audit_trail').insert({
        user_id: userId,
        challenge_id: challengeId,
        action: 'QA_PUBLISHED',
        method: 'USER',
        details: { qa_id: qaId },
      });
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['challenge_qa', 'all', v.challengeId] });
      qc.invalidateQueries({ queryKey: ['challenge_qa', 'published', v.challengeId] });
      toast.success('Answer published and visible to solvers');
    },
    onError: (e: Error) => toast.error(`Failed to publish: ${e.message}`),
  });
}

/** Route a question to Architect (MP) or Creator (AGG). */
export function useRouteQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ qaId, challengeId, challengeTitle, operatingModel, userId }: {
      qaId: string; challengeId: string; challengeTitle: string;
      operatingModel: string; userId: string;
    }) => {
      // Determine target role
      const targetRole = operatingModel === 'MP' ? 'CR' : 'CR'; // Architect=CR in MP, Creator=CR in AGG

      // Get target users
      const { data: targets } = await supabase
        .from('user_challenge_roles')
        .select('user_id')
        .eq('challenge_id', challengeId)
        .eq('role_code', targetRole)
        .eq('is_active', true);

      if (targets && targets.length > 0) {
        const notifications = targets.map((t: any) => ({
          user_id: t.user_id,
          challenge_id: challengeId,
          notification_type: 'QA_ROUTED',
          title: 'Q&A Question Routed to You',
          message: `A question on "${challengeTitle}" has been routed to you for answering.`,
        }));
        await supabase.from('cogni_notifications').insert(notifications);
      }

      await supabase.from('audit_trail').insert({
        user_id: userId,
        challenge_id: challengeId,
        action: 'QA_ROUTED',
        method: 'USER',
        details: { qa_id: qaId, target_role: targetRole },
      });
    },
    onSuccess: () => toast.success('Question routed successfully'),
    onError: (e: Error) => toast.error(`Failed to route: ${e.message}`),
  });
}

const BATCH_SIZE = 50;

/** Close Q&A for a challenge. */
export function useCloseQA() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ challengeId, challengeTitle, userId }: {
      challengeId: string; challengeTitle: string; userId: string;
    }) => {
      const payload = await withUpdatedBy({ is_qa_closed: true });
      const { error } = await supabase
        .from('challenges')
        .update(payload as any)
        .eq('id', challengeId);
      if (error) throw new Error(error.message);

      // Notify enrolled solvers
      const { data: subs } = await supabase
        .from('challenge_submissions')
        .select('user_id')
        .eq('challenge_id', challengeId)
        .eq('is_deleted', false)
        .not('user_id', 'is', null);

      if (subs && subs.length > 0) {
        const uniqueUsers = [...new Set(subs.map((s: any) => s.user_id).filter(Boolean))];
        const rows = uniqueUsers.map((uid) => ({
          user_id: uid,
          challenge_id: challengeId,
          notification_type: 'QA_CLOSED',
          title: 'Q&A Closed',
          message: `Q&A for "${challengeTitle}" has been closed. No new questions can be submitted.`,
        }));
        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
          await supabase.from('cogni_notifications').insert(rows.slice(i, i + BATCH_SIZE));
        }
      }

      await supabase.from('audit_trail').insert({
        user_id: userId,
        challenge_id: challengeId,
        action: 'QA_CLOSED',
        method: 'USER',
        details: {},
      });
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['challenge-qa-closed', v.challengeId] });
      toast.success('Q&A closed successfully');
    },
    onError: (e: Error) => toast.error(`Failed to close Q&A: ${e.message}`),
  });
}
