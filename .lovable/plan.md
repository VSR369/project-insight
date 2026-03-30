

# Role Architecture Redesign — Gap Analysis

## Phases 1–4: COMPLETED ✅

**Layer 1 (Role Definitions):** `cogniRoles.ts`, `useCogniPermissions.ts`, `rewardStructureResolver.ts` — all updated. AM/RQ/CA/ID removed. Legacy aliases in place. ✅

**Layer 2 (Navigation):** `CogniSidebarNav.tsx` — clean. No AM/RQ/CA/ID references. ✅

**Layer 3 (File Deletions):** All 13 files deleted. No dangling imports for deleted pages. ✅

**Layer 4 (Marketplace Assignment):** `useAutoAssignChallengeRoles.ts` — CU only. `AssignMemberModal` — imports `useSolutionRequests` (still exists, functioning). ✅

**Layer 7 (Dashboard):** `NeedsActionSection`, `WaitingForSection`, `MyChallengesSection` — updated. ✅

**Layer 9 (Routes):** Deleted page routes removed from `App.tsx`. ✅

---

## REMAINING GAPS (14 issues across Phases 5–6 + residual cleanup)

### GAP 1: `useSolutionRequestContext.ts` — `useChallengeArchitects` NOT removed
**File:** `src/hooks/queries/useSolutionRequestContext.ts` (line 56)
**Issue:** `useChallengeArchitects()` export still exists. Only consumer is `SimpleIntakeForm.tsx` (also not yet replaced).
**Fix:** Remove `useChallengeArchitects` function from the file.

### GAP 2: `useMyRequests.ts` — NOT deleted
**File:** `src/hooks/queries/useMyRequests.ts`
**Issue:** File still exists. Not imported anywhere critical but should be deleted per plan.
**Fix:** Delete the file.

### GAP 3: `SimpleIntakeForm.tsx` — NOT replaced (Phase 6)
**File:** `src/components/cogniblend/SimpleIntakeForm.tsx` (1,151 lines)
**Issue:** Still exists with AM/RQ-focused logic. Still imported in `ChallengeCreatePage.tsx`. The new 2-tab Creator form (`src/components/cogniblend/creator/`) does not exist.
**Fix:** Phase 6 — create `ChallengeCreatorForm.tsx`, `EssentialDetailsTab.tsx`, `AdditionalContextTab.tsx`. Update `ChallengeCreatePage.tsx` to use the new form.

### GAP 4: `ChallengeCreatePage.tsx` — still references old form
**File:** `src/pages/cogniblend/ChallengeCreatePage.tsx` (line 31)
**Issue:** Still imports `SimpleIntakeForm`. Still references AM/RQ in comments.
**Fix:** Part of Phase 6 — rewrite to use new Creator form.

### GAP 5: `useMsmeConfig.ts` — `challenge_requestor_enabled` NOT removed (Phase 5)
**File:** `src/hooks/queries/useMsmeConfig.ts`
**Issue:** Still has `challenge_requestor_enabled` field in interface, query, and `useToggleChallengeRequestor` hook.
**Fix:** Remove the field and hook.

### GAP 6: `RoleManagementDashboard.tsx` — still uses `challenge_requestor_enabled` (Phase 5)
**File:** `src/pages/rbac/RoleManagementDashboard.tsx` (line 56-61)
**Issue:** Still reads `msmeConfig?.challenge_requestor_enabled` and filters R10_CR roles based on it.
**Fix:** Remove the toggle logic. Filter AM/CA/ID/RQ from role display entirely.

### GAP 7: `AssignRoleSheet.tsx` — R10_CR special handling NOT removed (Phase 5)
**File:** `src/components/rbac/roles/AssignRoleSheet.tsx` (lines 161, 380, 616)
**Issue:** Still has `isR10CR` checks and department selector for R10_CR.
**Fix:** Remove R10_CR special handling.

### GAP 8: `CogniShell.tsx` — dead route titles
**File:** `src/components/cogniblend/shell/CogniShell.tsx` (lines 21, 24)
**Issue:** `ROUTE_TITLES` still has `'/cogni/submit-request': 'Submit Request'` and `'/cogni/approval': 'Approval Queue'`.
**Fix:** Remove these entries.

