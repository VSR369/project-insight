

# Add Challenge Requestor Role (R10_CR) — Configurable Core Role for Aggregator Model

## Requirement Summary

A new role **Challenge Requestor** allows department-level users within a Seeking Org to submit solution requests (similar to Account Manager in the MP model). The **Challenge Creator (R4)** reviews and accepts/denies these requests. If accepted, R4 expands the request into a full challenge.

Key properties:
- **Configurable per org** — a toggle determines whether Challenge Requestor is required
- **Department-aware** — each assignment must capture which department/functional area the requestor belongs to
- **Core role under Aggregator model** — appears in the Core Roles tab alongside R2, R8, R9
- **Non-breaking** — additive change; no existing functionality altered

---

## Impact Analysis

| Area | Impact | Risk |
|------|--------|------|
| `md_slm_role_codes` table | Insert new row (R10_CR) | None — additive insert |
| `role_assignments` table | Add `department_id` column | Low — nullable column, existing rows unaffected |
| `md_rbac_msme_config` / new org config | Add `challenge_requestor_enabled` toggle | Low — new column or new config row |
| `useSlmRoleCodes` hook | No change needed — already reads all active roles | None |
| `useCoreRoleCodes` filter | R10_CR has `is_core=true`, auto-included | None |
| `RoleTable` component | Add department badge display for R10_CR assignments | Low |
| `AssignRoleSheet` | Add department dropdown when assigning R10_CR | Low |
| `RoleReadinessWidget` / edge function | Auto-included if `is_core=true` and `min_required >= 1` | None — configurable via toggle |
| `MsmeQuickAssignModal` | Auto-included (reads core + agg roles) | None |
| Email templates | Existing ROLE_INVITATION / ROLE_ENROLLMENT_CONFIRMATION work as-is | None |

**Zero breaking changes** — all existing roles, assignments, queries, and UI continue unchanged.

---

## Implementation Plan

### Phase 1: Database Changes (1 migration)

**1a. Insert R10_CR into `md_slm_role_codes`**
```sql
INSERT INTO md_slm_role_codes (code, display_name, description, display_order, is_active, model_applicability, is_core, min_required)
VALUES ('R10_CR', 'Challenge Requestor', 'Submits solution requests from within the organization on behalf of a department', 4, true, 'agg', true, 0);
```
- `min_required: 0` because it is optional (toggle-controlled)
- `is_core: true` so it appears in Core Roles tab
- `model_applicability: 'agg'` — Aggregator only

**1b. Add `department_id` to `role_assignments`**
```sql
ALTER TABLE role_assignments
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES md_departments(id);
CREATE INDEX IF NOT EXISTS idx_role_assignments_department ON role_assignments(department_id);
```
Nullable — only populated for R10_CR assignments. All existing rows remain valid.

**1c. Add org-level toggle for Challenge Requestor**

Add a column to `md_rbac_msme_config` (it already stores org-level RBAC config):
```sql
ALTER TABLE md_rbac_msme_config
  ADD COLUMN IF NOT EXISTS challenge_requestor_enabled BOOLEAN NOT NULL DEFAULT false;
```
Alternatively, if we want a cleaner separation, create a new `org_feature_flags` table. But reusing `md_rbac_msme_config` is simpler and consistent with how MSME toggle works.

### Phase 2: Config Hook (1 file)

**Update `useMsmeConfig.ts`**
- Add `challenge_requestor_enabled` to the `MsmeConfig` interface and select query
- Add a new mutation `useToggleChallengeRequestor` that upserts the flag
- Pattern identical to existing `useToggleMsmeConfig`

### Phase 3: Toggle UI (1 new component)

**Create `ChallengeRequestorToggle.tsx`**
- Identical pattern to `MsmeToggle.tsx` — a Card with Switch, badge (Active/Off), description
- Placed in `RoleManagementDashboard` below the MSME toggle
- When enabled: R10_CR appears in RoleTable (it's already in `md_slm_role_codes` with `is_core=true`)
- When disabled: filter R10_CR out of the Core Roles display using the toggle state

### Phase 4: Department Selection in Assignment (2 files)

**Update `AssignRoleSheet.tsx`**
- When `preSelectedRoleCode === 'R10_CR'`, show a required Department dropdown (fetched from `md_departments`)
- Pass `department_id` through to the `CreateRoleAssignmentInput`

**Update `useRoleAssignments.ts`**
- Add `department_id?: string` to `CreateRoleAssignmentInput` interface
- Include it in the insert payload (already flexible — just add the field)

### Phase 5: Department Display in RoleTable (1 file)

**Update `RoleTable.tsx`**
- For R10_CR assignments, show a small department badge next to the user name
- Requires joining or looking up department name — can use a lightweight `useDepartments()` call (already exists in `usePrimaryContactData.ts`)

### Phase 6: Dashboard Integration

**Update `RoleManagementDashboard.tsx`**
- Import and render `ChallengeRequestorToggle` between MSME toggle and Role Tabs
- Pass the toggle state down to filter R10_CR from `orgCoreRoles` when disabled
- When enabled, R10_CR naturally appears in the Core Roles tab via `useCoreRoleCodes()`

---

## File Change Summary

| File | Change Type | Description |
|------|------------|-------------|
| New migration SQL | Create | Seed R10_CR, add `department_id` column, add toggle column |
| `src/hooks/queries/useMsmeConfig.ts` | Edit | Add `challenge_requestor_enabled` field + toggle mutation |
| `src/components/rbac/ChallengeRequestorToggle.tsx` | Create | Toggle card component (mirrors MsmeToggle) |
| `src/components/rbac/roles/AssignRoleSheet.tsx` | Edit | Add department dropdown for R10_CR |
| `src/hooks/queries/useRoleAssignments.ts` | Edit | Add `department_id` to input interface |
| `src/components/rbac/roles/RoleTable.tsx` | Edit | Show department badge for R10_CR assignments |
| `src/pages/rbac/RoleManagementDashboard.tsx` | Edit | Add toggle + conditional R10_CR filtering |

**No existing component, hook, edge function, or database trigger is modified in a breaking way.** All changes are additive.

