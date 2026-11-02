/**
 * challengeConfidentiality — BR-CHL-P09 (DEF-0034) mirror of the server rules.
 * Server enforcement lives in get_provider_challenge_view /
 * log_confidential_content_access RPCs and challenge_attachments RLS;
 * these pure helpers keep the UI consistent with that logic.
 */

export const CONFIDENTIAL_ORG_LABEL = 'Seeking organisation: Confidential';

export type ConfidentialAccessAction = 'view' | 'download';

export interface ConfidentialityContext {
  /** Seeker tenant member, platform admin, or active challenge role */
  isPrivileged: boolean;
  /** Creator ticked "Show our organisation name to providers" */
  discloseOrgName: boolean;
  /** Caller is a winner on a CONFIRMED award decision */
  isWinner: boolean;
  /** Caller accepted the challenge's frozen CPA */
  cpaAccepted: boolean;
  /** Caller passes BR-CHL-P10 visibility/eligibility */
  isEligible: boolean;
}

/** Identity is shown only to privileged users, on creator disclosure, or to confirmed winners. */
export function resolveSeekerDisplay(
  orgName: string | null,
  ctx: Pick<ConfidentialityContext, 'isPrivileged' | 'discloseOrgName' | 'isWinner'>,
): string | null {
  if (ctx.isPrivileged || ctx.discloseOrgName || ctx.isWinner) return orgName;
  return CONFIDENTIAL_ORG_LABEL;
}

/** Confidential fields/attachments require CPA acceptance while eligible (or privilege). */
export function canViewConfidentialContent(
  ctx: Pick<ConfidentialityContext, 'isPrivileged' | 'cpaAccepted' | 'isEligible'>,
): boolean {
  return ctx.isPrivileged || (ctx.isEligible && ctx.cpaAccepted);
}

export interface AttachmentConfidentiality {
  id: string;
  is_confidential: boolean;
}

/** Mirrors the attachments_provider_select RLS policy: confidential rows hidden until CPA accepted. */
export function filterAttachmentsForViewer<T extends AttachmentConfidentiality>(
  attachments: T[],
  canViewConfidential: boolean,
): T[] {
  if (canViewConfidential) return attachments;
  return attachments.filter((a) => !a.is_confidential);
}

/** Audit-trail action names written by log_confidential_content_access. */
export function confidentialAuditAction(action: ConfidentialAccessAction): string {
  return `CONFIDENTIAL_CONTENT_${action.toUpperCase()}`;
}
