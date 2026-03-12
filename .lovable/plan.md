

# Plan: Fix SO Admin Role Management — Aggregator-Only Model Enforcement

## Problems Identified

### 1. Empty screen on Invite click
`RoleManagementDashboard` never reads the `?assign=` query parameter. When navigating from RoleReadiness via `/org/role-management?assign=R4`, the `AssignRoleSheet` stays closed. Additionally, `AggRoleManagement` has its own duplicate `AssignRoleSheet` that conflicts with the parent's sheet.

### 2. Model confusion: SO Admin sees Marketplace content
The SO Admin portal incorrectly mixes Marketplace and Aggregator contexts:
- `RoleManagementDashboard` passes `model="mp"` to `RoleReadinessWidget` (line 84) — should be `"agg"`
- Dashboard shows **Core + Aggregator tabs** but Core roles (R2, R8, R9) apply to both models and should still be managed by SO Admin
- `OrgEmailTemplatesPage` shows Marketplace roles instead of Aggregator roles
- `RoleReadinessPage` shows both MP and AGG panels side-by-side — SO Admin should only see AGG + Core
- `PrimaryAdminDashboard` computes challenge roles generically without filtering to AGG model

### 3. AssignRoleSheet has no role selector dropdown
When `preSelectedRoleCode` is undefined (e.g. clicking "Assign Role" button without context), the sheet has no way to pick a role.

## Business Rules (from memories)

| Rule | Description |
|------|-------------|
| BR-CORE-004 | Platform Admin → Marketplace only. SO Admin → Aggregator + Core only |
| BR-AGG-001 | SO Admin creates AGG roles (R4, R5_AGG, R6_AGG, R7_AGG) as organizational resource pool |
| BR-CORE-003 | Platform Admin has delegated authority for Core roles (R2, R8, R9) on behalf of orgs |
| System roles | Core: R2, R8, R9. AGG challenge: R4, R5_AGG, R6_AGG, R7_AGG. MP challenge: R3, R5_MP, R6_MP, R7_MP |

SO Admin manages: Core roles (R2, R8, R9) + Aggregator roles (R4, R5_AGG, R6_AGG, R7_AGG).
Platform Admin manages: Core roles (delegated) + Marketplace roles (R3, R5_MP, R6_MP, R7_MP).

## Implementation Steps

### Step 1: Fix `RoleManagementDashboard` — read `?assign=` param + fix model
- Add `useSearchParams` to read `assign` param on mount and auto-open `AssignRoleSheet`
- Change `RoleReadinessWidget` model from `"mp"` to `"agg"` (line 84)
- Update page description to reference Aggregator model explicitly

### Step 2: Remove duplicate `AssignRoleSheet` from `AggRoleManagement`
- Remove the internal `assignSheetOpen` state, `assignRoleCode` state, and `<AssignRoleSheet>` render from `AggRoleManagement.tsx`
- The `onInvite` callback already exists on `RoleTable` — make `AggRoleManagement` accept an `onInvite` prop and bubble it to parent
- Parent `RoleManagementDashboard` handles all sheet opens via a single `AssignRoleSheet` instance

### Step 3: Add role selector dropdown to `AssignRoleSheet`
- When `preSelectedRoleCode` is undefined, render a `<Select>` dropdown populated from `availableRoles` so the user can pick a role
- Update `selectedRole` derivation to also check the form's current `role_code` value (not just `preSelectedRoleCode`)

### Step 4: Fix `RoleReadinessPage` — Aggregator only
- Remove the MP panel; show only AGG + Core readiness (single panel with `model="agg"`)
- Update heading to "Aggregator Role Readiness Status"

### Step 5: Fix `OrgEmailTemplatesPage` — Aggregator context
- Replace `mpRoles` filter with AGG roles (`model_applicability === 'agg'`)
- Replace `mpModel` lookup with aggregator model
- Update template subject lines and labels to reference Aggregator model

### Step 6: Fix `PrimaryAdminDashboard` — Aggregator-scoped stats
- Filter `challengeRoles` to only AGG model roles (not all challenge roles)
- Update "Challenge Roles" card label to "Aggregator Roles"
- Update Role Management console card description to "Assign and manage core & aggregator roles"

### Step 7: Wire `RoleReadinessWidget` "View full readiness details" button
- Add `useNavigate` and wire the button (line 118) to navigate to `/org/role-readiness`
- Change model from `"mp"` to `"agg"` where used by SO Admin context

## Files Modified
- `src/pages/rbac/RoleManagementDashboard.tsx` — Steps 1, 2
- `src/components/rbac/AggRoleManagement.tsx` — Step 2
- `src/components/rbac/roles/AssignRoleSheet.tsx` — Step 3
- `src/pages/org/RoleReadinessPage.tsx` — Step 4
- `src/pages/org/OrgEmailTemplatesPage.tsx` — Step 5
- `src/components/org/dashboard/PrimaryAdminDashboard.tsx` — Step 6
- `src/components/rbac/RoleReadinessWidget.tsx` — Step 7

