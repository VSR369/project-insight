/**
 * Default seed templates for legal docs created from the admin UI.
 *
 * RA_R2 — Seeker Org Admin Role Agreement (personal role agreement that
 * R2 signs in addition to the org-level SKPA).
 *
 * CPA defaults live in `cpaDefaults.constants.ts` and are re-exported here
 * for unified consumption by the editor seeding logic.
 */

import { CPA_DEFAULT_TEMPLATES, CPA_CODE_MAP } from './cpaDefaults.constants';

export const RA_R2_DEFAULT_TEMPLATE = `# Seeker Organization Admin — Role Agreement (RA_R2)

## 1. Parties
This Role Agreement is entered into between **{{platform_name}}** ("Platform") and the individual being granted the Seeker Organization Admin role ("Admin") on behalf of **{{organization_name}}** ("Organization").

## 2. Scope of Role
The Admin is authorised to manage the Organization's presence on the Platform, including:
- Inviting, granting and revoking workforce roles (Creator, Curator, Reviewer, Finance Coordinator, Legal Coordinator).
- Configuring challenges, governance modes and legal documents on behalf of the Organization.
- Approving budgets, escrow deposits and prize payouts within delegated limits.

## 3. Relationship to SKPA
This Agreement is **personal** to the Admin and is in addition to the Seeker Platform Agreement (SKPA) signed by the Organization. The SKPA governs the Organization's commercial relationship with the Platform; this Role Agreement governs the Admin's individual conduct and authority.

## 4. Confidentiality
The Admin shall keep confidential all non-public information accessed via the Platform, including challenge briefs, Solution Provider submissions, evaluation scores and financial records.

## 5. Acceptable Use
The Admin shall not:
- Share login credentials or platform access with unauthorised persons.
- Use Platform data for purposes outside the Organization's challenge programme.
- Attempt to circumvent governance, escrow, or evaluation controls.

## 6. Termination
This Agreement terminates automatically when the Admin's role is revoked by the Organization or by the Platform. Confidentiality obligations survive termination for **3 years**.

## 7. Governing Law
This Agreement is governed by **{{governing_law}}** with exclusive jurisdiction in **{{jurisdiction}}**.

## 8. Acceptance
By clicking **Accept**, the Admin confirms they have read, understood and agree to be bound by this Role Agreement.`;

/**
 * Resolve the seed content to pre-fill the editor for a given document code
 * on the "new" path. Returns null when no default is defined.
 */
export function getDefaultTemplateContent(code: string | null | undefined): string | null {
  if (!code) return null;
  if (code === 'RA_R2') return RA_R2_DEFAULT_TEMPLATE;
  if (code === CPA_CODE_MAP.QUICK) return CPA_DEFAULT_TEMPLATES.QUICK;
  if (code === CPA_CODE_MAP.STRUCTURED) return CPA_DEFAULT_TEMPLATES.STRUCTURED;
  if (code === CPA_CODE_MAP.CONTROLLED) return CPA_DEFAULT_TEMPLATES.CONTROLLED;
  return null;
}
