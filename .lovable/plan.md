

# Analysis: Current Dynamic Workflow Implementation for Challenge Lifecycle

## What's Working Well

### 1. Dynamic Sidebar Navigation (Role-Aware)
`CogniSidebarNav` uses `useCogniUserRoles()` which calls `get_user_all_challenge_roles` RPC. This returns all challenge-level role codes (AM, CR, CU, ID, ER, LC, FC, RQ) across all challenges. The sidebar **dynamically shows/hides** menu items based on the user's actual roles:
- Solo user with ALL roles → sees ALL menu items
- Single-role user (e.g., Curator only) → sees only "Curation Queue"
- `requiredRoles: []` items (Solver section) → always visible

### 2. Recursive Phase Engine (`complete_phase` RPC)
When a Solo user completes a phase, the `complete_phase` function **auto-advances** through phases where the same user holds the next required role. Sequential toasts show each auto-completed phase. It stops when:
- A **different actor** is needed (`stopped_reason: 'different_actor'`)
- **Solver phase** (Phase 7) is reached
- Shows "Waiting for: [Role Name]" toast when blocked

### 3. Tier Limit Gate (GATE-01)
Both `CogniSubmitRequestPage` and `ChallengeWizardPage` check `useTierLimitCheck()` before allowing creation — blocks with `TierLimitModal` if org has hit max active challenges.

### 4. Role Readiness Infrastructure
- `role_readiness_cache` table tracks org-level readiness per engagement model
- `RoleReadinessPanel`, `RoleReadinessTable`, `RoleReadinessWidget` exist in the Org portal
- `role-readiness-notify` Edge Function sends notifications on readiness transitions
- `SubmissionBlockedScreen` component exists with missing role details + admin contact routing (MP → Platform Admin, AGG → SOA)

---

## Critical Gaps Found

### GAP A: `SubmissionBlockedScreen` is Never Used
The component exists but is **not imported or rendered anywhere**. Neither `CogniSubmitRequestPage` nor `ChallengeWizardPage` checks role readiness before allowing challenge/request creation. A user can start a challenge even if no Curator, Innovation Director, etc. exists — the challenge will just get stuck at that phase with no one to act.

### GAP B: CogniTopBar Shows Hardcoded Roles
Line 80: `const userRoles = ['CR', 'CU']; // placeholder` — the avatar dropdown always shows CR + CU badges regardless of actual roles. Should use `useCogniUserRoles()`.

### GAP C: No Pre-Creation Role Readiness Check in CogniBlend
When AM (MP) or RQ (AGG) tries to submit a request or CR tries to create a challenge, there's no check whether the downstream roles (CU, ID, ER, etc.) are assigned. The `role_readiness_cache` is checked in the Org portal but **never in the CogniBlend portal**.

### GAP D: No Immediate Notification Trigger on Missing Roles
The `role-readiness-notify` Edge Function exists but is only called from the Org portal's role assignment flow. When a CogniBlend user hits a role gap, no automatic notification is sent to the Platform Admin (MP) or SOA (AGG).

### GAP E: Solo User UX Has No Special Treatment
When one user holds all roles, the sidebar shows all 14+ items with no visual grouping or indication that they're operating in "solo mode." The workflow shows "Waiting for: Curator" toasts even though the Curator IS the same user — confusing.

### GAP F: No "Next Step" Guidance After Phase Completion
After auto-completion stops (e.g., Phase 2 → 3 auto-completed, stops at Phase 4 because a different actor is needed), the user is left on the dashboard with no clear call-to-action directing them to the next screen. The "Needs Your Action" section shows the challenge but doesn't explain what role they need to act as.

---

## Proposed Remediation Plan

### Phase 11A: Role Readiness Gate Before Challenge Creation
**Files:**
- `src/hooks/cogniblend/useRoleReadinessGate.ts` (new) — Hook that checks `role_readiness_cache` for the user's org + model. Returns `{ isReady, missingRoles, adminContact }`.
- `src/pages/cogniblend/CogniSubmitRequestPage.tsx` — Add readiness check; if NOT_READY, render `SubmissionBlockedScreen` instead of the form.
- `src/pages/cogniblend/ChallengeWizardPage.tsx` — Same readiness gate.
- Auto-trigger `role-readiness-notify` Edge Function when NOT_READY is detected (creates notification for Platform Admin or SOA).

### Phase 11B: Fix CogniTopBar Real Roles
**File:** `src/components/cogniblend/shell/CogniTopBar.tsx`
- Replace `const userRoles = ['CR', 'CU']` with data from `useCogniUserRoles()`.allRoleCodes.
- Show actual role badges dynamically.

### Phase 11C: Solo Mode UX Improvements
**Files:**
- `src/components/cogniblend/shell/CogniSidebarNav.tsx` — When `allRoleCodes.size >= 6` (near-solo), show a subtle "Solo Mode" indicator badge at the top of the sidebar.
- `src/hooks/cogniblend/useCompletePhase.ts` — When `stopped_reason === 'different_actor'` AND the current user holds that waiting role, change the toast from "Waiting for: Curator" to "Next: Act as Curator → [Navigate to Curation Queue]" with a clickable action.
- `src/components/cogniblend/dashboard/NeedsActionSection.tsx` — Add role context badge on each card showing "Act as: CR" / "Act as: CU" so the user knows which hat to wear.

### Phase 11D: Smart Navigation After Phase Transition
**File:** `src/hooks/cogniblend/useCompletePhase.ts`
- After auto-completion, if `stopped_reason === 'different_actor'` and the user holds the `waiting_for_role`, auto-navigate to the relevant screen (e.g., CU → `/cogni/curation`, ID → `/cogni/approval`).
- If the user does NOT hold the waiting role, show the "Waiting for: [Role Name]" toast with admin contact info.

### Phase 11E: Missing Role Notification Trigger from CogniBlend
**File:** `src/hooks/cogniblend/useRoleReadinessGate.ts`
- When NOT_READY detected, call `role-readiness-notify` Edge Function with `transition_type: 'not_ready'` and include the challenge context.
- This sends immediate alerts to the Platform Admin (MP) or SOA (AGG) with the missing roles and blocked challenge reference.

### Execution Summary

| Phase | Gap | Risk | Files |
|-------|-----|------|-------|
| 11A | Role readiness gate | Medium | 3 files (1 new hook + 2 page edits) |
| 11B | TopBar real roles | Low | 1 file |
| 11C | Solo mode UX | Low | 3 files |
| 11D | Smart navigation | Medium | 1 file |
| 11E | Missing role notifications | Medium | 1 file (hook + edge fn call) |

No database migrations needed. All changes are additive — existing functionality preserved.

