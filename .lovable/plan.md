

## Remove Convergence-Era Terminology and Fix Architectural Debt

Four layers of changes, ordered by risk.

---

### Layer A — Rename "convergence" to "co-assignment" (cosmetic, zero risk)

| File | Change |
|------|--------|
| `src/lib/convergenceUtils.ts` | Rename file to `src/lib/roleConflictUtils.ts`, update JSDoc |
| `src/components/admin/governance/RoleConvergenceMatrix.tsx` | Update import path from `convergenceUtils` to `roleConflictUtils`, rename interface `RoleConvergenceMatrixProps` → `RoleConflictMatrixProps`, rename component export to `RoleConflictMatrix` |
| `src/pages/admin/seeker-config/RoleConvergencePage.tsx` | Update import to `RoleConflictMatrix`, rename page title to "Role Co-assignment Rules", update description |
| `src/components/admin/AdminSidebar.tsx` line 121 | Change label from `'Role Convergence'` to `'Role Co-assignment Rules'` |
| `src/App.tsx` line 775 | Add new route `seeker-config/role-coassignment` pointing to the same page. Keep old route as redirect via `Navigate` to avoid broken bookmarks |
| `src/App.tsx` line 164 | Rename lazy import variable from `RoleConvergencePage` to `RoleCoassignmentPage` |

---

### Layer B — Rename `govAware`/`nonQuickRoleCodes` to semantic names (zero behavior change)

| File | Change |
|------|--------|
| `src/hooks/cogniblend/useCogniUserRoles.ts` | Rename `nonQuickRoleCodes` → `humanAssignedRoleCodes`, `hasNonQuickChallenges` → `hasHumanAssignedRoles`. Update JSDoc to explain the concept: "roles from challenges where a human actor was assigned, not auto-completed system artifacts" |
| `src/hooks/cogniblend/useCogniPermissions.ts` | Rename `govAware` → `requiresHumanActor`. Update destructured imports to use new names. Update all references: `hasNonQuickChallenges` → `hasHumanAssignedRoles`, `nonQuickRoleCodes` → `humanAssignedRoleCodes` |

Logic stays identical — only variable/function names change.

---

### Layer C — Fix self-exclusion in `tryOrgFallback` (Layer D from analysis)

**File: `src/hooks/cogniblend/useAutoAssignChallengeRoles.ts`**

After the initial filter on line 240-242, add fallback for single-user orgs:

```typescript
let eligibleUsers = (orgUsers ?? []).filter(
  (u) => u.user_id && u.user_id !== input.assignedBy,
);
// Single-user org fallback: STRUCTURED/CONTROLLED require a human Curator
if (eligibleUsers.length === 0 && requiresCurator(governanceMode)) {
  eligibleUsers = (orgUsers ?? []).filter((u) => u.user_id === input.assignedBy);
}
if (eligibleUsers.length === 0) return null;
```

Add helper after imports:
```typescript
function requiresCurator(mode: string): boolean {
  return mode === 'STRUCTURED' || mode === 'CONTROLLED';
}
```

---

### Layer D — Add missing cache invalidations after submit

**File: `src/hooks/cogniblend/useChallengeSubmit.ts`** — `useChallengeSubmit.onSuccess` (line 257-261)

Add three invalidations:
```typescript
queryClient.invalidateQueries({ queryKey: ['cogni_user_roles'] });
queryClient.invalidateQueries({ queryKey: ['curation-queue'] });
queryClient.invalidateQueries({ queryKey: ['challenge-roles'] });
```

---

### What is NOT changed

- **Filter logic preserved**: `requiresHumanActor` (renamed from `govAware`) keeps the exact same behavior — QUICK system-artifact roles still hidden from nav
- **Admin tool preserved**: `RoleConflictMatrix` (renamed from `RoleConvergenceMatrix`) still manages `role_conflict_rules` table
- **No DB migration needed**: All changes are frontend-only renames and two logic fixes
- **Upstream RPC fix** (ensuring QUICK auto-complete phases don't create `user_challenge_roles` entries): Flagged for future DB work, not in this batch

### Files touched (7 total)

1. `src/lib/convergenceUtils.ts` → renamed to `src/lib/roleConflictUtils.ts`
2. `src/components/admin/governance/RoleConvergenceMatrix.tsx`
3. `src/pages/admin/seeker-config/RoleConvergencePage.tsx`
4. `src/components/admin/AdminSidebar.tsx`
5. `src/App.tsx`
6. `src/hooks/cogniblend/useCogniUserRoles.ts`
7. `src/hooks/cogniblend/useCogniPermissions.ts`
8. `src/hooks/cogniblend/useAutoAssignChallengeRoles.ts`
9. `src/hooks/cogniblend/useChallengeSubmit.ts`

