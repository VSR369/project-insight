

# Refactoring Plan: Shared Utilities for Marketplace + Aggregator Role Management

## Analysis Summary

After auditing the codebase, I identified **5 categories of duplicated code** between the Marketplace (Platform Admin) and Aggregator (Seeking Org Admin) portals. Importantly, the two portals have **intentionally different workflows** (Marketplace assigns pool members to challenges; Aggregator assigns org users to role slots). The duplication is in **shared primitives and helpers**, not in the higher-level orchestration components.

---

## What Will NOT Change

The following are **correctly separate** and should remain so:
- `AssignRoleSheet` (org-level role assignment) vs `AssignMemberModal` (challenge-level pool member assignment) — different data models
- `RoleTable` (org role grid) vs `ChallengeAssignmentPanel` (challenge slot cards) — different UIs for different contexts
- `RoleReadinessWidget` vs `TeamCompletionBanner` — org readiness vs challenge team completeness
- `DeactivationCheckModal` vs `SupervisorDeactivationConfirmModal` — different governance rules

---

## Duplications to Extract

### 1. `getRoleLabel()` — duplicated in 6 files

**Current**: Each component defines its own `getRoleLabel(code)` that does `roleCodes?.find(r => r.code === code)?.display_name ?? code`.

**Fix**: Create a shared utility function + a hook.

```
New: src/lib/roleUtils.ts
  - getRoleLabel(roleCodes, code) → string
  - getRoleDisplayLabel(roleCodes, code) → "Display Name (CODE)"
```

**Files affected**: `AssignMemberModal`, `TeamCompletionBanner`, `DelegatedAdminReassignmentWizard`, `AggAvailabilityConfirmModal`, `PoolMemberDetailPage`, plus any future components.

### 2. `getInitials()` — duplicated in 4 files (excluding Pulse module)

**Current**: `RoleTable.tsx`, `AdminManagementPage.tsx`, `AssignRoleSheet.tsx` each define their own `getInitials()`. Meanwhile, `InitialsAvatar` already exists as a proper reusable component.

**Fix**: 
- Export `getInitials` from `InitialsAvatar.tsx` so it can be used standalone
- Replace inline `getInitials` + manual div rendering in `RoleTable` and `AssignRoleSheet` with `<InitialsAvatar>` component
- Replace in `AdminManagementPage` similarly

**Files affected**: `RoleTable.tsx`, `AssignRoleSheet.tsx`, `AdminManagementPage.tsx`

### 3. Enroll Mode Toggle UI — duplicated between `AssignRoleSheet` and `MsmeQuickAssignModal`

**Current**: Both render an identical "Assignment Mode" toggle (Direct/Invite) with the same icon layout, description text, and state management pattern (~30 lines each).

**Fix**: Extract into a shared component.

```
New: src/components/rbac/shared/EnrollModeToggle.tsx
  Props: mode, onModeChange
  Renders: the toggle UI + description text
```

**Files affected**: `AssignRoleSheet.tsx`, `MsmeQuickAssignModal.tsx`

### 4. Existing Member Deduplication Logic — duplicated between `AssignRoleSheet` and `MsmeQuickAssignModal`

**Current**: Both build a `Map<email, { name, roles[] }>` from assignments, filtering by `active`/`invited` status. Nearly identical logic (~15 lines each).

**Fix**: Extract into a shared utility.

```
New addition to: src/lib/roleUtils.ts
  - deduplicateMembers(assignments) → { email, name, roles[] }[]
```

**Files affected**: `AssignRoleSheet.tsx`, `MsmeQuickAssignModal.tsx`

### 5. `RoleBadge` — Marketplace-only color map, but pattern is reusable

**Current**: `RoleBadge.tsx` has hardcoded colors only for MP roles (R3, R5_MP, R6_MP, R7_MP). AGG roles fall back to gray.

**Fix**: Extend `ROLE_COLOR_MAP` to include AGG role codes (R4, R5_AGG, R6_AGG, R7_AGG) and core roles (R2, R8, R9), making it truly universal.

**Files affected**: `RoleBadge.tsx` only

---

## File Changes

| File | Action |
|------|--------|
| `src/lib/roleUtils.ts` | **Create** — `getRoleLabel`, `getRoleDisplayLabel`, `deduplicateMembers` |
| `src/components/rbac/shared/EnrollModeToggle.tsx` | **Create** — reusable Direct/Invite toggle |
| `src/components/admin/platform-admins/InitialsAvatar.tsx` | **Edit** — export `getInitials` function |
| `src/components/admin/marketplace/RoleBadge.tsx` | **Edit** — add AGG + Core role colors |
| `src/components/rbac/roles/RoleTable.tsx` | **Edit** — use `InitialsAvatar`, remove inline `getInitials` |
| `src/components/rbac/roles/AssignRoleSheet.tsx` | **Edit** — use `EnrollModeToggle`, `deduplicateMembers`, `InitialsAvatar` |
| `src/components/rbac/MsmeQuickAssignModal.tsx` | **Edit** — use `EnrollModeToggle`, `deduplicateMembers` |
| `src/components/admin/marketplace/AssignMemberModal.tsx` | **Edit** — use `getRoleDisplayLabel` |
| `src/components/admin/marketplace/TeamCompletionBanner.tsx` | **Edit** — use `getRoleLabel` |
| `src/components/rbac/DelegatedAdminReassignmentWizard.tsx` | **Edit** — use `getRoleLabel` |
| `src/components/rbac/AggAvailabilityConfirmModal.tsx` | **Edit** — use `getRoleLabel` |
| `src/pages/admin/marketplace/PoolMemberDetailPage.tsx` | **Edit** — use `getRoleLabel` |
| `src/pages/org/AdminManagementPage.tsx` | **Edit** — use `InitialsAvatar` |

## Risk Mitigation

- All changes are **pure refactors** — extracting existing inline code into shared modules
- No behavioral changes, no new features, no DB changes
- Each component retains its existing props/API — only internal implementation changes
- The `EnrollModeToggle` is a presentational component with no business logic — safe to share

