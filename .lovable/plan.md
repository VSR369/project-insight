

# Fix: Hide "My Solutions" and "My Portfolio" from Creator Role

## Problem

In `CogniSidebarNav.tsx`, the SOLVER section items all have `isVisible: () => true`, meaning they show for every user regardless of role. The section-level `isSectionVisible` check hides the entire SOLVER section only when the user holds exclusively seeking-org roles (`CR, CU, ER, LC, FC`). However, "My Solutions" and "My Portfolio" are solver-only features that should never appear for Creator-role users — they are irrelevant to the challenge creation workflow.

## Fix

**File: `src/components/cogniblend/shell/CogniSidebarNav.tsx`**

Change the SOLVER section items so that "My Solutions" and "My Portfolio" are hidden when `isSeekingOrgOnly` is true. Since `isVisible` receives `CogniPermissions` (not the org-only flag), the cleanest approach is:

1. Add a new permission flag `canSeeSolverFeatures` to `useCogniPermissions` that returns `false` when the user holds only seeking-org roles (CR/CU/ER/LC/FC). This keeps the logic centralized in the permission hook.

2. Update the two nav items to use this flag:
   - `My Solutions` → `isVisible: (p) => p.canSeeSolverFeatures`
   - `My Portfolio` → `isVisible: (p) => p.canSeeSolverFeatures`
   - `Browse Challenges` stays `isVisible: () => true` (discovery is open)

**File: `src/hooks/cogniblend/useCogniPermissions.ts`**

Add `canSeeSolverFeatures` flag that checks if the user has any role outside the seeking-org set. This is derived from `availableRoles` — if all roles are in `{CR, CU, ER, LC, FC}`, return `false`.

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/cogniblend/useCogniPermissions.ts` | Add `canSeeSolverFeatures` boolean flag |
| `src/components/cogniblend/shell/CogniSidebarNav.tsx` | Update "My Solutions" and "My Portfolio" `isVisible` to use the new flag |

## Impact
- Creator-only users will no longer see "My Solutions" or "My Portfolio" in the sidebar
- Users who also hold solver roles will still see them
- No routing changes needed — the sidebar already gates access

