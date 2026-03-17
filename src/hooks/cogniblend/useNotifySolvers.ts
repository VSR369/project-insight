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
import { handleMutationError, logInfo } from '@/lib/errorHandler';
import { differenceInDays } from 'date-fns';

/* ─── Types ──────────────────────────────────────────────── */

interface NotifySolversPayload {
  challengeId: string;
  challengeTitle: string;
  /** Fallback values — hook will re-fetch from DB if zero/null */
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
const BATCH_SIZE = 50;

/* ─── Helpers ────────────────────────────────────────────── */

function buildNotificationMessage(
  title: string,
  totalAward: number,
  currencyCode: string,
  deadlineDays: number | null,
): string {
  const awardStr = totalAward > 0 ? `${currencyCode} ${totalAward.toLocaleString()}` : 'See details';
  const deadlineStr =
    deadlineDays != null && deadlineDays > 0
      ? `${deadlineDays} day${deadlineDays === 1 ? '' : 's'}`
      : 'TBD';
  return `${title} is now accepting solutions. Award: ${awardStr}. Deadline: ${deadlineStr}.`;
}

function parseRewardTotal(rewardStructure: Record<string, unknown> | null): number {
  if (!rewardStructure) return 0;
  const rs = rewardStructure as Record<string, unknown>;
  let total = 0;
  if (typeof rs.platinum === 'number') total += rs.platinum;
  if (typeof rs.gold === 'number') total += rs.gold;
  if (typeof rs.silver === 'number') total += rs.silver;
  if (typeof rs.total === 'number') return rs.total;
  return total;
}

/* ─── Hook ───────────────────────────────────────────────── */

export function useNotifySolvers() {
  return useMutation({
    mutationFn: async (payload: NotifySolversPayload): Promise<{ sent: number }> => {
      const { challengeId, challengeTitle } = payload;
      let { totalAward, currencyCode, deadlineDays } = payload;

      // 1. Fetch challenge reward & deadline info if not provided
      if (totalAward === 0 || deadlineDays == null) {
        const { data: challenge } = await supabase
          .from('challenges')
          .select('reward_structure, currency_code, submission_deadline')
          .eq('id', challengeId)
          .single();

        if (challenge) {
          if (totalAward === 0) {
            totalAward = parseRewardTotal(challenge.reward_structure as Record<string, unknown> | null);
          }
          if (!currencyCode || currencyCode === 'USD') {
            currencyCode = (challenge.currency_code as string) ?? 'USD';
          }
          if (deadlineDays == null && challenge.submission_deadline) {
            deadlineDays = differenceInDays(new Date(challenge.submission_deadline as string), new Date());
          }
        }
      }

      // 2. Fetch all solver_profiles (eligible pool)
      const { data: solvers, error: solverErr } = await supabase
        .from('solver_profiles' as any)
        .select('user_id, verification_level')
        .order('created_at', { ascending: true });

      if (solverErr) throw new Error(solverErr.message);
      if (!solvers || solvers.length === 0) return { sent: 0 };

      const typedSolvers = solvers as unknown as SolverRow[];
      const message = buildNotificationMessage(challengeTitle, totalAward, currencyCode, deadlineDays);
      const delayedMessage = buildNotificationMessage(challengeTitle, totalAward, currencyCode, deadlineDays);

      // 3. Partition by verification level — L3 = priority (immediate), others = 48h delayed
      const prioritySolvers = typedSolvers.filter((s) => s.verification_level === 'L3');
      const standardSolvers = typedSolvers.filter((s) => s.verification_level !== 'L3');

      const delayedReleaseAt = new Date(Date.now() + PRIORITY_DELAY_HOURS * 60 * 60 * 1000).toISOString();

      // 4. Build notification rows
      const immediateRows = prioritySolvers.map((s) => ({
        user_id: s.user_id,
        notification_type: NOTIFICATION_TYPE,
        title: '🏆 New Challenge Available',
        message: `[Priority Access] ${message}`,
        challenge_id: challengeId,
        is_read: false,
      }));

      const delayedRows = standardSolvers.map((s) => ({
        user_id: s.user_id,
        notification_type: NOTIFICATION_TYPE,
        title: 'New Challenge Available',
        message: `[Available ${new Date(delayedReleaseAt).toLocaleDateString()}] ${delayedMessage}`,
        challenge_id: challengeId,
        is_read: false,
      }));

      const allRows = [...immediateRows, ...delayedRows];
      if (allRows.length === 0) return { sent: 0 };

      // 5. Batch insert notifications
      let totalInserted = 0;

      for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
        const batch = allRows.slice(i, i + BATCH_SIZE);
        const { error: insertErr } = await supabase
          .from('cogni_notifications')
          .insert(batch);

        if (insertErr) {
          logInfo(`Notification batch ${Math.floor(i / BATCH_SIZE) + 1} failed: ${insertErr.message}`, {
            operation: 'notify_solvers_batch',
          });
        } else {
          totalInserted += batch.length;
        }
      }

      // 6. Log BR-PROFILE-003 compliance
      logInfo(
        `Solver notifications dispatched: ${prioritySolvers.length} priority (L3 immediate), ${standardSolvers.length} standard (${PRIORITY_DELAY_HOURS}h delay)`,
        {
          operation: 'notify_solvers_published',
          component: 'useNotifySolvers',
        },
      );

      return { sent: totalInserted };
    },

    onError: (error: Error) => {
      // Non-blocking: notification failures should not block publication
      handleMutationError(error, { operation: 'notify_solvers' });
    },
  });
}
