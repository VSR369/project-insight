

# Gap Analysis: Legal Document Management System

## Spec Compliance Status

Comparing the current implementation against both spec documents, here is the complete gap analysis.

---

## FULLY IMPLEMENTED (No Gaps)

| Spec Item | Status |
|---|---|
| Database schema (templates, trigger_config, acceptance_log) | Done |
| RLS policies (fixed in recent migration) | Done |
| `check_legal_gate` RPC function | Done |
| Supabase Storage bucket `legal-documents` | Done |
| All 30 files from component tree exist | Done |
| `legal-document.css` shared stylesheet | Done — matches spec exactly |
| Editor Panel with TipTap + legal-doc class | Done |
| Legal toolbar (H1-H4, bold, italic, underline, lists, table, align, link, clear, undo/redo) | Done |
| Quick Inserts (Recital, Definition, Clause, Signature) | Done |
| Config Sidebar (code selector, name, description, model, mode, roles multi-select, mandatory, date, summary, version history) | Done |
| IPAA section tabs wired to editor content | Done |
| Upload handler (.docx via mammoth, override confirm) | Done |
| Save Draft + Publish Version + auto-save 30s | Done |
| LegalGateModal (sequential docs, scroll tracking, checkbox gate, accept/decline) | Done |
| LegalDocumentViewer with `legal-doc-page` + `legal-doc` classes | Done |
| LegalGateActions (90% scroll threshold, checkbox, accept/decline) | Done |
| LegalGateScrollTracker (extracted component) | Done |
| `useLegalGate` (RPC call) | Done |
| `useLegalAcceptance` (forensic logging: IP, user agent) | Done |
| `useLegalGateAction` (reusable gate hook) | Done |
| Trigger Config page (table + add/edit form) | Done |
| Trigger Form (document code, section, event with descriptions, roles multi-select, mode, mandatory, active, display order) | Done |
| Integration 5a: USER_REGISTRATION (AuthGuard → PMA) | Done |
| Integration 5b: SEEKER_ENROLLMENT (BillingForm → CA) | Done |
| Integration 5c: SOLVER_ENROLLMENT (SolverEnrollmentCTA → PSA) | Done |
| Integration 5d: CHALLENGE_SUBMIT (ChallengeWizardPage → CA) | Done |
| Integration 5e: ABSTRACT_SUBMIT (SolutionSubmitPage → PSA+IPAA) | Done |
| Admin sidebar entries (Legal Documents, Legal Triggers) | Done |
| Routes (list, new, edit, triggers) with PermissionGuard | Done |
| Editor is full-screen standalone layout (no admin sidebar) | Done |
| Acceptance UX: modal 90vw x 90vh, cannot close by clicking outside | Done |
| ESC key prevented on modal | Done |
| Fail-open: RPC errors auto-pass | Done |
| Seed data: 15 trigger config rows | Done |
| Seed data: 5 starter templates | Done |

---

## REMAINING GAPS

### GAP 1: Integration 5f — WINNER_SELECTED / WINNER_CONFIRMED Not Wired

**Spec says:** "In the award decision flow, add gate for IPAA final award — for BOTH CR and winning solver."

**Current:** `WINNER_SELECTED` is defined in types but no component uses `useLegalGateAction` with this trigger. No `LegalGateModal` with `triggerEvent="WINNER_SELECTED"` exists in any award/winner flow.

**Fix:** Find the winner confirmation/award decision component and wire the gate.

### GAP 2: Version Change Detection Banner Missing

**Spec (Page 16) says:** "If user previously accepted an older version, show banner: 'This document has been updated since you last accepted it.' Show 'What changed' link that opens a diff view (optional — V2 feature)."

**Current:** No version change detection banner exists in `LegalGateModal`. The gate RPC handles re-acceptance correctly (won't show if already accepted current version), but there's no visual indicator that a new version is being shown.

**Fix:** Add a banner in `LegalGateModal` when the document is being re-shown due to a version update. This can be detected by checking if the user has accepted any previous version of the same document_code.

### GAP 3: AdminSidebar Legal Triggers Icon Wrong

**Spec (Page 19) says:** `{ title: 'Legal Triggers', icon: Workflow, path: '/admin/legal-documents/triggers' }`

**Current:** Uses `Shield` icon instead of `Workflow` icon.

**Fix:** Change icon from `Shield` to `Workflow` in AdminSidebar.

---

## SUMMARY

**30 out of 30 files:** All present.
**22 of 22 verification checklist items:** 20 confirmed done, 1 gap (winner confirmation gate), 1 gap (version change banner).
**1 minor UI issue:** Wrong sidebar icon for Legal Triggers.

The system is 95%+ complete. Only 3 small gaps remain — none are architectural. All can be resolved in a single implementation pass touching ~3 files.

---

## Implementation Plan

### Step 1: Wire WINNER_SELECTED gate
- Find the award decision / winner confirmation component
- Add `useLegalGateAction({ triggerEvent: 'WINNER_SELECTED' })` + `LegalGateModal`

### Step 2: Add version change detection banner
- In `LegalGateModal`, query if user has accepted any previous version of the same `document_code`
- If yes, show a subtle banner: "This document has been updated since you last accepted it."

### Step 3: Fix sidebar icon
- Change `Shield` → `Workflow` for Legal Triggers in `AdminSidebar.tsx`

**Files to modify:** ~3-4 files, minimal changes.

