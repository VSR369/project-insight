

# Plan: Role-Aware Workspace Mode System

## Overview
Implement a role context system that reduces cognitive overload for multi-role users by providing workspace-focused navigation, filtered action items, and role-specific primary actions — without hiding accessible nav items.

## Files to Create

### 1. `src/types/cogniRoles.ts` — Type definitions
- `ROLE_PRIORITY` constant array: `['CA', 'CR', 'AM', 'RQ', 'CU', 'ID', 'ER', 'LC', 'FC']`
- `ROLE_DISPLAY` map (move from ActionItemsWidget): role code → full name
- `ROLE_COLORS` map (move from CogniTopBar's `ROLE_BADGES`): role code → `{label, bg, color}`
- `ROLE_PRIMARY_ACTION` map: role code → `{label, icon, route}` (e.g., CU → "Open Curation Queue" → `/cogni/curation`)
- `ROLE_NAV_RELEVANCE` map: role code → array of relevant nav paths (e.g., CU → `['/cogni/curation']`, CR → `['/cogni/challenges/new', '/cogni/my-challenges']`)
- `getPrimaryRole(codes: Set<string>): string` helper (move from ActionItemsWidget)
- `CogniRoleContextType` interface

### 2. `src/contexts/CogniRoleContext.tsx` — Provider + hook
- Wraps `useCogniUserRoles()` internally
- Computes:
  - `availableRoles: string[]` — sorted by ROLE_PRIORITY
  - `challengeRoleMap: Map<string, string[]>` — built from `UserChallengeRoleRow[]`
  - `isSoloMode: boolean` — 6+ roles
  - `activeRole: string` — current workspace focus
- On mount: read `localStorage('cogni_active_role')`, validate against `availableRoles`, fallback to `getPrimaryRole()`
- `setActiveRole(code)`: validates code is in `availableRoles`, writes to localStorage, updates state
- Add `storage` event listener for cross-tab sync (Gemini's suggestion)
- Export `useCogniRoleContext()` hook
- While roles are loading (`isLoading`), provide a `isRolesLoading` flag so consumers show skeletons instead of empty states

### 3. `src/components/cogniblend/shell/RoleSwitcher.tsx` — Top bar dropdown
- Compact pill showing active role badge (colored) + role name
- Click opens dropdown listing all `availableRoles` with colored badges and challenge counts per role
- Selected role gets checkmark
- Solo Mode indicator at top when `isSoloMode`
- If user has only 1 role: render as static badge (no dropdown)

## Files to Modify

### 4. `src/components/cogniblend/shell/CogniShell.tsx`
- Wrap the entire shell content with `<CogniRoleProvider>`

### 5. `src/components/cogniblend/shell/CogniTopBar.tsx`
- Remove local `ROLE_BADGES` constant (moved to `cogniRoles.ts`)
- Remove the role badges section from the avatar dropdown
- Add `<RoleSwitcher />` between page title and spacer
- Import `useCogniRoleContext` for the active role display

### 6. `src/components/cogniblend/shell/CogniSidebarNav.tsx`
- Import `useCogniRoleContext` and `ROLE_NAV_RELEVANCE`
- Keep existing `isVisible()` logic (role-gated hiding unchanged)
- Add `isRelevant(path)`: true if `activeRole`'s relevant paths include this item's path
- Style: relevant items get full opacity + left accent border; non-relevant visible items get `opacity-50` and no accent
- Remove the Solo Mode badge (moved to RoleSwitcher)
- Stop calling `useCogniUserRoles` directly — get data from context instead

### 7. `src/components/cogniblend/dashboard/ActionItemsWidget.tsx`
- Import `useCogniRoleContext` instead of `useCogniUserRoles`
- Remove local `ROLE_DISPLAY` and `getPrimaryRole` (use from `cogniRoles.ts`)
- Filter `actionItems` by `activeRole` using `challengeRoleMap`: only show challenges where user holds the active role
- Dynamic primary action button: use `ROLE_PRIMARY_ACTION[activeRole]` instead of hardcoded "Create Challenge"
- Add "See all tasks across roles" secondary link at bottom of filtered table (navigates or switches to a temporary unfiltered view)
- Role-specific empty state: "No items for your [Role Name] workspace. Switch roles or browse all tasks."
- Show skeleton while `isRolesLoading` is true (prevents flash of empty state)

### 8. `src/components/cogniblend/shell/CogniSidebar.tsx`
- No major changes — `CogniSidebarNav` handles the relevance styling internally

## Key Design Decisions

1. **Highlight, don't hide**: Non-active role items stay visible at `opacity-50`. Users can always click them without switching roles.
2. **No "ALL" default**: Login auto-selects primary role. Prevents the noisy merged view from being the norm.
3. **Cross-tab sync**: `storage` event listener updates `activeRole` when changed in another tab.
4. **Validation**: `setActiveRole` rejects codes not in `availableRoles` — security check.
5. **Loading states**: `isRolesLoading` flag prevents flash of "0 items" empty state while role data loads.
6. **Draft edge case**: Drafts created by the user always show regardless of active role filter, with a "Finish Draft" link — ensures nothing gets lost.

## No Database Changes Required
All data already available from `get_user_all_challenge_roles` RPC.

