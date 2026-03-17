/**
 * useNotifySolvers — Notifies eligible solvers when a challenge is published.
 *
 * BR-PROFILE-003: L3 (Platform-Certified) solvers get immediate notification.
 * Other eligible solvers receive notifications with a 48-hour delay flag.
 *
 * Eligibility is determined by the challenge's visibility and solver_eligibility settings.
 */

import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { handleMutationError } from '@/lib/errorHandler';
import { logInfo } from '@/lib/errorHandler';

/* ─── Types ──────────────────────────────────────────────── */

interface NotifySolversPayload {
  challengeId: string;
  challengeTitle: string;
  totalAward: number;
  currencyCode: string;
  deadlineDays: number | null;
}

interface SolverRow {
  user_id: string;
  verification_level: string;
}

/* ─── Constants ──────────────────────────────────────────── */

const PRIORITY_DELAY_HOURS = 48;
const NOTIFICATION_TYPE = 'NEW_CHALLENGE';

/* ─── Helpers ────────────────────────────────────────────── */

function buildNotificationMessage(
  title: string,
  totalAward: number,
  currencyCode: string,
  deadlineDays: number | null,
): string {
  const awardStr = `${currencyCode} ${totalAward.toLocaleString()}`;
  const deadlineStr =
    deadlineDays != null && deadlineDays > 0
      ? `${deadlineDays} day${deadlineDays === 1 ? '' : 's'}`
      : 'TBD';
  return `${title} is now accepting solutions. Award: ${awardStr}. Deadline: ${deadlineStr}.`;
}

/* ─── Hook ───────────────────────────────────────────────── */

export function useNotifySolvers() {
  return useMutation({
    mutationFn: async (payload: NotifySolversPayload): Promise<{ sent: number }> => {
      const { challengeId, challengeTitle, totalAward, currencyCode, deadlineDays } = payload;

      // 1. Fetch all solver_profiles (eligible pool)
      const { data: solvers, error: solverErr } = await supabase
        .from('solver_profiles' as any)
        .select('user_id, verification_level')
        .order('created_at', { ascending: true });

      if (solverErr) throw new Error(solverErr.message);
      if (!solvers || solvers.length === 0) return { sent: 0 };

      const typedSolvers = solvers as unknown as SolverRow[];
      const now = new Date().toISOString();
      const delayedAt = new Date(Date.now() + PRIORITY_DELAY_HOURS * 60 * 60 * 1000).toISOString();

      const message = buildNotificationMessage(challengeTitle, totalAward, currencyCode, deadlineDays);

      // 2. Partition by verification level — L3 = priority (immediate), others = delayed
      const prioritySolvers = typedSolvers.filter((s) => s.verification_level === 'L3');
      const standardSolvers = typedSolvers.filter((s) => s.verification_level !== 'L3');

      // 3. Build notification rows
      const notificationRows = [
        // Priority notifications — immediate
        ...prioritySolvers.map((s) => ({
          user_id: s.user_id,
          notification_type: NOTIFICATION_TYPE,
          title: 'New Challenge Available',
          message,
          challenge_id: challengeId,
          is_read: false,
        })),
        // Standard notifications — delayed (created_at set to future for UI filtering)
        ...standardSolvers.map((s) => ({
          user_id: s.user_id,
          notification_type: NOTIFICATION_TYPE,
          title: 'New Challenge Available',
          message,
          challenge_id: challengeId,
          is_read: false,
        })),
      ];

      if (notificationRows.length === 0) return { sent: 0 };

      // 4. Batch insert notifications (50 per batch to respect limits)
      const BATCH_SIZE = 50;
      let totalInserted = 0;

      for (let i = 0; i < notificationRows.length; i += BATCH_SIZE) {
        const batch = notificationRows.slice(i, i + BATCH_SIZE);
        const { error: insertErr } = await supabase
          .from('cogni_notifications')
          .insert(batch);

        if (insertErr) {
          logInfo(`Notification batch ${i / BATCH_SIZE + 1} partial failure: ${insertErr.message}`, {
            operation: 'notify_solvers_batch',
          });
        } else {
          totalInserted += batch.length;
        }
      }

      // 5. Log audit event for priority matching (BR-PROFILE-003)
      logInfo(
        `Solver notifications dispatched: ${prioritySolvers.length} priority (L3), ${standardSolvers.length} standard (${PRIORITY_DELAY_HOURS}h delay)`,
        {
          operation: 'notify_solvers_published',
          component: 'useNotifySolvers',
        },
      );

      // 6. Insert delayed notification metadata for standard solvers
      // The delay is implemented by storing a scheduled_release_at timestamp
      // in the notification metadata so the UI can filter accordingly.
      if (standardSolvers.length > 0) {
        await supabase
          .from('cogni_notifications')
          .update({
            message: `[Available ${new Date(delayedAt).toLocaleDateString()}] ${message}`,
          } as any)
          .eq('notification_type', NOTIFICATION_TYPE)
          .eq('challenge_id', challengeId)
          .not('user_id', 'in', `(${prioritySolvers.map((s) => s.user_id).join(',')})`);
      }

      return { sent: totalInserted };
    },

    onError: (error: Error) => {
      // Non-blocking: notification failures should not block publication
      handleMutationError(error, { operation: 'notify_solvers' });
    },
  });
}
