## Problem

When a Platform Admin clicks **Create** on the **Privacy Policy** or **Data Processing Agreement** card, the editor opens at `/admin/legal-documents/new?code=PRIVACY_POLICY` (or `?code=DPA`), but the right‑hand "Document Code" panel shows **SPA — Solution Provider Platform…** as if a brand‑new SPA were being created. The Document Name, Description, Targeting and Applies‑to fields are also empty / unrelated to Privacy Policy.

## Root Cause

1. `useLegalDocEditor` only seeds `config` from a loaded template. When `isNew = true` it leaves `config` as `{}`, so `config.document_code` is `undefined`.
2. `LegalDocConfigSidebar` then falls back to a hard‑coded literal: `value={config.document_code ?? 'SPA'}`. The URL `?code=` parameter is never propagated into `config`.
3. The `Document Code` dropdown lists every code in `DOCUMENT_CODE_LABELS`, including archived families (PMA, CA, PSA, IPAA, EPIA) and CPA templates that should not be hand‑created from this page.
4. Because `config.document_code` is undefined on Save, the `handleSave` payload uses `defaultCode` for the insert but the sidebar UI keeps showing the wrong code, which is exactly the mismatch the screenshot captures.

A secondary contributor: the previous migration seeds DRAFT rows for `PRIVACY_POLICY` and `DPA`, so the card should normally show **Edit Draft**. The Create path still has to be correct, but after the seed runs the user will mostly land on Edit anyway.

## Fix (scoped, no behavioural changes elsewhere)

### 1. `src/hooks/admin/useLegalDocEditor.ts`
Seed `config` from `defaultCode` on first mount when `isNew` is true, so the sidebar reflects the URL parameter:
- On mount (when `isNew && !template`), initialise `config` with:
  - `document_code: defaultCode`
  - `document_name: DOCUMENT_CODE_LABELS[defaultCode]` (sensible default; user can edit)
  - `applies_to_model: 'BOTH'`, `applies_to_mode: 'ALL'`, `is_mandatory: true`, `applies_to_roles: ['ALL']`
- Do not overwrite later edits — guard with a `didInitRef` so this runs once.

### 2. `src/components/admin/legal/LegalDocConfigSidebar.tsx`
- Remove the hard‑coded `'SPA'` fallback in the Select. Use `config.document_code` directly; if missing, render an empty placeholder via `<SelectValue placeholder="Select code…" />`.
- Restrict the dropdown to the **active platform document codes only**, so the editor never offers archived families:
  - `SPA`, `SKPA`, `PWA`, `RA_R2`, `CPA_QUICK`, `CPA_STRUCTURED`, `CPA_CONTROLLED`, `PRIVACY_POLICY`, `DPA`
- Keep `DOCUMENT_CODE_LABELS` as the label source (no schema change).

### 3. `src/pages/admin/legal/LegalDocumentEditorPage.tsx`
No structural change. The page already reads `?code=` into `defaultCode` and passes it into the hook — once the hook seeds `config`, the sidebar will display the correct code automatically.

## Out of Scope / Untouched

- Database schema, migrations, RLS, and the `legal_document_templates` rows are unchanged.
- The streaming flow into registration (`PlatformLegalAcceptCard`, `usePlatformLegalTemplate`) is unchanged.
- The Edit path (existing template) is unchanged — `config` is still seeded from the loaded template as today.
- IPAA section editing logic is untouched.

## Acceptance Criteria

1. Clicking **Create** on the **Privacy Policy** card opens the editor with the right panel showing `PRIVACY_POLICY — Privacy Policy` selected, and Document Name pre‑filled as "Privacy Policy".
2. Same for **Data Processing Agreement** (`DPA — Data Processing Agreement`).
3. Clicking **Create** on **SPA / SKPA / PWA** still defaults to that code (existing behaviour preserved).
4. The Document Code dropdown no longer offers archived codes (PMA, CA, PSA, IPAA, EPIA).
5. Editing an existing template continues to load its real code and metadata.
6. Saving a brand‑new Privacy Policy / DPA writes a row with `document_code = 'PRIVACY_POLICY'` / `'DPA'` (matches the CHECK constraint already in place).
