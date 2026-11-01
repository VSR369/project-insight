/**
 * Challenge status map (DEF-0030), ST-24 transitions (DEF-0008) and
 * award step owners (BR-CHL-M07, DEF-0145).
 *
 * Mirrors the server rules in fn_status_for_phase, md_status_transitions
 * and fn_award_actor_roles. The server is the authority; this module lets
 * screens show the right status and the right buttons.
 */

export type ChallengeStatus =
  | 'DRAFT' | 'IN_REVIEW' | 'SCHEDULED' | 'PUBLISHED' | 'EXTENDED'
  | 'ABSTRACT_REVIEW' | 'EVALUATION' | 'AWARDED' | 'DISPUTED'
  | 'COMPLETED' | 'CANCELLED';

export type OperatingModel = 'AGG' | 'MP';
export type GovernanceMode = 'QUICK' | 'STRUCTURED' | 'CONTROLLED';
export type AwardDecisionStatus = 'PROPOSED' | 'AWAITING_COUNTERSIGN' | 'CONFIRMED' | 'RETURNED';

export const CHALLENGE_STATUS_LABELS: Record<ChallengeStatus, string> = {
  DRAFT: 'Draft', IN_REVIEW: 'In Review', SCHEDULED: 'Scheduled', PUBLISHED: 'Published',
  EXTENDED: 'Extended', ABSTRACT_REVIEW: 'Abstract Review', EVALUATION: 'Evaluation',
  AWARDED: 'Awarded', DISPUTED: 'Disputed', COMPLETED: 'Completed', CANCELLED: 'Cancelled',
};

/** Phase → status (10.2.3a). Phase 4 shows Published once publication runs. */
export function statusForPhase(phase: number | null | undefined): ChallengeStatus {
  if (phase == null || phase <= 1) return 'DRAFT';
  if (phase === 2 || phase === 3) return 'IN_REVIEW';
  if (phase === 4 || phase === 5 || phase === 7) return 'PUBLISHED';
  if (phase === 6) return 'ABSTRACT_REVIEW';
  if (phase === 8 || phase === 9) return 'EVALUATION';
  return 'AWARDED';
}

const CANCELLABLE: ChallengeStatus[] = [
  'DRAFT', 'IN_REVIEW', 'SCHEDULED', 'PUBLISHED', 'EXTENDED', 'ABSTRACT_REVIEW', 'EVALUATION',
];

export const ST24_TRANSITIONS: ReadonlyArray<readonly [ChallengeStatus, ChallengeStatus]> = [
  ['DRAFT', 'IN_REVIEW'], ['IN_REVIEW', 'DRAFT'], ['IN_REVIEW', 'SCHEDULED'], ['IN_REVIEW', 'PUBLISHED'],
  ['SCHEDULED', 'PUBLISHED'], ['PUBLISHED', 'EXTENDED'], ['PUBLISHED', 'ABSTRACT_REVIEW'],
  ['EXTENDED', 'ABSTRACT_REVIEW'], ['ABSTRACT_REVIEW', 'PUBLISHED'], ['PUBLISHED', 'EVALUATION'],
  ['EXTENDED', 'EVALUATION'], ['EVALUATION', 'AWARDED'], ['EVALUATION', 'COMPLETED'],
  ['AWARDED', 'DISPUTED'], ['DISPUTED', 'AWARDED'], ['DISPUTED', 'EVALUATION'], ['AWARDED', 'COMPLETED'],
  ...CANCELLABLE.map((s) => [s, 'CANCELLED'] as const),
];

export function isChallengeTransitionAllowed(from: ChallengeStatus, to: ChallengeStatus): boolean {
  if (from === to) return true;
  return ST24_TRANSITIONS.some(([f, t]) => f === from && t === to);
}

export function notAllowedMessage(to: ChallengeStatus): string {
  return `You are not allowed to move this challenge to ${CHALLENGE_STATUS_LABELS[to]}.`;
}

export interface AwardActorRoles {
  recommenderRoles: string[];
  confirmerRoles: string[];
}

/** BR-CHL-M07 phase 9: who recommends and who confirms. */
export function awardActorRoles(model: OperatingModel, mode: GovernanceMode): AwardActorRoles {
  if (model === 'MP') return { recommenderRoles: ['R6_MP'], confirmerRoles: ['R2'] };
  if (mode === 'QUICK') return { recommenderRoles: ['CR', 'R4'], confirmerRoles: ['R6_AGG'] };
  return { recommenderRoles: ['CU', 'R5_AGG'], confirmerRoles: ['R6_AGG'] };
}

export type ConfirmationResult =
  | { ok: false; reason: 'NOT_CONFIRMER' }
  | { ok: true; nextStatus: Extract<AwardDecisionStatus, 'CONFIRMED' | 'AWAITING_COUNTERSIGN'> };

/** Different person confirms → Confirmed; same person → Awaiting Platform countersign (QR-03). */
export function resolveConfirmation(params: {
  confirmerId: string;
  recommenderId: string;
  confirmerHeldRoles: string[];
  requiredConfirmerRoles: string[];
}): ConfirmationResult {
  const holds = params.confirmerHeldRoles.some((r) => params.requiredConfirmerRoles.includes(r));
  if (!holds) return { ok: false, reason: 'NOT_CONFIRMER' };
  return {
    ok: true,
    nextStatus: params.confirmerId === params.recommenderId ? 'AWAITING_COUNTERSIGN' : 'CONFIRMED',
  };
}

export type AwardLineStatus =
  | 'PROPOSED' | 'AWAITING_COUNTERSIGN' | 'CONFIRMED' | 'ACCEPTED'
  | 'NOT_AWARDED' | 'DISPUTED' | 'PAID_SIMULATED';

/** Awarded → Completed only when every line is settled and no dispute is open. */
export function canCompleteAwarded(lines: AwardLineStatus[], hasOpenDispute: boolean): boolean {
  if (hasOpenDispute) return false;
  return lines.every((s) => s === 'PAID_SIMULATED' || s === 'NOT_AWARDED');
}

export const COUNTERSIGN_TIERS = ['senior_admin', 'supervisor'] as const;
export function canCountersign(adminTier: string | null | undefined): boolean {
  return COUNTERSIGN_TIERS.includes((adminTier ?? '') as (typeof COUNTERSIGN_TIERS)[number]);
}
