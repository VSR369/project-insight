/**
 * amendmentVersionBinding — Phase 9 v4 — Prompt 4 follow-up.
 *
 * On amendment approval, the assembled CPA changes. This service:
 *   1. Re-resolves the active CPA template for each in-scope `challenge_legal_docs` row.
 *   2. Updates `challenge_legal_docs.template_version` to the new version.
 *   3. Writes one `legal_acceptance_ledger` row per (challenge, signatory, doc, new version)
 *      to bind the LC/FC/CR re-sign requirement to the new CPA version.
 *
 * Without this, every CONTROLLED challenge that's been amended on legal/financial
 * clauses has stale `template_version` on `challenge_legal_docs` and no audit-trail
 * row binding the new version to the existing approvals — silently breaking the
 * "version-bound acceptance" guarantee documented in §1 of the feature matrix.
 *
 * Document-type → scope mapping (subset; conservative — only types we know):
 *   CPA / CPA_LEGAL / SPA-style legal annexes  → LEGAL, SCOPE_CHANGE
 *   FINANCE / ESCROW annexes                   → FINANCIAL, ESCROW
 *
 * Anything outside this map is ignored (logged but not version-bumped).
 */

import { supabase } from '@/integrations/supabase/client';
import { resolveActiveLegalTemplate } from './roleDocResolver';
import type { CanonicalScope } from './amendmentScopeService';
import { logInfo, logWarning } from '@/lib/errorHandler';

export interface VersionBindingPayload {
  challengeId: string;
  organizationId: string | null;
  canonicalScopes: CanonicalScope[];
  newPackageVersion: number;
  approvedBy: string;
  signatoryUserIds: {
    /** Curator user ID (always required to re-sign on material amendments). */
    curatorId?: string | null;
    /** Legal Coordinator user ID (CONTROLLED only, when LEGAL/SCOPE_CHANGE in scope). */
    lcId?: string | null;
    /** Finance Coordinator user ID (CONTROLLED only, when FINANCIAL/ESCROW in scope). */
    fcId?: string | null;
  };
}

export interface VersionBindingResult {
  docsBumped: number;
  ledgerRowsWritten: number;
  snapshotLegalDocs: Array<{
    id: string;
    document_type: string;
    tier: string;
    status: string | null;
    template_version: string | null;
    document_name: string | null;
  }>;
}

/** Document types considered legal-clause-bearing (CPA + legal annexes). */
const LEGAL_DOC_TYPES = new Set(['CPA', 'CPA_LEGAL', 'SPA', 'CPA_QUICK', 'CPA_STRUCTURED', 'CPA_CONTROLLED']);

/** Document types considered finance/escrow-bearing. */
const FINANCE_DOC_TYPES = new Set(['FINANCE', 'ESCROW', 'CPA_FINANCE', 'CPA_ESCROW']);

function isLegalScope(scopes: CanonicalScope[]): boolean {
  return scopes.includes('LEGAL') || scopes.includes('SCOPE_CHANGE') || scopes.includes('GOVERNANCE_CHANGE');
}

function isFinanceScope(scopes: CanonicalScope[]): boolean {
  return scopes.includes('FINANCIAL') || scopes.includes('ESCROW');
}

/**
 * Bumps `template_version` on in-scope challenge_legal_docs rows AND writes
 * version-pinned ledger entries for every required re-signatory.
 *
 * Idempotent on retry: re-resolving and re-updating to the same version is a no-op,
 * but ledger entries are append-only so callers must not retry blindly.
 */
