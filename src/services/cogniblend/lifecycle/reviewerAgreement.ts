/**
 * reviewerAgreement — mirror of the BR-SEC-019 rule that solution review
 * screens require an accepted Prize & Work Agreement (document_code ILIKE
 * 'PWA%'). fn_can_view_solution / fn_has_accepted_pwa are the enforcement
 * authority; this module only decides when the UI shows the prompt.
 */

/** Role codes whose members must accept the PWA before viewing solutions. */
export const PWA_REQUIRED_ROLE_CODES: readonly string[] = ['ER', 'CU', 'CR'] as const;

export function roleRequiresPwa(roleCode: string): boolean {
  return PWA_REQUIRED_ROLE_CODES.includes(roleCode);
}

/**
 * Show the prompt only when the user holds a gated role and acceptance is
 * definitively false. `undefined` (still loading) and `true` never prompt.
 */
export function shouldShowPwaPrompt(
  holdsGatedRole: boolean,
  pwaAccepted: boolean | undefined,
): boolean {
  return holdsGatedRole && pwaAccepted === false;
}
