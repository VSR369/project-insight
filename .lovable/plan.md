

# Revised Plan: Role Management Dashboard & RBAC (Screenshots Scope) — No Hardcoded Values

## Key Revision: Master Data First

The previous plan hardcoded role codes like `z.enum(["R2","R8","R9"])` and `z.enum(["R4","R5_AGG","R6_AGG","R7_AGG"])`. The current `md_slm_role_codes` table only has 4 MP roles (R3, R5_MP, R6_MP, R7_MP). Core roles (R2, R8, R9) and AGG roles (R4, R5_AGG, R6_AGG, R7_AGG) don't exist yet.

**All role codes, labels, status options, and model types must come from DB master data tables — zero hardcoded enums in frontend code.**

---

## Phase 1: Database Schema Changes

### 1a. Extend `md_slm_role_codes` with new columns + seed missing roles

Add columns:
- `model_applicability TEXT NOT NULL DEFAULT 'both'` — values: `mp`, `agg`, `both`
- `is_core BOOLEAN NOT NULL DEFAULT false` — distinguishes core (R2/R8/R9) from challenge roles
- `min_required INTEGER NOT NULL DEFAULT 1` — minimum assignments needed for readiness

Insert new role codes (R2, R8, R9 as core; R4, R5_AGG, R6_AGG, R7_AGG as AGG challenge roles). Update existing MP roles with `model_applicability = 'mp'`, `is_core = false`.

### 1b. Create `md_role_assignment_statuses` master data table

```
id, code, display_name, color_class, display_order, is_active
```
Seed: `invited`, `active`, `inactive`, `suspended`, `expired`

### 1c. Create `role_assignments` table (org-scoped, NOT per-challenge)

```
id UUID PK, org_id UUID NOT NULL, role_code TEXT NOT NULL,
user_email TEXT NOT NULL, user_name TEXT,
user_id UUID (nullable — filled on acceptance),
status TEXT NOT NULL DEFAULT 'invited',
domain_tags JSONB DEFAULT '{}',
model_applicability TEXT NOT NULL DEFAULT 'both',
invited_at TIMESTAMPTZ DEFAULT NOW(),
activated_at TIMESTAMPTZ, expires_at TIMESTAMPTZ,
created_by UUID, created_at TIMESTAMPTZ DEFAULT NOW(),
updated_by UUID, updated_at TIMESTAMPTZ
```

Indexes: `(org_id, role_code, status)`, unique partial on `(org_id, role_code, user_email) WHERE status IN ('invited','active')`.

RLS: Authenticated users can read own org rows. Insert/update scoped by org membership.

### 1d. Create `role_readiness_cache` table

```
id UUID PK, org_id UUID NOT NULL, engagement_model TEXT NOT NULL,
overall_status TEXT NOT NULL DEFAULT 'not_ready',
missing_roles TEXT[] DEFAULT '{}',
total_required INT DEFAULT 0, total_filled INT DEFAULT 0,
responsible_admin_contact JSONB DEFAULT '{}',
last_computed_at TIMESTAMPTZ DEFAULT NOW(),
created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ
```

Unique on `(org_id, engagement_model)`. RLS: Authenticated read, service_role write.

### 1e. Create `rbac_admin_contact` table

```
id UUID PK, name TEXT NOT NULL, email TEXT NOT NULL,
phone_intl TEXT, updated_at TIMESTAMPTZ, updated_by UUID
```

### 1f. Create `md_rbac_msme_config` table

```
org_id UUID PK, is_enabled BOOLEAN DEFAULT false,
enabled_by UUID, enabled_at TIMESTAMPTZ
```

### 1g. Add `org_id` column to `role_audit_log`

```
ALTER TABLE role_audit_log ADD COLUMN org_id UUID;
```

### 1h. DB trigger: Recompute `role_readiness_cache` on `role_assignments` changes

A trigger function that counts active assignments per org per model against required roles from `md_slm_role_codes`, upserts readiness cache.

---

## Phase 2: Hooks & Data Layer (All Master-Data-Driven)

### 2a. Extend `useSlmRoleCodes` hook

Add `model_applicability`, `is_core`, `min_required` to the select. Add derived filter helpers:
- `useCoreRoleCodes()` — filters `is_core = true`
- `useChallengeRoleCodes(model)` — filters by `model_applicability` matching `model` or `both`, and `is_core = false`

### 2b. New `useRoleAssignmentStatuses` hook

Fetches from `md_role_assignment_statuses`. Used for status badges (color from DB).

### 2c. New `useRoleAssignments(orgId)` hook

Fetches `role_assignments` for an org. Joins with `md_slm_role_codes` via role_code for display names. Query key: `['role-assignments', orgId]`.

### 2d. New mutations

- `useCreateRoleAssignment()` — inserts into `role_assignments` with `withCreatedBy()`
- `useDeactivateRoleAssignment()` — sets status to 'inactive', blocked if last active for core role (client-side check + DB constraint)
- `useMsmeQuickAssign()` — bulk inserts multiple role assignments for one user

### 2e. New `useRoleReadiness(orgId, model)` hook

Reads from `role_readiness_cache`. staleTime: 0 (always current).

### 2f. New `useAdminContact()` hook

CRUD for `rbac_admin_contact`.

### 2g. New `useMsmeConfig(orgId)` hook

