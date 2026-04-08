

# 5-Why Analysis & Fix Plan: QUICK Mode UX Failures

## 5-Why Root Cause Analysis

**Problem 1: Sidebar shows irrelevant items (Curation Queue, Legal Workspace, Legal Review, FC Queue, Escrow, Payment, Evaluation, Selection) for QUICK mode users**

1. Why? → Sidebar visibility is driven by `useCogniPermissions` which checks `availableRoles` (all roles the user holds across ALL challenges)
2. Why? → `useCogniUserRoles` aggregates roles from `user_challenge_roles` across all challenges into a flat `allRoleCodes` Set
3. Why? → The demo seed assigns ALL roles (CR, CU, ER, LC, FC) to the solo user for QUICK challenges
4. Why? → QUICK mode uses `complete_phase` recursive auto-advance which creates CU role assignments during phase 2 auto-complete
5. **Root cause → The sidebar has NO governance-mode awareness. It shows nav items based on user roles globally, not per-challenge governance context. For QUICK mode, roles like CU/LC/FC/ER are system artifacts of auto-advance — they should NOT produce sidebar items.**

**Problem 2: AI Review button disabled after Save Draft**

1. Why? → Button has `disabled={isBusy || !draftSave.draftChallengeId}` (line 194)
2. Why? → `draftChallengeId` is set by `useCreatorDraftSave` after the save mutation succeeds
3. Why? → The button's onClick does `await draftSave.handleSaveDraft(); setShowAIReview(true)` — it saves then opens the drawer
4. Why? → After the FIRST save, `draftChallengeId` is populated and the button should be enabled
5. **Root cause → If the first save fails or the state update is not reflected synchronously, the button stays disabled. Need to verify — but the logic looks correct IF the save succeeds. The real issue may be that the button appears disabled when no draft exists yet, and the tooltip says "Save draft first" but the UX flow isn't obvious.**

**Problem 3: No display of who (which solvers) receives the challenge after QUICK submit**

1. Why? → After QUICK submit, user gets a toast and navigates to `/cogni/my-challenges`
2. Why? → There is no QUICK-specific success/confirmation screen
3. Why? → The `PublishSuccessScreen` exists but is only used in the `PublicationReadinessPage` (curator publish flow)
4. Why? → QUICK submit flow in `useSubmitSolutionRequest` silently notifies solvers in background (lines 192-220), returns, and shows only a toast
5. **Root cause → No post-submission confirmation screen for QUICK mode showing: published status, legal docs auto-applied, solver notification summary, and next steps.**

**Problem 4: Legal documents not displayed for QUICK mode**

1. Why? → QUICK mode auto-inserts legal docs via `complete_phase` SQL function
2. Why? → The creator form has `ChallengeLegalDocsCard` but it's in the view page, not shown pre-submit
3. Why? → After auto-publish, user goes to My Challenges list — no indication of which legal docs were applied
4. **Root cause → No pre-submit or post-submit display of auto-applied legal documents for QUICK mode.**

---

## Fix Plan — 5 Changes

### Change 1: Governance-Aware Sidebar Filtering
**File: `src/components/cogniblend/shell/CogniSidebarNav.tsx`**

Add governance-mode awareness to sidebar visibility. When user's challenges are ALL QUICK mode, hide CU/LC/FC/ER-specific nav items:
- Curation Queue, Legal Workspace, Legal Review → hidden
- Review Queue, Evaluation Panel, Selection & IP → hidden
- FC Queue, Escrow Management, Payment Processing → hidden

Implementation: In `CogniSidebarNav`, derive a `hasNonQuickChallenges` flag from `useCogniUserRoles` data (check if any challenge has governance mode != QUICK). Pass this flag to `checkVisible` — if false, hide CU/LC/FC/ER items even if user holds those roles.

**File: `src/hooks/cogniblend/useCogniUserRoles.ts`**
Add `hasNonQuickChallenges` derived boolean from the role data (checking `governance_mode_override` on challenges).

