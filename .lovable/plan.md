

# Assessment: Role-Aware Workspace Mode — Current State

## What IS Implemented (Phase 1 — DONE)

| Component | Status | Details |
|---|---|---|
| `CogniRoleContext` | DONE | activeRole, availableRoles, challengeRoleMap, localStorage persistence, cross-tab sync, validation |
| `RoleSwitcher` | DONE | Top bar dropdown with colored badges, challenge counts, solo mode banner |
| `CogniSidebarNav` | DONE | Relevance-based highlighting (opacity-50 dimming), left accent borders for active role items |
| `ActionItemsWidget` | DONE | Filtered by activeRole via challengeRoleMap, dynamic primary action button, "See all tasks" link, role-specific empty state, skeleton loading |
| `CogniTopBar` | DONE | RoleSwitcher integrated, old static badges removed |
| `CogniShell` | DONE | Wrapped with CogniRoleProvider |

## What is NOT Yet Implemented

### Gap 1: Dashboard sections ignore activeRole
`CogniDashboardPage.tsx` still calls `useCogniUserRoles()` directly (line 12, 27) and passes raw `allRoleCodes` to `useCompletePhase`. The sub-widgets `NeedsActionSection`, `WaitingForSection`, and `MyChallengesSection` do NOT filter by `activeRole` — they show ALL challenges regardless of workspace focus. Only `ActionItemsWidget` is role-aware.

### Gap 2: NeedsActionSection shows all phases
`NeedsActionSection` has a `PHASE_ROLE_MAP` (phase → role code) but does not use `activeRole` to filter which "Needs Action" cards are shown. A Curator sees Creator and Finance Controller cards mixed in.

### Gap 3: MyChallengesSection has hardcoded role tabs
`MyChallengesSection` has its own `ROLE_TABS` (ALL, CR, CU, ER, ID) that are independent of the workspace `activeRole`. It should auto-select the tab matching the active workspace role and only show tabs for roles the user actually holds.

### Gap 4: Dashboard still imports useCogniUserRoles directly
`CogniDashboardPage` imports `useCogniUserRoles` (redundant — already consumed inside `CogniRoleContext`), creating a duplicate query and bypassing the context.

### Gap 5: No role-specific KPI/stat widgets on dashboard
The dashboard has no role-contextual summary cards (e.g., Curator sees curation stats, FC sees escrow stats). Only `ActionItemsWidget` adapts.

---

## Plan: Wire Remaining Dashboard to activeRole

### 1. `src/pages/cogniblend/CogniDashboardPage.tsx`
- Remove direct `useCogniUserRoles` import — use `useCogniRoleContext()` instead
- Pass `activeRole` to `NeedsActionSection` and `MyChallengesSection`
- Pass `availableRoles` to `useCompletePhase` (instead of raw `allRoleCodes`)

### 2. `src/components/cogniblend/dashboard/NeedsActionSection.tsx`
- Accept `activeRole?: string` prop
- Filter challenge cards: only show cards where `PHASE_ROLE_MAP[current_phase]` matches `activeRole` (when set)
- Keep all cards visible if `activeRole` is empty/undefined (fallback)

### 3. `src/components/cogniblend/dashboard/MyChallengesSection.tsx`
- Accept `activeRole?: string` and `availableRoles?: string[]` props
- Filter `ROLE_TABS` to only show tabs for roles in `availableRoles`
- Auto-select the tab matching `activeRole` on mount/change (instead of defaulting to "ALL")
- Keep "ALL" tab available as first option

### 4. `src/components/cogniblend/dashboard/WaitingForSection.tsx`
- Accept `activeRole?: string` prop
- Filter waiting items by the active role's relevant phases (using `PHASE_ROLE_MAP`)

### 5. Minor: `useCompletePhase` compatibility
- Verify it works with `Set` from `availableRoles` array (currently expects `Set<string>` from `allRoleCodes`)

### Summary
5 files modified. No new files. No database changes. The per-challenge detail pages (Curation, Approval, Legal, Screening) already use `useUserChallengeRoles` correctly — no changes needed there.

