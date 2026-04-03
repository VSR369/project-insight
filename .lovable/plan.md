

# Legal Document Management System — Implementation Plan

## Current State Assessment

**What exists today:**
- `legal_document_templates` table with basic columns (template_id, document_type, document_name, tier, description, template_content, trigger_phase, is_active)
- Simple admin page at `/admin/seeker-config/legal-templates` using generic DataTable + textarea content editor
- `TcReAcceptanceModal` for org-level T&C (separate system, `tc_versions` table)
- `SolverLegalGateModal` for Tier 2 phase-triggered docs (uses `legal_acceptance_ledger`)
- TipTap + mammoth already installed in project

**What's missing:**
- No `document_code` system (PMA, CA, PSA, IPAA, EPIA)
- No version management (version, version_status, parent_template_id)
- No rich content (content_json for TipTap state)
- No workflow trigger configuration (`legal_doc_trigger_config` table)
- No forensic acceptance log (`legal_acceptance_log` table)
- No `check_legal_gate` RPC function
- No professional legal stylesheet
- No full-screen TipTap editor with legal formatting
- No runtime `LegalGateModal` for platform-wide legal gates
- No first-login PMA acceptance flow

## Implementation Phases

Due to the scale (~30 new files, 1 migration, multiple integration points), this will be implemented in **4 batches**. Each batch is self-contained and testable.

---

### BATCH 1: Database Migration + Legal Stylesheet + Types

**Migration creates/alters:**

1. **Enhance `legal_document_templates`** — Add columns: `document_code` (CHECK PMA/CA/PSA/IPAA/EPIA), `version`, `content` (TipTap HTML), `content_json` (TipTap JSON), `summary`, `sections` (JSONB for IPAA), `applies_to_roles`, `applies_to_model`, `applies_to_mode`, `is_mandatory`, `effective_date`, `parent_template_id`, `version_status` (DRAFT/ACTIVE/ARCHIVED), `original_file_url`, `original_file_name`
2. **Create `legal_doc_trigger_config`** — Maps document_code + trigger_event + role + governance mode. Seed 13 default trigger rules
3. **Create `legal_acceptance_log`** — Forensic-grade acceptance tracking (user_id, template_id, document_code, section, version, challenge_id, trigger_event, action, ip_address, user_agent)
4. **Create `check_legal_gate` RPC** — Returns pending documents for a user/trigger/role combination
5. **RLS policies** on new tables
6. **Seed 5 starter templates** (PMA, CA, PSA, IPAA, EPIA) with professional HTML content
7. **Storage bucket** `legal-documents`

**Stylesheet:**
- Create `src/styles/legal-document.css` — Professional contract-grade formatting (Georgia serif, justified text, legal numbering, article headings, signature blocks, print-friendly)

**Files:**
- `supabase/migrations/YYYYMMDD_legal_doc_management.sql`
- `src/styles/legal-document.css` (~150 lines)

---

### BATCH 2: Admin — Legal Document List + Full-Screen Editor

**Replace** the existing generic `LegalDocumentTemplatesPage` with a professional card-grid list page and full-screen TipTap editor.

**New routes:**
- `/admin/legal-documents` — Card grid showing 5 document codes
- `/admin/legal-documents/:templateId/edit` — Full-screen editor (no sidebar layout)
- `/admin/legal-documents/new?code=PMA` — Create new template

**Files (all under 200 lines):**
- `src/pages/admin/legal/LegalDocumentListPage.tsx` (~80 lines) — card grid
- `src/pages/admin/legal/LegalDocumentEditorPage.tsx` (~150 lines) — full-screen layout with 3 zones
- `src/components/admin/legal/LegalDocumentCard.tsx` (~80 lines)
- `src/components/admin/legal/LegalDocEditorPanel.tsx` (~180 lines) — TipTap with `.legal-doc` class
- `src/components/admin/legal/LegalDocEditorToolbar.tsx` (~150 lines) — legal-specific formatting
- `src/components/admin/legal/LegalDocQuickInserts.tsx` (~80 lines) — recital, signature, definition, clause templates
- `src/components/admin/legal/LegalDocConfigSidebar.tsx` (~150 lines) — targeting, settings, version history
- `src/components/admin/legal/LegalDocUploadHandler.tsx` (~120 lines) — .docx/.pdf upload with mammoth conversion
- `src/components/admin/legal/LegalDocVersionHistory.tsx` (~80 lines)
- `src/components/admin/legal/LegalDocSectionTabs.tsx` (~60 lines) — IPAA section tabs
- `src/components/admin/legal/LegalDocPublishDialog.tsx` (~60 lines)
- `src/components/admin/legal/LegalDocUploadConfirmDialog.tsx` (~60 lines)
- `src/hooks/admin/useLegalDocEditor.ts` (~80 lines) — save/publish mutations
- `src/hooks/admin/useLegalDocUpload.ts` (~100 lines) — upload + conversion hook

