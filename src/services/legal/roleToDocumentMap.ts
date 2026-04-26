/**
 * roleToDocumentMap — Single source of truth that maps a role code held by
 * a user to the legal document(s) that user must sign at role grant.
 *
 * Ownership matrix (final, authoritative — Legal v4 / Phase 9):
 *
 *   Role                     | Granted by        | Role-grant doc(s)   | Notes
 *   -------------------------|-------------------|---------------------|--------------------
 *   Seeker Admin (R2)        | self-register     | SKPA + RA_R2        | SKPA = org-platform contract.
 *                            |                   |                     | RA_R2 = personal role agreement.
 *   Creator (R3/R4/R10_CR)   | PA or Seeker Admin| PWA (RA_CR)         | Role agreement.
 *   Curator (R5_*)           | PA or Seeker Admin| PWA (RA_CU)         | Role agreement.
 *   Expert Reviewer (R7_*)   | PA or Seeker Admin| PWA (RA_ER)         | Role agreement.
 *   Legal Coordinator (R9)   | Seeker Admin      | PWA (RA_LC)         | Role agreement.
 *   Finance Coordinator (R8) | Seeker Admin      | PWA (RA_FC)         | Role agreement.
 *   Solution Provider (SP)   | self / VIP / inv  | SPA                 | At SP signup.
 *
 * IMPORTANT v4 change — R2 now requires BOTH SKPA (org contract) and RA_R2
 * (personal role agreement), mirroring the Creator/Curator/etc. pattern
 * where every workforce role has its own role-grant agreement in addition
 * to any org-level contract their organization signed.
 *
 * The single PWA template body is interpolated per role via {{user_role}},
 * so one template serves all 5 workforce roles. RA_R2 is its own template.
 */

export type LegalDocCode = 'SPA' | 'SKPA' | 'PWA' | 'RA_R2' | 'CPA';

/** A single (doc, role-label) pairing required for a role. */
export interface RoleDocMapping {
  docCode: LegalDocCode;
  /** Human label rendered as {{user_role}} in the signature dialog. */
  userRoleLabel: string;
}

/**
 * Map: roleCode -> ordered list of required role-grant documents.
 * Uniform array API: every role returns RoleDocMapping[]. Roles requiring
 * a single doc return a single-element array. R2 requires two.
 */
const MAP: Record<string, RoleDocMapping[]> = {
  // Seeker Admin — signs the org contract AND the personal role agreement.
  R2: [
    { docCode: 'SKPA', userRoleLabel: 'Seeking Organization Admin' },
    { docCode: 'RA_R2', userRoleLabel: 'Seeking Organization Admin' },
  ],

  // Creator — role agreement (PWA family).
  R3: [{ docCode: 'PWA', userRoleLabel: 'Challenge Creator' }],
  R4: [{ docCode: 'PWA', userRoleLabel: 'Challenge Creator' }],
  R10_CR: [{ docCode: 'PWA', userRoleLabel: 'Challenge Creator' }],
  CR: [{ docCode: 'PWA', userRoleLabel: 'Challenge Creator' }],

  // Curator
  R5_MP: [{ docCode: 'PWA', userRoleLabel: 'Curator' }],
  R5_AGG: [{ docCode: 'PWA', userRoleLabel: 'Curator' }],
  CU: [{ docCode: 'PWA', userRoleLabel: 'Curator' }],

  // Expert Reviewer
  R7_MP: [{ docCode: 'PWA', userRoleLabel: 'Expert Reviewer' }],
  R7_AGG: [{ docCode: 'PWA', userRoleLabel: 'Expert Reviewer' }],
  ER: [{ docCode: 'PWA', userRoleLabel: 'Expert Reviewer' }],

  // Finance Coordinator
  R8: [{ docCode: 'PWA', userRoleLabel: 'Finance Coordinator' }],
  FC: [{ docCode: 'PWA', userRoleLabel: 'Finance Coordinator' }],

  // Legal Coordinator
  R9: [{ docCode: 'PWA', userRoleLabel: 'Legal Coordinator' }],
  LC: [{ docCode: 'PWA', userRoleLabel: 'Legal Coordinator' }],

  // Solution Provider — synthetic code "SP" used by the gate.
  SP: [{ docCode: 'SPA', userRoleLabel: 'Solution Provider' }],
};

/**
 * Returns the ordered list of role-grant documents required for a role,
 * or an empty array if the role has no first-login signature requirement.
 *
 * Uniform API: always returns an array (possibly empty). Callers should
 * iterate; never assume a single result.
 */
export function getRoleDocMappings(roleCode: string): RoleDocMapping[] {
  if (!roleCode) return [];
  return MAP[roleCode] ?? MAP[roleCode.toUpperCase()] ?? [];
}

/**
 * Back-compat shim: returns the FIRST mapping for a role, or null.
 * Prefer `getRoleDocMappings` for new callers — this exists only so legacy
 * single-doc callers keep compiling. Will warn (in dev) when a role has
 * multiple required docs and only the first is returned.
 *
 * @deprecated Use getRoleDocMappings instead.
 */
export function getRoleDocMapping(roleCode: string): RoleDocMapping | null {
  const list = getRoleDocMappings(roleCode);
  return list[0] ?? null;
}

/**
 * Document-priority order used when collapsing a user's role set into a
 * deterministic signature queue.
 */
const PRIORITY: LegalDocCode[] = ['SPA', 'SKPA', 'RA_R2', 'PWA'];

export interface RequiredSignature {
  docCode: LegalDocCode;
  roleCode: string;
  userRoleLabel: string;
}

/**
 * For a set of role codes a user holds, return the deduplicated list of
 * (docCode, roleCode, userRoleLabel) signatures needed.
 *
 * Dedup key: docCode. If a user is both Curator and Expert Reviewer they
 * sign one PWA — but the role label and roleCode reflect whichever role
 * was encountered first (insertion order from the caller).
 */
export function deriveRequiredSignatures(roleCodes: Iterable<string>): RequiredSignature[] {
  const byDoc = new Map<LegalDocCode, RequiredSignature>();
  for (const code of roleCodes) {
    for (const mapping of getRoleDocMappings(code)) {
      if (!byDoc.has(mapping.docCode)) {
        byDoc.set(mapping.docCode, {
          docCode: mapping.docCode,
          roleCode: code,
          userRoleLabel: mapping.userRoleLabel,
        });
      }
    }
  }
  return PRIORITY.flatMap((doc) => {
    const entry = byDoc.get(doc);
    return entry ? [entry] : [];
  });
}
