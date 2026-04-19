/**
 * workflowNotifications — Fire-and-forget notification utilities for the
 * cogniblend workflow. Each function inserts one row into
 * `cogni_notifications`. Failures never throw — they are logged via
 * `logWarning` so callers don't have to wrap calls in try/catch.
 */

import { supabase } from '@/integrations/supabase/client';
import { logWarning } from '@/lib/errorHandler';

type NotificationType =
  | 'escrow_confirmed'
  | 'lc_review_timeout'
  | 'creator_approval_timeout'
  | 'pass3_stale'
  | 'curation_complete'
  | 'creator_approved'
  | 'creator_changes_requested'
  | 'lc_approved';

interface BaseNotification {
  user_id: string;
  notification_type: NotificationType;
  title: string;
  message: string;
  challenge_id: string;
  action_url?: string | null;
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

const challengeViewUrl = (challengeId: string) =>
  `/cogni/challenges/${challengeId}/view`;
const creatorReviewUrl = (challengeId: string) =>
  `/cogni/challenges/${challengeId}/creator-review`;
const escrowUrl = (challengeId: string) =>
  `/cogni/challenges/${challengeId}/escrow`;

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
    action_url: escrowUrl(params.challengeId),
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
      action_url: challengeViewUrl(params.challengeId),
    }),
    insertNotification({
      user_id: params.lcUserId,
      challenge_id: params.challengeId,
      notification_type: 'lc_review_timeout',
      title: 'Your legal review is overdue',
      message: `The ${params.deadlineDays}-day review window has elapsed. Please complete or transfer this review.`,
      action_url: challengeViewUrl(params.challengeId),
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
      action_url: creatorReviewUrl(params.challengeId),
    }),
    insertNotification({
      user_id: params.curatorUserId,
      challenge_id: params.challengeId,
      notification_type: 'creator_approval_timeout',
      title: 'Creator approval timeout',
      message: 'The 7-day Creator approval window has elapsed. You may now publish via timeout override.',
      action_url: challengeViewUrl(params.challengeId),
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
    action_url: challengeViewUrl(params.challengeId),
  });
}

/** Sprint 6C — fired when Curator (MP) or LC (CTRL) accepts Pass 3 and the
 * Creator approval window opens. */
export async function notifyCurationComplete(params: {
  challengeId: string;
  creatorUserId: string;
  challengeTitle?: string;
}): Promise<void> {
  await insertNotification({
    user_id: params.creatorUserId,
    challenge_id: params.challengeId,
    notification_type: 'curation_complete',
    title: 'Your challenge is ready for approval',
    message: `Curation${params.challengeTitle ? ` for "${params.challengeTitle}"` : ''} is complete. Please review and approve to proceed to publication.`,
    action_url: creatorReviewUrl(params.challengeId),
  });
}

/** Sprint 6C — fired when the Creator clicks "Accept All". Notifies Curator
 * (and LC if CONTROLLED). */
export async function notifyCreatorApproved(params: {
  challengeId: string;
  recipientUserIds: string[];
  challengeTitle?: string;
}): Promise<void> {
  await Promise.all(
    params.recipientUserIds.map((uid) =>
      insertNotification({
        user_id: uid,
        challenge_id: params.challengeId,
        notification_type: 'creator_approved',
        title: 'Creator approved the challenge',
        message: `The Creator has approved${params.challengeTitle ? ` "${params.challengeTitle}"` : ''}. Ready for the next step.`,
        action_url: challengeViewUrl(params.challengeId),
      }),
    ),
  );
}

/** Sprint 6C — fired when the Creator requests re-curation. Notifies Curator. */
export async function notifyCreatorChangesRequested(params: {
  challengeId: string;
  curatorUserId: string;
  reason?: string;
}): Promise<void> {
  await insertNotification({
    user_id: params.curatorUserId,
    challenge_id: params.challengeId,
    notification_type: 'creator_changes_requested',
    title: 'Creator requested re-curation',
    message: params.reason
      ? `Creator feedback: ${params.reason.slice(0, 200)}`
      : 'The Creator has requested re-curation of this challenge.',
    action_url: challengeViewUrl(params.challengeId),
  });
}

/** Sprint 6C — fired when the LC accepts Pass 3 in CONTROLLED mode. Notifies
 * Curator and FC. */
export async function notifyLcApproved(params: {
  challengeId: string;
  recipientUserIds: string[];
}): Promise<void> {
  await Promise.all(
    params.recipientUserIds.map((uid) =>
      insertNotification({
        user_id: uid,
        challenge_id: params.challengeId,
        notification_type: 'lc_approved',
        title: 'Legal Coordinator approved the challenge',
        message: 'The LC has completed Pass 3 review. The challenge is ready for the next phase.',
        action_url: challengeViewUrl(params.challengeId),
      }),
    ),
  );
}