export async function bindAmendmentToNewTemplateVersions(
  payload: VersionBindingPayload,
): Promise<VersionBindingResult> {
  const { challengeId, organizationId, canonicalScopes, newPackageVersion, approvedBy, signatoryUserIds } = payload;

  // 1. Load existing challenge_legal_docs.
  const { data: docs, error: docsErr } = await supabase
    .from('challenge_legal_docs')
    .select('id, document_type, tier, status, template_version, document_name')
    .eq('challenge_id', challengeId);

  if (docsErr) throw new Error(`Failed to load challenge_legal_docs: ${docsErr.message}`);

  const allDocs = docs ?? [];
  const legalScope = isLegalScope(canonicalScopes);
  const financeScope = isFinanceScope(canonicalScopes);

  // 2. For each in-scope doc, re-resolve and bump template_version.
  let docsBumped = 0;
  const updatedSnapshot = [...allDocs];

  for (let i = 0; i < allDocs.length; i++) {
    const doc = allDocs[i];
    const docTypeUpper = (doc.document_type ?? '').toUpperCase();
    const inScope =
      (legalScope && LEGAL_DOC_TYPES.has(docTypeUpper)) ||
      (financeScope && FINANCE_DOC_TYPES.has(docTypeUpper));

    if (!inScope) continue;

    let newVersion: string | null = null;
    try {
      // resolveActiveLegalTemplate accepts our LegalDocCode union; cast for tolerance.
      const resolved = await resolveActiveLegalTemplate(
        organizationId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        docTypeUpper as any,
        null,
      );
      newVersion = resolved?.version ?? null;
    } catch (err) {
      logWarning(
        `Failed to resolve active template for ${docTypeUpper}; preserving current version: ${(err as Error).message}`,
        { operation: 'amendment_version_binding', component: 'amendmentVersionBinding' },
      );
      continue;
    }

    if (!newVersion || newVersion === doc.template_version) continue;

    const { error: updErr } = await supabase
      .from('challenge_legal_docs')
      .update({
        template_version: newVersion,
        status: 'TRIGGERED', // re-sign required
        updated_at: new Date().toISOString(),
        updated_by: approvedBy,
      })
      .eq('id', doc.id);

    if (updErr) throw new Error(`Failed to bump template_version on doc ${doc.id}: ${updErr.message}`);

    updatedSnapshot[i] = { ...doc, template_version: newVersion, status: 'TRIGGERED' };
    docsBumped += 1;
  }

  // 3. Write version-pinned ledger rows for required signatories.
  // Ledger schema: (challenge_id, user_id, document_type, document_name, document_version, tier, phase_triggered)
  // We write one row per (signatory × in-scope doc) — append-only.
  const ledgerRows: Array<{
    challenge_id: string;
    user_id: string;
    document_type: string;
    document_name: string | null;
    document_version: string | null;
    tier: string;
    phase_triggered: number;
    created_by: string;
  }> = [];

  const inScopeDocs = updatedSnapshot.filter((d) => {
    const t = (d.document_type ?? '').toUpperCase();
    return (legalScope && LEGAL_DOC_TYPES.has(t)) || (financeScope && FINANCE_DOC_TYPES.has(t));
  });

  type SignatoryEntry = { userId: string; gate: 'LEGAL' | 'FINANCE' | 'BOTH' };
  const signatories: SignatoryEntry[] = [];

  if (signatoryUserIds.lcId && legalScope) {
    signatories.push({ userId: signatoryUserIds.lcId, gate: 'LEGAL' });
  }
  if (signatoryUserIds.fcId && financeScope) {
    signatories.push({ userId: signatoryUserIds.fcId, gate: 'FINANCE' });
  }
  if (signatoryUserIds.curatorId) {
    signatories.push({ userId: signatoryUserIds.curatorId, gate: 'BOTH' });
  }

  for (const sig of signatories) {
    for (const doc of inScopeDocs) {
      const t = (doc.document_type ?? '').toUpperCase();
      const isLegalDoc = LEGAL_DOC_TYPES.has(t);
      const isFinanceDoc = FINANCE_DOC_TYPES.has(t);

      if (sig.gate === 'LEGAL' && !isLegalDoc) continue;
      if (sig.gate === 'FINANCE' && !isFinanceDoc) continue;

      ledgerRows.push({
        challenge_id: challengeId,
        user_id: sig.userId,
        document_type: doc.document_type,
        document_name: doc.document_name ?? null,
        document_version: doc.template_version ?? null,
        tier: doc.tier ?? 'TIER_1',
        phase_triggered: 99,
        created_by: approvedBy,
      });
    }
  }

  if (ledgerRows.length > 0) {
    // Note: these rows are PENDING-RE-ACCEPT markers (accepted_at defaults to NOW()
    // per schema, which is the audit timestamp of when re-sign was REQUESTED, not
    // when the signatory accepted — true acceptance creates a separate row). The
    // append-only contract is preserved; downstream readers filter by latest
    // (user_id, document_type, document_version) tuple.
    const { error: ledgerErr } = await supabase
      .from('legal_acceptance_ledger')
      .insert(ledgerRows);
    if (ledgerErr) {
      throw new Error(`Failed to write version-pinned ledger entries: ${ledgerErr.message}`);
    }
  }

  logInfo(
    `Amendment version binding: ${docsBumped} docs bumped, ${ledgerRows.length} ledger rows written for v${newPackageVersion}`,
    { operation: 'amendment_version_binding', component: 'amendmentVersionBinding' },
  );

  return {
    docsBumped,
    ledgerRowsWritten: ledgerRows.length,
    snapshotLegalDocs: updatedSnapshot,
  };
}
