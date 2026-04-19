/**
 * workflowNotifications — Fire-and-forget notification utilities for the
 * cogniblend workflow. Each function inserts one row into
 * `cogni_notifications`. Failures never throw — they are logged via
 * `logWarning` so callers don't have to wrap calls in try/catch.
 *
 * Wiring into mutations is deferred: this module exposes the typed
 * surface for future sprints to consume.
 */

import { supabase } from '@/integrations/supabase/client';
import { logWarning } from '@/lib/errorHandler';

type NotificationType =
  | 'escrow_confirmed'
  | 'lc_review_timeout'
  | 'creator_approval_timeout'
  | 'pass3_stale';

interface BaseNotification {
  user_id: string;
  notification_type: NotificationType;
  title: string;
  message: string;
  challenge_id: string;
}

async function insertNotification(payload: BaseNotification): Promise<void> {
  try {
    const { error } = await supabase
      .from('cogni_notifications')
      .insert(payload as never);
    if (error) {
      logWarning('Notification insert failed', {
        operation: 'workflow_notification',
        component: 'workflowNotifications',
        additionalData: { type: payload.notification_type, error: error.message },
      });
    }
  } catch (err) {
    logWarning('Notification insert threw', {
      operation: 'workflow_notification',
      component: 'workflowNotifications',
      additionalData: {
        type: payload.notification_type,
        error: err instanceof Error ? err.message : String(err),
      },
    });
  }
}

export async function notifyEscrowConfirmed(params: {
  challengeId: string;
  curatorUserId: string;
  amount: number;
  currency: string;
}): Promise<void> {
  await insertNotification({
    user_id: params.curatorUserId,
    challenge_id: params.challengeId,
    notification_type: 'escrow_confirmed',
    title: 'Escrow deposit confirmed',
    message: `An escrow deposit of ${params.amount.toLocaleString()} ${params.currency} has been confirmed. The challenge is now financially ready.`,
  });
}

export async function notifyLcReviewTimeout(params: {
  challengeId: string;
  curatorUserId: string;
  lcUserId: string;
  deadlineDays: number;
}): Promise<void> {
  await Promise.all([
    insertNotification({
      user_id: params.curatorUserId,
      challenge_id: params.challengeId,
      notification_type: 'lc_review_timeout',
      title: 'Legal review timeout reached',
      message: `The Legal Coordinator has not completed review within the ${params.deadlineDays}-day window. Consider escalation.`,
    }),
    insertNotification({
      user_id: params.lcUserId,
      challenge_id: params.challengeId,
      notification_type: 'lc_review_timeout',
      title: 'Your legal review is overdue',
      message: `The ${params.deadlineDays}-day review window has elapsed. Please complete or transfer this review.`,
    }),
  ]);
}

export async function notifyCreatorApprovalTimeout(params: {
  challengeId: string;
  curatorUserId: string;
  creatorUserId: string;
}): Promise<void> {
  await Promise.all([
    insertNotification({
      user_id: params.creatorUserId,
      challenge_id: params.challengeId,
      notification_type: 'creator_approval_timeout',
      title: 'Approval window closing',
      message: 'Your 7-day approval window has elapsed. The Curator may now publish without your explicit approval.',
    }),
    insertNotification({
      user_id: params.curatorUserId,
      challenge_id: params.challengeId,
      notification_type: 'creator_approval_timeout',
      title: 'Creator approval timeout',
      message: 'The 7-day Creator approval window has elapsed. You may now publish via timeout override.',
    }),
  ]);
}

export async function notifyPass3Stale(params: {
  challengeId: string;
  curatorOrLcUserId: string;
}): Promise<void> {
  await insertNotification({
    user_id: params.curatorOrLcUserId,
    challenge_id: params.challengeId,
    notification_type: 'pass3_stale',
    title: 'Legal review marked stale',
    message: 'The Creator submitted edits that may have changed the challenge content. Please re-run Pass 3 (Legal AI Review).',
  });
}
