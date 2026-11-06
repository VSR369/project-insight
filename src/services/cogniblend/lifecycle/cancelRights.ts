/**
 * cancelRights — Agreed cancel-rights rule for challenges (Wave 2).
 *
 *   - Before publication (DRAFT / IN_REVIEW / SCHEDULED):
 *       Creator (CR) or Curator (CU) may cancel.
 *   - Once published (PUBLISHED or later):
 *       Innovation Director/AGG (R6_AGG) or Account Manager (R2)
 *       assigned to the challenge may cancel.
 *   - After any submission:
 *       Only a Senior Admin (or Supervisor) may cancel, on written
 *       request — the recorded cancellation reason.
 *
 * Server-side enforcement lives in the cancel_challenge RPC; this pure
 * evaluator mirrors it so the UI can hide the action before attempting it.
 */

export const PUBLISHED_STATUSES = [
  'PUBLISHED',
  'EXTENDED',
  'ABSTRACT_REVIEW',
  'EVALUATION',
  'AWARDED',
  'DISPUTED',
] as const;

export const CLOSED_STATUSES = ['CANCELLED', 'COMPLETED'] as const;

export interface CancelRightsInput {
  /** Challenge master status (ST-24). */
  status: string;
  /** True when the challenge has at least one submission. */
  hasSubmissions: boolean;
  /** Governance shorthand codes the user holds on the challenge (CR, CU, ...). */
  challengeRoleCodes: string[];
  /** SLM codes the user holds on the challenge via active role assignments. */
  slmRoleCodes: string[];
  /** True when the user is a Senior Admin or Supervisor. */
  isSeniorAdmin: boolean;
}

export type CancelDenial =
  | 'ALREADY_CLOSED'
  | 'REQUIRES_SENIOR_ADMIN'
  | 'REQUIRES_R6_AGG_OR_R2'
  | 'REQUIRES_CREATOR_OR_CURATOR';

export interface CancelRights {
  allowed: boolean;
  denial: CancelDenial | null;
}

export function evaluateCancelRights(input: CancelRightsInput): CancelRights {
  if ((CLOSED_STATUSES as readonly string[]).includes(input.status)) {
    return { allowed: false, denial: 'ALREADY_CLOSED' };
  }
  if (input.hasSubmissions) {
    return input.isSeniorAdmin
      ? { allowed: true, denial: null }
      : { allowed: false, denial: 'REQUIRES_SENIOR_ADMIN' };
  }
  if ((PUBLISHED_STATUSES as readonly string[]).includes(input.status)) {
    const hasDirectorOrAccountManager = input.slmRoleCodes.some(
      (code) => code === 'R6_AGG' || code === 'R2',
    );
    return hasDirectorOrAccountManager
      ? { allowed: true, denial: null }
      : { allowed: false, denial: 'REQUIRES_R6_AGG_OR_R2' };
  }
  const isCreatorOrCurator = input.challengeRoleCodes.some(
    (code) => code === 'CR' || code === 'CU',
  );
  return isCreatorOrCurator
    ? { allowed: true, denial: null }
    : { allowed: false, denial: 'REQUIRES_CREATOR_OR_CURATOR' };
}

export const CANCEL_DENIAL_MESSAGES: Record<CancelDenial, string> = {
  ALREADY_CLOSED: 'This challenge is already closed.',
  REQUIRES_SENIOR_ADMIN:
    'Submissions have been received — only a Senior Admin can cancel, on written request.',
  REQUIRES_R6_AGG_OR_R2:
    'Once published, only the Innovation Director/AGG or Account Manager can cancel.',
  REQUIRES_CREATOR_OR_CURATOR:
    'Before publication, only the Creator or Curator can cancel.',
};
