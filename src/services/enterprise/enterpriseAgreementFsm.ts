/**
 * Enterprise Agreement FSM — client-side mirror of `enforce_enterprise_agreement_fsm`.
 *
 * The DB is the source of truth for transitions and authority. This module is
 * a defensive pre-flight: the UI uses it to grey out illegal "next status"
 * actions BEFORE submitting, so users never see a server rejection for a
 * transition that was structurally impossible.
 *
 * MUST stay in sync with the SQL trigger. If the DB FSM changes, update both
 * the trigger and `LEGAL_TRANSITIONS` here in the same migration PR.
 *
 * Activation authority is platform-only by design — see
 * `useTransitionAgreementStatus` JSDoc and the `COMMENT ON FUNCTION
 * enforce_enterprise_agreement_fsm` text.
 */

export type EnterpriseAgreementStatus =
  | 'draft'
  | 'pending_signature'
  | 'signed'
  | 'active'
  | 'expired'
  | 'terminated'
  | 'superseded';

/**
 * Edges allowed by the DB trigger. Terminal states (`expired`, `terminated`,
 * `superseded`) have no outgoing edges.
 */
export const LEGAL_TRANSITIONS: Readonly<
  Record<EnterpriseAgreementStatus, ReadonlyArray<EnterpriseAgreementStatus>>
> = {
  draft: ['pending_signature', 'terminated'],
  pending_signature: ['signed', 'draft', 'terminated'],
  signed: ['active', 'terminated'],
  active: ['expired', 'terminated', 'superseded'],
  expired: [],
  terminated: [],
  superseded: [],
};

export function canTransition(
  from: EnterpriseAgreementStatus,
  to: EnterpriseAgreementStatus,
): boolean {
  if (from === to) return false;
  return LEGAL_TRANSITIONS[from].includes(to);
}

/** True for transitions the DB restricts to platform supervisor / senior_admin. */
export function requiresPlatformAuthority(
  from: EnterpriseAgreementStatus,
  to: EnterpriseAgreementStatus,
): boolean {
  // Activation is the canonical platform-only edge (Option A — see plan §6).
  return from === 'signed' && to === 'active';
}

export function isTerminalStatus(status: EnterpriseAgreementStatus): boolean {
  return LEGAL_TRANSITIONS[status].length === 0;
}
