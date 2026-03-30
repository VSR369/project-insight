

# Role Architecture Redesign — 5 Roles to 2+3 (CR, CU + ER, LC, FC)

## Overview

Remove AM, RQ, CA, ID roles. Retain CR (Challenge Creator), CU (Challenge Curator), and support roles ER, LC, FC. Simplify the challenge lifecycle from `intake → spec → curation → approval → publish` to `draft → curation → publish`.

**55 files affected. 13 files deleted. ~25 files modified. 3 new files created.**

---

## Phase 1: Role Definitions & Permissions (Foundation)

No files deleted. 3 files updated. This is the safest starting point — changes constants and permission flags only.

**Files:**

| File | Change |
|------|--------|
| `src/types/cogniRoles.ts` | Remove AM, RQ, CA, ID from ROLE_PRIORITY, ROLE_DISPLAY, ROLE_COLORS, ROLE_PRIMARY_ACTION, ROLE_NAV_RELEVANCE. Keep CR, CU, ER, LC, FC. |
| `src/hooks/cogniblend/useCogniPermissions.ts` | Remove `canSeeRequests`, `canSubmitRequest`, `canSeeApprovalQueue`, `canApprove`, `isBusinessOwner`, `hasConflictingIntent`. Change `canCreateChallenge`/`canEditSpec` to `can(['CR'])`. Add `canSeeCreatorDashboard: sees(['CR'])`. |
| `src/services/rewardStructureResolver.ts` | Change `SourceRole` to `'CR' \| 'CURATOR'`. Remove AM/CA from ROLE_DISPLAY_NAMES. Treat legacy 'AM'/'CA' source_role values as 'CR' for backward compat. |

---

## Phase 2: Remove Request & Approval Flows (Biggest cleanup)

Delete 13 files. Update routes in App.tsx. Remove dead imports.

**Files to DELETE:**

| File | Lines | Reason |
|------|-------|--------|
| `src/pages/cogniblend/CogniSubmitRequestPage.tsx` | ~1059 | AM submit-request flow |
| `src/pages/requests/NewSolutionRequestPage.tsx` | — | Duplicate request form |
| `src/pages/requests/SolutionRequestsListPage.tsx` | — | AM "My Requests" list |
| `src/pages/cogniblend/CogniMyRequestsPage.tsx` | — | AM/RQ requests page |
| `src/pages/cogniblend/AMChallengeReviewPage.tsx` | ~457 | AM review page |
| `src/pages/cogniblend/AMRequestViewPage.tsx` | ~111 | AM request view |
| `src/pages/cogniblend/ApprovalQueuePage.tsx` | ~364 | ID approval queue |
| `src/pages/cogniblend/ApprovalReviewPage.tsx` | — | ID review page |
| `src/hooks/queries/useSolutionRequests.ts` | — | Request queue hook |
| `src/hooks/queries/useMyRequests.ts` | — | My requests hook |
| `src/components/cogniblend/dashboard/MyRequestsTracker.tsx` | — | AM request tracker widget |
| `src/components/rbac/ChallengeRequestorToggle.tsx` | — | R10_CR toggle |
| `src/components/admin/marketplace/PreviousTeamSuggestion.tsx` | — | 4-role team suggestion |

**Files to UPDATE:**

| File | Change |
|------|--------|
| `src/App.tsx` | Remove lazy imports + routes for all 8 deleted pages. Remove `/cogni/submit-request`, `/cogni/my-requests/*`, `/cogni/approval`, `/cogni/approval/:id`, `/requests/new`, `/requests`. |
| `src/components/cogniblend/shell/CogniSidebarNav.tsx` | Remove AM, RQ, CA, ID from `SEEKING_ORG_ROLES`. Remove Approval Queue nav item. Remove `approvalQueue` badge. Update "New Challenge" visibility to `p.canSeeChallengePage` only (remove `canSeeRequests`). Remove `canSeeApprovalQueue` references from Evaluation/Selection items. |
| `src/hooks/cogniblend/useSubmitSolutionRequest.ts` | Rewrite: remove CA/AM assignment logic. Challenge goes to `current_phase=2` (curation-ready). Source role always 'CR'. Remove `autoAssignChallengeRole` for CA. |
| `src/hooks/queries/useSolutionRequestContext.ts` | Remove `useChallengeArchitects` export. |
| `src/hooks/cogniblend/useApprovalActions.ts` | Keep file but mark as legacy — existing challenges may still reference it. |

---

## Phase 3: Dashboard & Navigation Cleanup

**Files to UPDATE:**

