/**
 * Which award buttons a user may see (DEF-0008). Server RPCs enforce the
 * same rules; this only decides what to show.
 */
export type AwardDecisionStatus = 'PROPOSED' | 'AWAITING_COUNTERSIGN' | 'CONFIRMED' | 'RETURNED';

export interface AwardActionInput {
  status: AwardDecisionStatus | null;
  recommendedBy: string | null;
  confirmedBy: string | null;
  userId: string;
}

export interface AwardActionSet {
  canRecommend: boolean;
  canConfirm: boolean;
  canReturn: boolean;
  canCountersign: boolean;
  /** True when confirming now would make recommender = confirmer (DEF-0145) → Platform countersign. */
  confirmNeedsCountersign: boolean;
}

export const RETURN_REASON_MIN = 10;
export const RETURN_REASON_MAX = 500;

export function getAwardActions(i: AwardActionInput): AwardActionSet {
  const isRecommender = i.recommendedBy === i.userId;
  const isConfirmer = i.confirmedBy === i.userId;
  return {
    canRecommend: i.status === null || i.status === 'RETURNED',
    canConfirm: i.status === 'PROPOSED',
    canReturn: i.status === 'PROPOSED' && !isRecommender,
    canCountersign: i.status === 'AWAITING_COUNTERSIGN' && !isRecommender && !isConfirmer,
    confirmNeedsCountersign: i.status === 'PROPOSED' && isRecommender,
  };
}

export function validateReturnReason(reason: string): string | null {
  const t = reason.trim();
  if (t.length < RETURN_REASON_MIN) return `Please give a reason of at least ${RETURN_REASON_MIN} characters.`;
  if (t.length > RETURN_REASON_MAX) return `Reason must be ${RETURN_REASON_MAX} characters or fewer.`;
  return null;
}

export const AWARD_STATUS_LABEL: Record<AwardDecisionStatus, string> = {
  PROPOSED: 'Waiting for confirmation',
  AWAITING_COUNTERSIGN: 'Awaiting Platform countersign',
  CONFIRMED: 'Confirmed',
  RETURNED: 'Returned to recommender',
};