**File: `src/hooks/cogniblend/useCogniPermissions.ts`**
Add a `governanceAware` option or expose `hasNonQuickChallenges` so sidebar can filter.

### Change 2: QUICK Mode Post-Submit Confirmation Screen
**File: `src/components/cogniblend/creator/QuickPublishSuccessScreen.tsx` (new)**

After QUICK submit, instead of navigating to My Challenges, navigate to a confirmation screen showing:
- Green success banner: "Challenge Published & Live"
- Legal docs auto-applied (list from `challenge_legal_docs`)
- Solver notification summary: "X solvers notified (Y priority, Z standard with 48h delay)"
- Engagement model context: "Marketplace — solvers can contact you directly" or "Aggregator — platform manages all communication"
- CTA buttons: "View Published Challenge" | "Create Another" | "Dashboard"

**File: `src/components/cogniblend/creator/ChallengeCreatorForm.tsx`**
Update QUICK submit success handler to navigate to the new confirmation page instead of My Challenges.

### Change 3: Show Auto-Applied Legal Docs Summary Pre-Submit
**File: `src/components/cogniblend/creator/QuickLegalDocsSummary.tsx` (new)**

Add a read-only card in the QUICK mode form (below the submit buttons) showing:
- "Platform legal templates will be auto-applied on submission:"
- List: PMA, CA, PSA (based on engagement model — MP gets all 5, AGG gets org templates)
- Badge: "Auto-accepted" for each
- Small info text: "These are non-negotiable standard agreements for Express mode."

**File: `src/components/cogniblend/creator/ChallengeCreatorForm.tsx`**
Render `QuickLegalDocsSummary` when `isQuick === true`, above the button bar.

### Change 4: Solver Audience Preview Pre-Submit
**File: `src/components/cogniblend/creator/SolverAudiencePreview.tsx` (new)**

Show a small card for QUICK mode (and optionally all modes) displaying:
- "This challenge will be sent to X registered solvers"
- Count from `solver_profiles` table
- Breakdown: "Y certified (immediate notification), Z standard (48h delay)"
- If 0 solvers: "No registered solvers yet — challenge will be listed on Browse page"

**File: `src/components/cogniblend/creator/ChallengeCreatorForm.tsx`**
Render below `QuickLegalDocsSummary` for QUICK mode.

### Change 5: AI Review Button UX Improvement
**File: `src/components/cogniblend/creator/ChallengeCreatorForm.tsx`**

Current behavior: AI Review button is disabled until draft is saved, with a tooltip. The flow requires clicking "Save Draft" first, then clicking "AI Review".

Fix: Make the AI Review button always clickable. If no draft exists, auto-save first (which it already does — `await draftSave.handleSaveDraft(); setShowAIReview(true)`). The issue is the `disabled={!draftSave.draftChallengeId}` guard blocks the first click before any save. Remove that guard — the onClick already handles saving before opening.

Change: `disabled={isBusy}` instead of `disabled={isBusy || !draftSave.draftChallengeId}`. The tooltip changes to "Will auto-save draft before review".

---

## Summary

| # | What | Files |
|---|------|-------|
| 1 | Governance-aware sidebar (hide CU/LC/FC/ER items for QUICK-only users) | `CogniSidebarNav.tsx`, `useCogniUserRoles.ts`, `useCogniPermissions.ts` |
| 2 | QUICK post-submit confirmation screen with solver/legal summary | New `QuickPublishSuccessScreen.tsx`, `ChallengeCreatorForm.tsx` |
| 3 | Pre-submit legal docs summary for QUICK mode | New `QuickLegalDocsSummary.tsx`, `ChallengeCreatorForm.tsx` |
| 4 | Pre-submit solver audience preview | New `SolverAudiencePreview.tsx`, `ChallengeCreatorForm.tsx` |
| 5 | AI Review button always clickable (auto-saves) | `ChallengeCreatorForm.tsx` |