Read/toggle `md_rbac_msme_config`.

### 2h. New `useEngagementModels()` hook

Fetches from existing `md_engagement_models` table (already has `marketplace`/`aggregator`). Used in role readiness widget model selector.

---

## Phase 3: Frontend Components

### 3a. `RoleManagementDashboard` page (`/org/role-management`)

- **RoleReadinessWidget**: Progress ring showing `total_filled/total_required`. Status from `role_readiness_cache`. Missing role names resolved via `useSlmRoleCodes()` (not hardcoded). Contact card from `rbac_admin_contact`.
- **Two tabs**: "Core Roles" / "Challenge Roles" — tab labels from UI, but role list inside each tab is entirely from `md_slm_role_codes` filtered by `is_core`.
- **CoreRoleRow**: Renders one row per core role code from DB. Shows: display_name (from DB), code (from DB), assigned users (from `role_assignments`), status badge (color from `md_role_assignment_statuses`), Invite/Deactivate actions.
- **ChallengeRoleRow**: Same pattern for AGG roles.
- **MsmeToggle**: Switch + "Quick Assign All" button.

### 3b. `AssignRoleModal` (SCR-09)

Two tabs: "New User (Invite)" and "Existing Team Member".
- Role selector populated from `md_slm_role_codes` (filtered by core/challenge context) — no hardcoded enum.
- Domain tags: cascading selectors from existing taxonomy hooks (`useIndustrySegments`, `useProficiencyAreasLookup`, etc.).
- Zod schema validates dynamically — `role_codes` validated against fetched master data, not a static enum.

### 3c. `MsmeQuickAssignModal`

Three tabs: Myself / New User / Existing Member. Role checkboxes generated from `md_slm_role_codes` where `is_core = true` + challenge roles for selected model. "Already filled" badges from `useRoleAssignments`.

### 3d. `AdminContactProfilePage` (`/admin/marketplace/admin-contact`)

Simple form: name, email, phone. Info banner about Role Readiness API exposure. Uses `useAdminContact()`.

### 3e. `EmailTemplatesPage` (`/admin/marketplace/email-templates`)

Two tab previews: NOT_READY (orange header) and READY (teal header). Static HTML previews with placeholder variables — no hardcoded role names, uses `{missing_roles}` template syntax.

### 3f. Status badge component

`RoleAssignmentStatusBadge` — reads color_class from `md_role_assignment_statuses` master data, not hardcoded color map.

---

## Phase 4: Route Wiring

- Add lazy imports in `App.tsx`:
  - `/org/role-management` → `RoleManagementDashboard` (inside OrgShell)
  - `/admin/marketplace/admin-contact` → `AdminContactProfilePage` (TierGuard senior_admin+)
  - `/admin/marketplace/email-templates` → `EmailTemplatesPage` (TierGuard senior_admin+)
- Update `MarketplaceDashboard.tsx`: Remove `comingSoon: true` from Role Management card, update path.

---

## Files Summary

| File | Action |
|---|---|
| **DB Migration** | New tables + seed data + trigger |
| `src/hooks/queries/useSlmRoleCodes.ts` | Extend with new columns + add filter hooks |
| `src/hooks/queries/useRoleAssignmentStatuses.ts` | **New** — master data hook |
| `src/hooks/queries/useRoleAssignments.ts` | **New** — org role assignments CRUD |
| `src/hooks/queries/useRoleReadiness.ts` | **New** — readiness cache |
| `src/hooks/queries/useAdminContact.ts` | **New** — admin contact CRUD |
| `src/hooks/queries/useMsmeConfig.ts` | **New** — MSME toggle |
| `src/hooks/queries/useEngagementModels.ts` | **New** — fetches md_engagement_models |
| `src/components/rbac/RoleReadinessWidget.tsx` | **New** |
| `src/components/rbac/roles/CoreRoleRow.tsx` | **New** |
| `src/components/rbac/roles/ChallengeRoleRow.tsx` | **New** |
| `src/components/rbac/roles/AssignRoleModal.tsx` | **New** |
| `src/components/rbac/roles/RoleAssignmentStatusBadge.tsx` | **New** — DB-driven colors |
| `src/components/rbac/MsmeToggle.tsx` | **New** |
| `src/components/rbac/MsmeQuickAssignModal.tsx` | **New** |
| `src/components/rbac/email/NotReadyEmailPreview.tsx` | **New** |
| `src/components/rbac/email/ReadyEmailPreview.tsx` | **New** |
| `src/pages/rbac/RoleManagementDashboard.tsx` | **New** — SCR-08 |
| `src/pages/admin/marketplace/AdminContactProfilePage.tsx` | **New** — SCR-19 |
| `src/pages/admin/marketplace/EmailTemplatesPage.tsx` | **New** |
| `src/lib/validations/roleAssignment.ts` | **New** — Zod schemas (dynamic, no hardcoded enums) |
| `src/App.tsx` | Add routes |
| `src/pages/admin/marketplace/MarketplaceDashboard.tsx` | Remove comingSoon from Role Management |

## Zero Hardcoded Values Guarantee

- Role codes/names: from `md_slm_role_codes`
- Status labels/colors: from `md_role_assignment_statuses`
- Engagement models: from `md_engagement_models`
- Industry/taxonomy: from existing master data hooks
- Admin contact: from `rbac_admin_contact` table

