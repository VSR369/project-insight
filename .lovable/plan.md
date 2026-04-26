# Phase 8 — Legacy Reference Cleanup & SKPA Backfill

Final cleanup that removes archived doc-code references from active UI surfaces and seeds missing SKPA acceptance for existing org admins.

## Why this phase exists

Audit revealed three correctness gaps after Phase 7:

1. **Admin trigger-config UI exposes only archived codes.** `LegalDocTriggerForm.tsx` lists `PMA / CA / PSA / IPAA / EPIA` — none of the active Legal v3 codes are selectable. Platform Admins literally cannot configure triggers for SPA / SKPA / PWA / CPA_*.
2. **Creator pre-submit summary shows 4 archived agreements.** `QuickLegalDocsSummary.tsx` hardcodes `PMA / CA / PSA / IPAA` as the QUICK-mode "auto-applied" docs. Wrong content presented to every creator submitting a QUICK challenge.
3. **2 active R2 (Seeker Org Admin) users have no SKPA acceptance and no pending row.** They predate the trigger and the earlier backfill missed them — they will never see the SKPA gate without an explicit re-enqueue.

Plus 2 cosmetic defaults (`'PMA'` → `'SPA'`) so a fresh "Create new document" lands on the active family.

## Changes

### Code (4 files, no new files, no deletions)

**`src/components/admin/legal/LegalDocTriggerForm.tsx`**
- `DOC_CODES` → `['SPA', 'SKPA', 'PWA', 'CPA_QUICK', 'CPA_STRUCTURED', 'CPA_CONTROLLED']`
- Default `document_code` → `'SPA'` (was `'PMA'`)

**`src/components/cogniblend/creator/QuickLegalDocsSummary.tsx`**
- Replace hardcoded `QUICK_LEGAL_DOCS` array with `[{ code: 'CPA_QUICK', label: 'Challenge Participation Agreement (Quick)' }]`
- Update fallback rendering when live templates haven't loaded yet
- Adjust header copy: "Standard CPA will be auto-applied for QUICK-mode challenges. Solution Providers accept it at enrollment."

**`src/pages/admin/legal/LegalDocumentEditorPage.tsx`**
- `defaultCode` fallback → `'SPA'` (was `'PMA'`)

**`src/components/admin/legal/LegalDocConfigSidebar.tsx`**
- New-document Select default → `'SPA'` (was `'PMA'`)

(`LegacyDocumentsSection.tsx` is correct as-is — it intentionally surfaces archived templates in a collapsed "Archived" group for read-only history.)

### Data (1 migration)

Single SQL migration that seeds pending SKPA rows for active R2 admins with no existing SKPA acceptance and no unresolved pending row:

```sql
INSERT INTO pending_role_legal_acceptance (user_id, role_code, doc_code, org_id, source, created_at)
SELECT DISTINCT ra.user_id, 'R2', 'SKPA', ra.org_id, 'backfill', now()
FROM role_assignments ra
WHERE ra.role_code = 'R2' AND ra.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM legal_acceptance_log la
    WHERE la.user_id = ra.user_id AND la.document_code = 'SKPA' AND la.action = 'accepted')
  AND NOT EXISTS (
    SELECT 1 FROM pending_role_legal_acceptance p
    WHERE p.user_id = ra.user_id AND p.doc_code = 'SKPA' AND p.resolved_at IS NULL);
```

Affects approximately 2 users (per current DB state). On their next login, `RoleLegalGate` will surface the SKPA — same path the new `SkpaRegistrationGate` uses for fresh registrations.

## Out of scope (unchanged)

- **Phase 5 template content** (PWA per-role bodies, CPA_QUICK/STRUCTURED/CONTROLLED clause text) — Platform Admin data work in the admin UI.
- **CPA template seeding** — DB shows 0 active CPA templates; admins must create them via `/admin/legal-documents` once the editor defaults are fixed in this phase.

## Effort

One short cycle. Four small code edits + one tiny data migration. Type-check + visual spot-check.
