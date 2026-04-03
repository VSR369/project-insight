

# Fix Plan: Legal Gate Modal Issues + Missing Integration Points

## Issues Identified

### Issue 1: PMA Modal Blocks Platform Admins
The `AuthGuard` wraps ALL routes (including admin) and shows the PMA `LegalGateModal` for every user — including platform admins. The `AdminGuard` wraps `AuthGuard`, so admins get blocked by PMA before reaching admin pages.

**The spec says PMA should apply to ALL users** (line 72 of migration: `'{ALL}'`). This is correct — platform admins ARE users and should accept PMA too. However, the problem is likely that:
- The RPC call fails or returns unexpected data, leaving the modal stuck
- OR the modal renders but content is empty (template exists but content field is null/empty), making scroll detection impossible → Accept stays permanently disabled

**Fix:** Add error handling in `AuthGuard` — if the `useLegalGate` query errors, auto-pass (don't block the user). Also add a fallback in `LegalGateModal` when template content is empty (auto-set scroll to 100%).

### Issue 2: Cannot Close PMA Window
The `[&>button]:hidden` CSS IS already applied (line 90 of LegalGateModal). The real issue is the user cannot Accept because:
- If `fullTemplate` returns no content (`content` and `template_content` are both null/empty), the viewer renders empty, `scrollHeight <= clientHeight` should trigger 100% — but `useLegalDocTemplateById` may fail or return stale data.
- The `onScrollProgress(100)` in `LegalDocumentViewer` useEffect fires on mount, but if `content` is initially empty and then updates, the effect might not re-fire.

**Fix:** In `LegalGateModal`, handle the case where content is empty by auto-setting scroll to 100%. Add error boundary so RPC failures don't trap users.

### Issue 3: Missing Integration Points (Spec Prompts 5b-5f)
Only 5a (User Registration / First Login) is wired. The spec requires 5 more:

| Integration | Trigger Event | Status |
|---|---|---|
| 5a. First Login (PMA) | USER_REGISTRATION | Done (in AuthGuard) |
| 5b. Seeker Enrollment (CA) | SEEKER_ENROLLMENT | **Not wired** |
| 5c. Solver Enrollment (PSA) | SOLVER_ENROLLMENT | **Not wired** |
| 5d. Challenge Submit (CA) | CHALLENGE_SUBMIT | **Not wired** |
| 5e. Solver Abstract Submit (PSA+IPAA) | ABSTRACT_SUBMIT | **Not wired** |
| 5f. Winner Confirmation (IPAA) | WINNER_SELECTED | **Not wired** |

### Issue 4: Missing "Quick Insert" Templates
The spec mentions legal-specific quick insert buttons (Recitals, Signature blocks, Definition blocks, Clause templates) in `LegalDocQuickInserts.tsx` — this file exists but needs to be verified it's wired into the editor.

---

## Implementation Steps

### Step 1: Fix LegalGateModal Resilience (Bug Fix)
**Files:** `src/components/legal/LegalGateModal.tsx`, `src/components/auth/AuthGuard.tsx`

- In `LegalGateModal`: Handle RPC error state — if `useLegalGate` errors, call `onAllAccepted()` (fail-open, don't trap user)
- In `LegalGateModal`: If `htmlContent` is empty string, auto-set scroll progress to 100% so Accept can be enabled
- In `AuthGuard`: Add error handling — if the legal gate query fails, pass through (don't block)
- In `LegalDocumentViewer`: Ensure the scroll-100% detection fires when content changes from empty to populated

### Step 2: Wire Integration Points 5b-5f
Each integration adds a `LegalGateModal` check before the existing action proceeds.

**5b. Seeker Enrollment** — Find the seeker enrollment flow component and wrap the enrollment action with a legal gate check for `SEEKER_ENROLLMENT` + role `CR`.

**5c. Solver Enrollment** — Find `SolverEnrollmentCTA` or equivalent and add legal gate for `SOLVER_ENROLLMENT` + role `SOLVER`.

**5d. Challenge Submit** — Find the challenge submission flow and gate with `CHALLENGE_SUBMIT` + role `CR` + challengeId + governanceMode.

**5e. Solver Abstract Submit** — Gate abstract submission with `ABSTRACT_SUBMIT` + role `SOLVER`.

**5f. Winner Confirmation** — Gate winner confirmation with `WINNER_SELECTED` + role based on user (CR or SOLVER).

Each integration follows the same pattern:
1. Add `useState` for `showLegalGate`
2. Before the action, check if legal gate is needed
3. Show `LegalGateModal` if pending docs exist
4. On `onAllAccepted`, proceed with original action
5. On `onDeclined`, show error toast and block

### Step 3: Verify All Spec Components Exist
Cross-check the component tree from the spec (page 20) against what's implemented:

| Component | Exists? |
|---|---|
| LegalDocumentListPage.tsx | Yes |
| LegalDocumentEditorPage.tsx | Yes |
| LegalDocTriggerConfigPage.tsx | Yes |
| LegalDocumentCard.tsx | Yes |
| LegalDocEditorPanel.tsx | Yes |
| LegalDocEditorToolbar.tsx | Yes |
| LegalDocConfigSidebar.tsx | Yes |
| LegalDocUploadHandler.tsx | Yes |
| LegalDocVersionHistory.tsx | Yes |
| LegalDocSectionTabs.tsx | Yes |
| LegalDocPublishDialog.tsx | Yes |
| LegalDocUploadConfirmDialog.tsx | Yes |
| LegalDocTriggerTable.tsx | Yes |
| LegalDocTriggerForm.tsx | Yes |
| LegalGateModal.tsx | Yes |
| LegalDocumentViewer.tsx | Yes |
| LegalGateActions.tsx | Yes |
| useLegalDocEditor.ts | Yes |
| useLegalDocUpload.ts | Yes |
| useLegalDocTriggerConfig.ts | Yes |
| useLegalGate.ts | Yes |
| useLegalAcceptance.ts | Yes |
| LegalDocQuickInserts.tsx | Yes |

All 23+ files exist. The gaps are in **wiring** (integration points) and **error resilience** (modal trapping users).

## Summary
- 2 bug fixes (modal resilience + AuthGuard error handling)
- 5 integration point wirings (5b through 5f)
- ~7 files modified total