| File | Change |
|------|--------|
| `src/components/cogniblend/dashboard/NeedsActionSection.tsx` | Update `PHASE_ROLE_MAP`: Phase 1→CR, Phase 2→CR, Phase 4/5/6/9→remove (no ID). Phase 13→CR only. Remove AM, CA, ID references. |
| `src/components/cogniblend/dashboard/WaitingForSection.tsx` | Same `PHASE_ROLE_MAP` updates as above. |
| `src/components/cogniblend/dashboard/MyChallengesSection.tsx` | Remove AM, RQ, CA, ID from `TAB_ELIGIBLE_ROLES` and `TAB_LABELS`. Keep CR, CU, ER, LC, FC. |
| `src/pages/cogniblend/CogniDashboardPage.tsx` | Remove MyRequestsTracker import/usage. Remove approval-related dashboard sections. |

---

## Phase 4: Marketplace Assignment Simplification

**Files to UPDATE:**

| File | Change |
|------|--------|
| `src/components/admin/marketplace/ChallengeAssignmentPanel.tsx` | Show only CU slot (CR as read-only info). Remove AM/CA/ID slots. |
| `src/components/admin/marketplace/AssignMemberModal.tsx` | Only CU role assignable from pool. |
| `src/components/admin/marketplace/ReassignmentModal.tsx` | Only CU reassignment. |
| `src/components/admin/marketplace/TeamCompletionBanner.tsx` | Complete = CU assigned. |
| `src/components/admin/marketplace/TeamCompletionReminder.tsx` | Remind only for CU. |
| `src/components/admin/marketplace/RoleBadge.tsx` | Remove AM, CA, ID badge configs. |
| `src/hooks/cogniblend/useAutoAssignChallengeRoles.ts` | Only auto-assign CU (remove CA, ID logic). |
| `src/hooks/cogniblend/useRoleReadinessGate.ts` | Readiness = CU available. Simplify missing roles check. |

---

## Phase 5: RBAC & Admin Cleanup

**Files to UPDATE:**

| File | Change |
|------|--------|
| `src/pages/rbac/RoleManagementDashboard.tsx` | Remove ChallengeRequestorToggle import/usage. Filter AM/CA/ID/RQ from role display. |
| `src/components/rbac/roles/AssignRoleSheet.tsx` | Remove R10_CR special handling. |
| `src/pages/admin/knowledge-centre/SeekerConfigKCPage.tsx` | Remove challenge_requestor_enabled toggle. |
| `src/hooks/queries/useMsmeConfig.ts` | Remove `challenge_requestor_enabled` field and `useToggleChallengeRequestor` hook. |

**Database migration:**
```sql
-- Soft-disable removed roles
UPDATE platform_roles SET is_active = false, updated_at = NOW()
WHERE code IN ('AM', 'RQ', 'CA', 'ID');

-- Auto-grant CR to users who had AM or CA
-- Auto-grant CU to users who had ID
-- (Data migration via insert tool, not schema change)
```

---

## Phase 6: New Challenge Creator Form

Replace `SimpleIntakeForm.tsx` (1151 lines, AM/RQ-focused) with a new 2-tab Creator form.

**New files:**

| File | Purpose |
|------|---------|
| `src/components/cogniblend/creator/ChallengeCreatorForm.tsx` | Main form with engagement model toggle + 2 tabs |
| `src/components/cogniblend/creator/EssentialDetailsTab.tsx` | Tab 1: Title, Problem, Scope, Solution Depth, Domain, Budget, IP, Expected Results |
| `src/components/cogniblend/creator/AdditionalContextTab.tsx` | Tab 2: Context, Approach, Exclusions, Stakeholders, Deficiencies, Root Causes, Timeline, File uploads, URLs |

**Files to UPDATE:**

| File | Change |
|------|--------|
| `src/pages/cogniblend/ChallengeCreatePage.tsx` | Point to new `ChallengeCreatorForm` instead of `SimpleIntakeForm` |
| `src/hooks/cogniblend/useSubmitSolutionRequest.ts` | Final rewrite: create challenge with `current_phase=2`, source_role='CR', no CA assignment, auto-assign CU for MP |
| `supabase/functions/review-challenge-sections/index.ts` | Remove 'intake'/'spec' contexts. source_role always 'CR'. |

**Key behaviors:**
- Engagement model toggle (MP/AGG) at top
- MP: budget mandatory. AGG: budget optional
- "Solution depth" maps to maturity_level (Blueprint/POC/Pilot)
- Tab 2 fields map to same `extended_brief` keys the Curator AI reads
- File/URL uploads go to `challenge_attachments`
- Submit → `current_phase=2` (ready for curation)
- MP: auto-assign CU from platform pool
- AGG: creator selects CU from org or self-curates

---

## Implementation Strategy

Phases 1-3 first (foundation + cleanup) — these are safe refactors that remove dead code and update constants. Phase 4-5 next (marketplace + RBAC). Phase 6 last (new form — highest risk, most new code).

Each phase is independently deployable and testable. Backward compatibility maintained for existing challenges via legacy role aliases in the resolver.