**Updates:**
- `src/hooks/queries/useLegalDocumentTemplates.ts` — Update interface + query for new columns
- `src/components/admin/AdminSidebar.tsx` — Replace "Legal Templates" entry with "Legal Documents" and add "Legal Triggers"
- `src/App.tsx` — Add new routes under admin

**Removed:**
- Old `LegalDocumentTemplatesPage.tsx` (replaced)
- Old `LegalTemplateContentEditor.tsx` (replaced by full-screen editor)
- Old `LegalTemplateFileUpload.tsx` (replaced by integrated upload handler)

---

### BATCH 3: Admin — Workflow Trigger Config + Runtime Legal Gate Modal

**Trigger Config page:**
- `/admin/legal-documents/triggers` — Table showing all trigger rules with add/edit/delete

**Files:**
- `src/pages/admin/legal/LegalDocTriggerConfigPage.tsx` (~150 lines)
- `src/components/admin/legal/LegalDocTriggerTable.tsx` (~150 lines)
- `src/components/admin/legal/LegalDocTriggerForm.tsx` (~150 lines) — slide-over form
- `src/hooks/admin/useLegalDocTriggerConfig.ts` (~80 lines)

**Runtime Legal Gate Modal** (reusable across entire platform):
- `src/components/legal/LegalGateModal.tsx` (~150 lines) — modal shell + document sequencing
- `src/components/legal/LegalDocumentViewer.tsx` (~100 lines) — renders HTML with legal-doc CSS + scroll tracking
- `src/components/legal/LegalGateActions.tsx` (~80 lines) — checkbox + scroll gate + accept/decline buttons
- `src/components/legal/LegalGateScrollTracker.tsx` (~60 lines) — scroll progress + 90% detection
- `src/hooks/legal/useLegalGate.ts` (~100 lines) — calls `check_legal_gate` RPC
- `src/hooks/legal/useLegalAcceptance.ts` (~60 lines) — insert into `legal_acceptance_log`

**Acceptance UX rules:**
- Accept button disabled until BOTH: scroll to 90% AND checkbox checked
- Modal is 90vw x 90vh desktop, fullscreen mobile
- Cannot close by clicking outside — must Accept or Decline
- Multi-document sequencing (progress bar when >1 doc)
- Forensics captured: IP address, user agent

---

### BATCH 4: Integration Points

Wire `LegalGateModal` into existing workflows:

1. **First Login / Registration** — After auth, before app access, check PMA acceptance. Add `LegalGateModal` with `triggerEvent="USER_REGISTRATION"` in the auth guard chain. If declined, sign out.

2. **Seeker Enrollment** — Gate CA acceptance during seeker enrollment flow

3. **Solver Enrollment** — Gate PSA acceptance in `SolverEnrollmentCTA`

4. **Challenge Submit** — Gate CA before `initialize_challenge`

5. **Solver Abstract Submit** — Gate PSA + IPAA abstract section

6. **Winner Confirmation** — Gate IPAA final award for both CR and solver

**Approach:** Each integration wraps the existing action with a legal gate check. If `gate_open = true`, proceed silently. If `false`, show modal.

---

## Technical Details

- **TipTap editor styling:** The `.legal-doc` class is applied to `editorProps.attributes.class` so the editor renders with the same legal styling as the viewer — WYSIWYG for legal documents
- **Document versioning:** Publishing creates a new ACTIVE version and archives the previous one. `parent_template_id` chains versions together
- **Sectioned documents (IPAA):** Uses `sections` JSONB field with keys like `abstract`, `milestone`, `detailed`, `final_award`. Section tabs in editor switch between these
- **Upload conversion:** mammoth.js converts .docx to HTML, which replaces TipTap content. The uploaded file is stored as reference, but TipTap HTML is canonical
- **Legal gate RPC:** `check_legal_gate(user_id, trigger_event, challenge_id, user_role, governance_mode)` returns `{gate_open, pending_documents[]}`
- **Existing T&C system:** The `TcReAcceptanceModal` + `tc_versions` system remains for org-level T&C. The new legal gate system handles document-level acceptance (PMA, CA, PSA, IPAA, EPIA)

## Cleanup

- Remove duplicate `DeleteConfirmDialog` on line 104 of current `LegalDocumentTemplatesPage.tsx`
- Remove old `LegalTemplateContentEditor.tsx` and `LegalTemplateFileUpload.tsx`
- Remove old `LegalDocumentTemplatesPage.tsx` under `seeker-config/`

