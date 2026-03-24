

# Final Plan: `useCogniPermissions` Hook + Multi-Role Navigation Fix

## What Changes

7 files total (1 new, 6 modified). Zero DB changes.

---

### File 1 (NEW): `src/hooks/cogniblend/useCogniPermissions.ts`

Centralized permission resolver. Exports both the hook and the return type.

```typescript
import { useCogniRoleContext } from '@/contexts/CogniRoleContext';

export function useCogniPermissions() {
  const { activeRole, availableRoles } = useCogniRoleContext();
  // Focused mode: single role. Merged mode: all roles.
  const effectiveRoles = activeRole ? [activeRole] : availableRoles;
  const has = (codes: string[]) => codes.some(c => effectiveRoles.includes(c));

  return {
    canCreateChallenge:   has(['CA', 'CR']),
    canSubmitRequest:     has(['AM', 'RQ']),
    canEditSpec:          has(['CA', 'CR']),
    canCurate:            has(['CU']),
    canApprove:           has(['ID']),
    canReviewEvaluation:  has(['ER']),
    canReviewLegal:       has(['LC']),
    canManageEscrow:      has(['FC']),
    isSpecRole:           has(['CA', 'CR']),
    isBusinessOwner:      has(['AM', 'RQ']),
    hasConflictingIntent: has(['AM', 'RQ']) && has(['CA', 'CR']),
  };
}

export type CogniPermissions = ReturnType<typeof useCogniPermissions>;
```

---

### File 2: `src/components/cogniblend/shell/CogniSidebarNav.tsx`

- Remove `requiredRoles` from `NavItem` interface -- replace with `isVisible: (perms: CogniPermissions) => boolean`
- Import and call `useCogniPermissions()`, pass result to each item's `isVisible`
- Remove `allRoleCodes` derivation and old `isVisible` function
- Keep `ROLE_NAV_RELEVANCE` dimming logic unchanged (opacity, not visibility)

Nav item visibility mapping:

| Item | `isVisible` |
|---|---|
| New Challenge | `p => p.canCreateChallenge \|\| p.canSubmitRequest` |
| My Challenges | `p => p.canEditSpec` |
| Curation Queue | `p => p.canCurate` |
| Approval Queue | `p => p.canApprove` |
| Legal Workspace | `p => p.canReviewLegal` |
| Legal Review | `p => p.canReviewLegal` |
| Review Queue | `p => p.canReviewEvaluation` |
| Evaluation Panel | `p => p.canReviewEvaluation \|\| p.canApprove` |
| Selection & IP | `p => p.canApprove` |
| Escrow Management | `p => p.canManageEscrow` |
| Payment Processing | `p => p.canManageEscrow` |
| Browse/Solutions/Portfolio | `() => true` |

---

### File 3: `src/pages/cogniblend/CogniDashboardPage.tsx`

Replace:
- `activeRole === 'AM' || activeRole === 'RQ' || !activeRole` with `isBusinessOwner` from hook
- `activeRole === 'CA' || activeRole === 'CR'` with `isSpecRole` from hook

Bug fix: CA-only user no longer incorrectly sees business owner sections (the old `!activeRole` fallback is removed).

---

### File 4: `src/components/cogniblend/dashboard/MyRequestsTracker.tsx`

Replace:
- `activeRole === 'CA' || activeRole === 'CR'` with `isSpecRole`
- `activeRole === 'AM' || activeRole === 'RQ' || !activeRole` with `isBusinessOwner`

---

### File 5: `src/pages/cogniblend/AMRequestViewPage.tsx`

Replace:
- `activeRole === 'AM' || activeRole === 'RQ'` with `isBusinessOwner`
- `activeRole === 'CA' || activeRole === 'CR'` with `isSpecRole`

---

### File 6: `src/components/cogniblend/dashboard/MyActionItemsSection.tsx`

Replace:
- `activeRole === 'CA' || activeRole === 'CR'` with `isSpecRole`

---

### File 7: `src/pages/cogniblend/ChallengeWizardPage.tsx`

Replace:
- `activeRole === 'CU'` with `canCurate`

---

## What Does NOT Change

- `CogniRoleContext` and `RoleSwitcher` -- unchanged
- `can_perform()` SQL function -- unchanged
- Phase-based edit locking logic -- unchanged
- `ROLE_NAV_RELEVANCE` dimming -- stays as opacity control
- No DB changes

## Bug Fixes Included

| Bug | Fix |
|---|---|
| `!activeRole` fallback showing business owner content to non-AM/RQ users | `isBusinessOwner` requires actual AM/RQ roles |
| "New Challenge" compound permission can't fit single string key | `isVisible` is a function |
| Dual source of truth (`requiredRoles` array + hook) | `requiredRoles` removed entirely |
| `CogniPermissions` type not exported | Added `export type` |

