

# Fix: Correct Role Master Data and Context-Aware Filtering

## Problem Summary

**1. Wrong display names in `md_slm_role_codes` table:**

| Code | Current (WRONG) | BRD Correct Name |
|------|-----------------|------------------|
| R2 | Seeking Org Admin | Account Manager |
| R8 | Finance Controller | Finance Coordinator |
| R9 | Compliance Officer | Legal Coordinator |
| R4 | Aggregator Lead | Challenge Creator |

**2. Wrong `min_required` values:**
- R7_MP and R7_AGG have `min_required = 1` but BRD says **min 2 per abstract**

**3. Dashboard shows wrong role grouping for Platform Admin context:**
- Current "Core Roles" tab shows R2, R8, R9 (these are SOA-managed org roles, not PA's core work)
- PA's primary roles for Marketplace are the SLM resource pool: R3, R5_MP, R6_MP, R7_MP
- PA can also manage R2, R8, R9 on behalf of orgs (BR-CORE-003), but these should be a secondary tab

**4. All role data must come from `md_slm_role_codes` master data — no hardcoding.**

---

## Changes

### 1. SQL: Fix master data in `md_slm_role_codes`

```sql
UPDATE md_slm_role_codes SET display_name = 'Account Manager', description = 'Primary point of contact for the seeking organization' WHERE code = 'R2';
UPDATE md_slm_role_codes SET display_name = 'Finance Coordinator', description = 'Manages financial governance and billing approvals' WHERE code = 'R8';
UPDATE md_slm_role_codes SET display_name = 'Legal Coordinator', description = 'Ensures legal and regulatory compliance' WHERE code = 'R9';
UPDATE md_slm_role_codes SET display_name = 'Challenge Creator', description = 'Creates and initiates challenges in aggregator model' WHERE code = 'R4';
UPDATE md_slm_role_codes SET min_required = 2 WHERE code IN ('R7_MP', 'R7_AGG');
```

### 2. `src/hooks/queries/useSlmRoleCodes.ts` — Add PA-context hooks

Add two new hooks that the Platform Admin dashboard uses:

- **`useSlmPoolRoles()`** — Returns SLM resource pool roles for Marketplace (is_core=false, model=mp): R3, R5_MP, R6_MP, R7_MP. These are the PA's "core" work.
- **`useOrgCoreRoles()`** — Returns org-level core roles (is_core=true): R2, R8, R9. PA can manage these on behalf of orgs per BR-CORE-003.
- **`useAggChallengeRoles()`** — Returns AGG challenge roles (is_core=false, model=agg): R4, R5_AGG, R6_AGG, R7_AGG. For SOA context only.

All hooks derive from the same cached `useSlmRoleCodes()` query — no new DB calls.

### 3. `src/pages/rbac/RoleManagementDashboard.tsx` — Fix tab structure

Since this page is at `/admin/marketplace/roles` (Platform Admin portal):

- **Tab 1: "SLM Roles (Marketplace)"** → uses `useSlmPoolRoles()` → R3, R5_MP, R6_MP, R7_MP
- **Tab 2: "Org Core Roles"** → uses `useOrgCoreRoles()` → R2 (Account Manager), R8 (Finance Coordinator), R9 (Legal Coordinator)
- Tab labels and role names all come from master data, not hardcoded strings

### 4. No other files need changes

- `RoleTable.tsx` — receives roles as props, already dynamic
- `RoleReadinessWidget.tsx` — resolves names from `useSlmRoleCodes()`, will pick up corrected names automatically
- `MsmeQuickAssignModal.tsx` — uses `useSlmRoleCodes()`, will pick up corrected names
- `PoolMemberTable/Form/FilterBar` — use `useSlmRoleCodes()` for SLM roles, unaffected
- `RoleBadge.tsx` — label passed from parent, no hardcoding

