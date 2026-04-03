

# Gap Analysis: Legal Document Management System vs Spec

## Status Summary

All 30 files from the component tree exist. The core admin editor, trigger config, and runtime gate modal are implemented. Below are the **remaining gaps** organized by priority.

---

## GAP 1: IPAA Section Tabs Not Wired to Content (Spec Prompt 2)

**Spec says:** "If document has `sections` (like IPAA), show section tabs above editor. Each tab edits `sections.{section_name}` in the JSONB."

**Current state:** `LegalDocSectionTabs` renders and `activeSection` state exists in `LegalDocumentEditorPage`, but:
- The `activeSection` value is never passed to `LegalDocEditorPanel`
- The editor always shows `editorState.content` regardless of which tab is selected
- No logic reads/writes to the `sections` JSONB column per-section

**Fix:** When IPAA, read/write content from `template.sections[activeSection]` instead of `template.content`. The hook needs `getContentForSection(section)` and `setContentForSection(section, html)` methods.

**Files:** `useLegalDocEditor.ts`, `LegalDocumentEditorPage.tsx`, `LegalDocEditorPanel.tsx`

---

## GAP 2: Missing Integration Points (Spec Prompt 5)

Only 3 of 6+ integration points are wired:

| Integration | Trigger | Status |
|---|---|---|
| 5a. User Registration (PMA) | USER_REGISTRATION | Done (AuthGuard) |
| 5b. Seeker Enrollment (CA) | SEEKER_ENROLLMENT | **NOT WIRED** |
| 5c. Solver Enrollment (PSA) | SOLVER_ENROLLMENT | Done (SolverEnrollmentCTA) |
| 5d. Challenge Submit (CA) | CHALLENGE_SUBMIT | **NOT WIRED** |
| 5e. Abstract Submit (PSA+IPAA) | ABSTRACT_SUBMIT | Done (SolutionSubmitPage) |
| 5f. Winner Confirmation (IPAA) | WINNER_SELECTED | **NOT WIRED** |

**Fix:** Find the Seeker Enrollment flow, Challenge Submit flow, and Winner Confirmation flow components and wire `useLegalGateAction` + `LegalGateModal` into each.

**Files:** Need to identify: seeker enrollment component, challenge submission component, winner confirmation component.

---

## GAP 3: Missing `LegalGateScrollTracker.tsx` (Styling Addendum)

**Spec says:** Create `LegalGateScrollTracker.tsx` (~60 lines) — a scroll progress bar + 90% detection component.

**Current state:** Scroll progress tracking is built inline in `LegalDocumentViewer.tsx` and the progress bar is inline in `LegalGateActions.tsx`. The functionality EXISTS but is not in a separate file as specified. This is a **cosmetic/organizational gap** — no functional impact.

**Recommendation:** Low priority. Functionality is complete; just not decomposed into a separate component.

---

## GAP 4: Save Draft Content Not Persisting Properly

The user reported save draft is not working. The RLS migration was just applied. Need to verify:
1. The `useSaveLegalDocDraft` mutation sends `content` and `content_json` correctly
2. The publish flow (`usePublishLegalDoc`) archives old versions and activates new
3. RLS policies now allow the correct admin tiers to INSERT/UPDATE

**Status:** RLS fix migration was applied. Code logic looks correct. This needs **end-to-end testing**.

---

## GAP 5: Starter Template Content Not Seeded (Styling Addendum)

**Spec says:** Seed 5 default document templates (PMA, CA, PSA, IPAA, EPIA) with professional legal HTML content.

**Current state:** The migration script in the spec includes full HTML content for all 5 documents. Need to verify if these were seeded in the database.

**Fix:** Check if templates exist in DB. If not, create a migration to seed them.

---

## GAP 6: ConfigSidebar Missing "Applies to Roles" Multi-Select

**Spec says:** Config sidebar should have "Applies to roles (multi-select: CR, CU, ER, LC, FC, SOLVER, ALL)"

**Current state:** `LegalDocConfigSidebar.tsx` has Model and Mode selects but **no roles multi-select**. The `applies_to_roles` field (TEXT[]) is not editable in the sidebar.

**Fix:** Add a multi-select for roles in the config sidebar.

**Files:** `LegalDocConfigSidebar.tsx`

---

## Implementation Plan

### Step 1: Fix IPAA Section Editing
- Update `useLegalDocEditor` to manage section-specific content from `sections` JSONB
- Pass `activeSection` through to the editor panel
- When saving, write section content back to `sections.{key}`

### Step 2: Wire Missing Integration Points (5b, 5d, 5f)
- Find and wire Seeker Enrollment flow with `SEEKER_ENROLLMENT` gate
- Find and wire Challenge Submit flow with `CHALLENGE_SUBMIT` gate
- Find and wire Winner Confirmation flow with `WINNER_SELECTED` gate

### Step 3: Add Roles Multi-Select to Config Sidebar
- Add checkbox group or multi-select for `applies_to_roles` in `LegalDocConfigSidebar.tsx`

### Step 4: Verify Starter Templates Seeded
- Query DB for existing templates
- If missing, create seed migration

### Step 5: End-to-end Verification
- Test save draft after RLS fix
- Test publish flow
- Test upload override

**Total: ~8 files modified, 1 potential migration**