### GAP 9: `useCompletePhase.ts` — legacy role nav entries
**File:** `src/hooks/cogniblend/useCompletePhase.ts` (lines 17-24)
**Issue:** `ROLE_NAV_MAP` still has CA, ID, AM, RQ entries pointing to deleted routes (`/cogni/approval`, `/cogni/my-requests`).
**Fix:** Remove CA, ID, AM, RQ entries. Keep CR, CU, ER, LC, FC only.

### GAP 10: `MyActionItemsSection.tsx` — references deleted routes
**File:** `src/components/cogniblend/dashboard/MyActionItemsSection.tsx` (lines 78-96)
**Issue:** `getActionRoute()` returns `/cogni/my-requests/...` routes (deleted). AM_APPROVAL_PENDING status handling.
**Fix:** Replace with `/cogni/my-challenges/...` routes. Remove AM-specific status handling.

### GAP 11: `DemoLoginPage.tsx` — ID role login card
**File:** `src/pages/cogniblend/DemoLoginPage.tsx` (lines 111-118)
**Issue:** Still has ID (Dana Irving) login card pointing to `/cogni/approval`.
**Fix:** Remove the ID login card. (Or repurpose if the test user is remapped.)

### GAP 12: `ChallengeWizardPage.tsx` — references `/cogni/my-requests`
**File:** `src/pages/cogniblend/ChallengeWizardPage.tsx` (line 702)
**Issue:** "View Original Request" button navigates to `/cogni/my-requests`.
**Fix:** Remove or redirect to `/cogni/my-challenges`.

### GAP 13: Edge function — `intake` and `spec` still in VALID_CONTEXTS (Phase 6)
**File:** `supabase/functions/review-challenge-sections/index.ts` (line 267)
**Issue:** `VALID_CONTEXTS` still includes `"intake"` and `"spec"`. Comment on line 5 still mentions them.
**Fix:** Remove from array. Keep fallback to `"curation"` (already works via line 1259).

### GAP 14: `ApprovalActionBar.tsx` and approval components — NOT deleted
**File:** `src/components/cogniblend/approval/ApprovalActionBar.tsx` (and related `ApprovalReturnModal.tsx`, `ApprovalRejectModal.tsx`)
**Issue:** These approval UI components still exist and import `useApprovalActions`. Pages are deleted but components remain.
**Fix:** Delete or mark as legacy. They're not route-reachable but add dead code.

---

## Implementation Plan

### Batch 1: Phase 5 — RBAC & Admin Cleanup (5 files)
1. Remove `challenge_requestor_enabled` and `useToggleChallengeRequestor` from `useMsmeConfig.ts`
2. Remove R10_CR filtering from `RoleManagementDashboard.tsx`
3. Remove R10_CR special handling from `AssignRoleSheet.tsx`
4. Delete `useMyRequests.ts`
5. Remove `useChallengeArchitects` from `useSolutionRequestContext.ts`

### Batch 2: Residual cleanup (5 files)
1. Remove dead route titles from `CogniShell.tsx`
2. Clean `useCompletePhase.ts` — remove CA/ID/AM/RQ from ROLE_NAV_MAP
3. Fix `MyActionItemsSection.tsx` — remove AM routes, update to `/cogni/my-challenges`
4. Fix `ChallengeWizardPage.tsx` — remove `/cogni/my-requests` reference
5. Remove ID login card from `DemoLoginPage.tsx`

### Batch 3: Edge function cleanup (1 file)
1. Remove `intake` and `spec` from VALID_CONTEXTS in edge function

### Batch 4: Phase 6 — New Challenge Creator Form (4 new files + 2 updates)
1. Create `src/components/cogniblend/creator/ChallengeCreatorForm.tsx`
2. Create `src/components/cogniblend/creator/EssentialDetailsTab.tsx`
3. Create `src/components/cogniblend/creator/AdditionalContextTab.tsx`
4. Update `ChallengeCreatePage.tsx` to use new form
5. Delete `SimpleIntakeForm.tsx`
6. Final rewrite of `useSubmitSolutionRequest.ts` for direct create flow

### Batch 5: Dead code cleanup (optional)
1. Delete approval UI components (`ApprovalActionBar.tsx`, modals) or mark legacy

