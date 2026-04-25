/**
 * roleToDocumentMap — Single source of truth that maps a role code held by
 * a user to the legal document that user must sign at first login.
 *
 * Ownership matrix (final, authoritative):
 *
 *   Role                     | MP invited by    | AGG invited by   | First-login doc
 *   -------------------------|------------------|------------------|----------------
 *   Seeker Admin (R2)        | self-register    | self-register    | SKPA
 *   Creator (R3/R4/R10_CR)   | Seeker Admin     | Seeker Admin     | SKPA
 *   Curator (R5_*)           | Platform Admin   | Seeker Admin     | PWA
 *   Expert Reviewer (R7_*)   | Platform Admin   | Seeker Admin     | PWA
 *   Legal Coordinator (R9)   | Seeker Admin     | Seeker Admin     | PWA
 *   Finance Coordinator (R8) | Seeker Admin     | Seeker Admin     | PWA
 *   Solution Provider (SP)   | self / VIP / inv | self / VIP / inv | SPA
 *
 * Mirror this table into `pending_role_legal_acceptance` backfill SQL
 * and into `RoleLegalGate` rendering.
 */

export type LegalDocCode = 'SPA' | 'SKPA' | 'PWA' | 'CPA';

/** Display label rendered in the signature dialog for the {{user_role}} variable. */
export interface RoleDocMapping {
  docCode: LegalDocCode;
  /** Human label for the role used in interpolation as {{user_role}} */
  userRoleLabel: string;
}

const MAP: Record<string, RoleDocMapping> = {
  // Seeker Admin
  R2: { docCode: 'SKPA', userRoleLabel: 'Seeking Organization Admin' },

  // Creator
  R3: { docCode: 'SKPA', userRoleLabel: 'Challenge Creator' },
  R4: { docCode: 'SKPA', userRoleLabel: 'Challenge Creator' },
  R10_CR: { docCode: 'SKPA', userRoleLabel: 'Challenge Creator' },
  CR: { docCode: 'SKPA', userRoleLabel: 'Challenge Creator' },

  // Curator
  R5_MP: { docCode: 'PWA', userRoleLabel: 'Curator' },
  R5_AGG: { docCode: 'PWA', userRoleLabel: 'Curator' },
  CU: { docCode: 'PWA', userRoleLabel: 'Curator' },

  // Expert Reviewer
  R7_MP: { docCode: 'PWA', userRoleLabel: 'Expert Reviewer' },
  R7_AGG: { docCode: 'PWA', userRoleLabel: 'Expert Reviewer' },
  ER: { docCode: 'PWA', userRoleLabel: 'Expert Reviewer' },

  // Finance Coordinator
  R8: { docCode: 'PWA', userRoleLabel: 'Finance Coordinator' },
  FC: { docCode: 'PWA', userRoleLabel: 'Finance Coordinator' },

  // Legal Coordinator
  R9: { docCode: 'PWA', userRoleLabel: 'Legal Coordinator' },
  LC: { docCode: 'PWA', userRoleLabel: 'Legal Coordinator' },

  // Solution Provider — synthetic code "SP" used by the gate when the user
  // has a row in `solution_providers`.
  SP: { docCode: 'SPA', userRoleLabel: 'Solution Provider' },
};

/** Returns the mapping for a role code, or null if the role does not require a first-login signature. */
export function getRoleDocMapping(roleCode: string): RoleDocMapping | null {
  if (!roleCode) return null;
  return MAP[roleCode] ?? MAP[roleCode.toUpperCase()] ?? null;
}

/**
 * For a set of role codes a user holds, return the deduplicated list of
 * (docCode, roleCode, userRoleLabel) signatures needed. We emit one entry
 * per unique docCode — if a user is both Creator and Seeker Admin we ask
 * them to sign SKPA once with the higher-priority label (Creator).
 */
const PRIORITY: LegalDocCode[] = ['SPA', 'SKPA', 'PWA'];

export interface RequiredSignature {
  docCode: LegalDocCode;
  roleCode: string;
  userRoleLabel: string;
}

export function deriveRequiredSignatures(roleCodes: Iterable<string>): RequiredSignature[] {
  const byDoc = new Map<LegalDocCode, RequiredSignature>();
  for (const code of roleCodes) {
    const mapping = getRoleDocMapping(code);
    if (!mapping) continue;
    if (!byDoc.has(mapping.docCode)) {
      byDoc.set(mapping.docCode, {
        docCode: mapping.docCode,
        roleCode: code,
        userRoleLabel: mapping.userRoleLabel,
      });
    }
  }
  return PRIORITY.flatMap((doc) => {
    const entry = byDoc.get(doc);
    return entry ? [entry] : [];
  });
}
