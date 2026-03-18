/**
 * useExtendDeadline — Extends challenge submission deadline.
 *
 * Updates challenges.submission_deadline, logs audit trail,
 * and notifies all enrolled solvers of the extension.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { handleMutationError, logInfo } from '@/lib/errorHandler';

/* ─── Types ──────────────────────────────────────────────── */

interface ExtendDeadlinePayload {
  challengeId: string;
  challengeTitle: string;
  userId: string;
  oldDeadline: string;
  newDeadline: string;
  reason: string;
  notifySolvers: boolean;
}

/* ─── Constants ──────────────────────────────────────────── */

const BATCH_SIZE = 50;

/* ─── Hook ───────────────────────────────────────────────── */

export function useExtendDeadline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ExtendDeadlinePayload): Promise<void> => {
      const { challengeId, challengeTitle, userId, oldDeadline, newDeadline, reason, notifySolvers } = payload;

      // 1. Update submission_deadline
      const { error: updateErr } = await supabase
        .from('challenges')
        .update({
          submission_deadline: newDeadline,
          updated_at: new Date().toISOString(),
          updated_by: userId,
        })
        .eq('id', challengeId);

      if (updateErr) throw new Error(updateErr.message);

      // 2. Log audit trail
      const { error: auditErr } = await supabase.from('audit_trail').insert({
        user_id: userId,
        challenge_id: challengeId,
        action: 'DEADLINE_EXTENDED',
        method: 'manual',
        details: {
          old_date: oldDeadline,
          new_date: newDeadline,
          reason,
        } as any,
        created_by: userId,
      });

      if (auditErr) {
        logInfo(`Audit log failed for deadline extension: ${auditErr.message}`, {
          operation: 'extend_deadline_audit',
        });
      }

      // 3. Conditionally notify solvers
      if (notifySolvers) {
        const { data: submissions } = await supabase
          .from('challenge_submissions')
          .select('user_id')
          .eq('challenge_id', challengeId)
          .eq('is_deleted', false)
          .not('user_id', 'is', null);

        const solverUserIds = [
          ...new Set((submissions ?? []).map((s) => s.user_id).filter(Boolean)),
        ] as string[];

        if (solverUserIds.length > 0) {
          const formattedDate = new Date(newDeadline).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });

          const notificationRows = solverUserIds.map((uid) => ({
            user_id: uid,
            notification_type: 'DEADLINE_EXTENDED',
            title: 'Submission Deadline Extended',
            message: `The submission deadline for ${challengeTitle} has been extended to ${formattedDate}. Reason: ${reason}`,
            challenge_id: challengeId,
            is_read: false,
          }));

          for (let i = 0; i < notificationRows.length; i += BATCH_SIZE) {
            const batch = notificationRows.slice(i, i + BATCH_SIZE);
            await supabase.from('cogni_notifications').insert(batch);
          }
        }
      }
    },

    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['manage-challenge', variables.challengeId] });
      queryClient.invalidateQueries({ queryKey: ['cogni-open-challenges'] });
      const formattedDate = new Date(variables.newDeadline).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      toast.success(`Deadline extended to ${formattedDate}`);
    },

    onError: (error: Error) => {
      handleMutationError(error, { operation: 'extend_deadline' });
    },
  });
}
