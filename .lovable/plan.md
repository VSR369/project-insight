## Root Cause Analysis

The Compliance step (Step 3 of seeker org registration) shows two acceptance checkboxes:
- "I accept the Privacy Policy" → links to `/privacy` (static stub)
- "I accept the Data Processing Agreement" → links to `/dpa` (static stub)

Currently `src/components/registration/ComplianceForm.tsx` (lines 451, 476) renders these as plain anchor tags pointing to non-existent routes. **No content is ever fetched from the database**, so even if a Platform Admin uploads these documents, they cannot reach the user.

Additionally, the legal template registry has **no codes for Privacy Policy or DPA**:

- `DocumentCode` union (`src/types/legal.types.ts`) only includes: `PMA, CA, PSA, IPAA, EPIA, SPA, SKPA, PWA, RA_R2, CPA_QUICK/STRUCTURED/CONTROLLED`.
- DB CHECK constraint `legal_document_templates_document_code_check` enforces the same list — so an admin **cannot** create a Privacy Policy or DPA template today even if they tried.
- The Platform Agreements admin section (`PlatformAgreementsSection.tsx`) only surfaces SPA / SKPA / PWA cards.

So the chain is broken at three layers: DB constraint blocks codes → admin UI has no card → registration form doesn't query/stream content.

The good news: the rest of the legal subsystem (template upload via `useLegalDocUpload`, viewer via `LegalDocumentViewer`, acceptance ledger via `useLegalAcceptance`) is fully built and reusable.

## Proposed Fix (non-breaking, additive only)

### 1. Database migration (additive)
- Extend `legal_document_templates_document_code_check` to also allow `'PRIVACY_POLICY'` and `'DPA'`.
- Extend the same enum on `legal_doc_trigger_config.document_code` if it has its own CHECK.
- Seed two `DRAFT` rows (one per code) so admins immediately see "Upload" cards. No content backfill — admin must upload.
- No data deletion, no column drops, no existing-row mutation.

### 2. Type & label additions
- Add `'PRIVACY_POLICY' | 'DPA'` to `DocumentCode` in `src/types/legal.types.ts`.
- Add labels in `DOCUMENT_CODE_LABELS`.

### 3. Admin UI surface
- Extend `PLATFORM_CODES` in `PlatformAgreementsSection.tsx` from `['SPA','SKPA','PWA']` to `['SPA','SKPA','PWA','PRIVACY_POLICY','DPA']`. Grid already responsive (`lg:grid-cols-3`) — no layout change needed; cards wrap.
- Reuse existing `PlatformAgreementCard` + edit/upload flow as-is.

### 4. Registration Compliance form — stream content
Replace the two static `<a href>` stubs with a **read + accept** pattern, mirroring the existing `LegalDocumentViewer` approach used elsewhere:

- New small hook `usePlatformLegalDoc(code)` in `src/hooks/queries/usePlatformLegalDoc.ts` that fetches the latest `ACTIVE` row from `legal_document_templates` for the given code (sorted by `version` desc, `effective_date` desc).
- In `ComplianceForm.tsx`, for each of Privacy Policy and DPA, render a compact **"View & Accept"** card:
  - Document title + version badge
  - "View document" button → opens a `Dialog` containing `<LegalDocumentViewer content={doc.content} onScrollProgress={...} />`
  - Acceptance checkbox is **disabled until** the user has opened the dialog and scrolled to ≥ 95% (consistent with platform's existing acceptance gating used in the legal module).
  - Loading skeleton while fetching; "Document not yet published — please contact platform admin" empty state if no `ACTIVE` row exists (does NOT block existing flow if admin hasn't uploaded — checkbox stays disabled with a clear message; this is intentional and prevents silent acceptance of empty content).
- Submission unchanged — still writes `privacy_policy_accepted` / `dpa_accepted` booleans into `seeker_organizations_compliance` via `useUpsertCompliance`.
- Optionally also write a row into `legal_acceptance_ledger` (existing table) per accepted document for the audit trail; gated behind hook reuse — no schema change.

### 5. What is NOT changed
- No change to `seeker_organizations` or its `governance_profile` (the recently-fixed default stays).
- No change to existing SPA/SKPA/PWA flow.
- No change to compliance schema fields, mutation hook, or navigation.
- No change to RLS policies (templates table is already readable by authenticated users for ACTIVE rows).

## Technical Notes

- DB change is a `DROP CONSTRAINT … ADD CONSTRAINT … CHECK (... 'PRIVACY_POLICY','DPA')` plus seed inserts wrapped in `ON CONFLICT DO NOTHING`.
- Admin uploads use the existing `useLegalDocUpload` (`mammoth`-based DOCX/TXT → HTML) + `LegalDocEditorPanel` flow — no new upload pipeline needed.
- `LegalDocumentViewer` already handles scroll-progress reporting; just wire its callback to enable the checkbox.
- Files touched (≤6, all small):
  1. `supabase/migrations/<new>.sql` — extend CHECK + seed two DRAFT rows.
  2. `src/types/legal.types.ts` — add codes + labels.
  3. `src/components/admin/legal/PlatformAgreementsSection.tsx` — extend `PLATFORM_CODES` (one-line change).
  4. `src/hooks/queries/usePlatformLegalDoc.ts` — new (~40 lines).
  5. `src/components/registration/PlatformLegalAcceptCard.tsx` — new compact component (~120 lines, well under 250-line limit).
  6. `src/components/registration/ComplianceForm.tsx` — replace the two static `<a>` blocks with `<PlatformLegalAcceptCard code="PRIVACY_POLICY" … />` and `<PlatformLegalAcceptCard code="DPA" … />`. Keeps the form file under the size budget.

## Outcome

After approval:
- Platform Admin → Legal Documents page now shows "Privacy Policy" and "Data Processing Agreement" cards alongside SPA/SKPA/PWA. Admin uploads a `.docx` or `.txt`, publishes the version → it becomes `ACTIVE`.
- Seeker org registering on `/registration/compliance` sees a "View document" button per agreement; opens a styled viewer with the admin's content; must scroll to enable the acceptance checkbox; acceptance recorded as today (plus optional ledger entry).
- If admin hasn't uploaded yet, the registrant sees a clear "not yet published" message and the checkbox stays disabled — no silent broken-link experience.
