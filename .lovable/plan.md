

# Configurable Admin Tier Depth — Revised Plan (Top-Down)

## Analysis: Why Top-Down is Correct

The existing permission design already follows a top-down inheritance model:

```text
TIER_RANK:  Supervisor (3) → Senior Admin (2) → Admin (1)

Depth = 1:  Supervisor only         ← Founder/solo operator, full access
Depth = 2:  Supervisor + Senior     ← First hire gets Senior role (partial access)
Depth = 3:  Supervisor + Senior + Admin  ← Full hierarchy at scale
```

This is the natural scaling path:
- **Day 1**: Platform founder is the sole Supervisor — sees everything, does everything
- **Growth**: Hires a Senior Admin to handle Master Data, Taxonomy, Seeker Config — but NOT system config, reassignments, audit logs
- **Scale**: Hires basic Admins who only handle verifications and their own profile

The `tier_permissions` table already encodes this — Supervisor permissions are locked/always-on, Senior Admin has a subset, Admin has the least. Top-down means the config simply controls **how many tiers below Supervisor are activated**.

Similarly for Org Admin:
- **MSME**: One PRIMARY admin does everything — no delegation UI shown
- **Large enterprise**: Enable delegation → PRIMARY can create DELEGATED admins with scoped access

---

## Implementation Plan

### 1. Database: Two Config Rows in `md_mpa_config`

| param_key | default | effect |
|-----------|---------|--------|
| `platform_admin_tier_depth` | `3` | `1` = Supervisor only. `2` = Supervisor + Senior Admin. `3` = Full hierarchy |
| `org_admin_delegation_enabled` | `true` | `false` = Only PRIMARY admins, delegation UI hidden |

Defaults preserve current behavior — zero breaking changes.

### 2. New Hook: `useTierDepthConfig.ts`

Two simple wrappers around existing `useMpaConfigValue`:
- `usePlatformTierDepth()` → returns `1 | 2 | 3`
- `useOrgDelegationEnabled()` → returns `boolean`

### 3. Platform Admin Changes (by depth)

**`TierGuard.tsx`** — The core gate:
- Depth 1: All guards pass (everyone is Supervisor-level, skip rank check)
- Depth 2: `requiredTier='admin'` routes → grant access to Senior Admin too (already works via rank). Routes requiring `senior_admin` → still accessible. Routes requiring `supervisor` → unchanged.
- Depth 3: No change (current behavior)

**`AdminSidebar.tsx`** — Menu visibility:
- Depth 1: Show ALL menu items (Reassignments, Notification Audit, Performance, System Config, Permissions, Assignment Audit Log) — currently gated behind `isSupervisor`
- Depth 2: Items gated to `isSupervisor` stay supervisor-only. Items gated to `canSeeTeamManagement` (supervisor OR senior) stay as-is. No change needed.
- Depth 3: No change

Concrete logic: replace `isSupervisor` checks with `isSupervisor || tierDepth === 1`

**`AdminSidebar.tsx` header** — Tier badge display:
- Depth 1: Hide sub-tier label entirely (just show "Admin Panel")
- Depth 2+: Show as current

**`PlatformAdminForm.tsx`** — Tier selector:
- Depth 1: Hide tier field completely; auto-set `supervisor`
- Depth 2: Filter options to `['supervisor', 'senior_admin']` only — no basic admin option
- Depth 3: Show all three (current)

**`PlatformAdminListPage.tsx`** — Tier filter:
- Depth 1: Hide tier filter dropdown entirely
- Depth 2: Filter dropdown shows only Supervisor + Senior Admin
- Depth 3: No change

**`PermissionsManagementPage.tsx`** — Columns:
- Depth 1: Hide the page or show a single "All Enabled" view (Supervisor is locked anyway)
- Depth 2: Hide the "Platform Admin" column, show only Supervisor + Senior Admin
- Depth 3: No change (3 columns)

**`CreatePlatformAdminPage.tsx`** — Permission check:
- Depth 1: Everyone (all supervisors) can create — works already since `isSupervisor` is true
- No change needed; existing `isSupervisor || isSeniorAdmin` check works correctly at all depths

### 4. Org Admin Changes (delegation toggle)

**`OrgSidebar.tsx`** — When `org_admin_delegation_enabled = false`:
- Hide "Admin Management" menu item entirely

**`AdminManagementPage.tsx`** — When disabled:
- Show info card: "Delegated admin management is not enabled. Contact platform support to enable."

**`CreateDelegatedAdminPage.tsx`** — When disabled:
- Redirect to `/org/dashboard`

**`OrgDashboardPage.tsx`** — When disabled:
- Hide delegation-related stats cards

**Registration Step 2** — When disabled:
- Hide "Separate User" toggle; registrant is always the PRIMARY admin

**`create-org-admin` edge function** — When disabled:
- Check config; return 403 with message "Delegation is not enabled for this platform"

### 5. System Config Dashboard

Both new parameters appear automatically in the existing System Config UI (since they're in `md_mpa_config`). Supervisor can change them from the dashboard without code deployment.

`platform_admin_tier_depth` should render as a Select dropdown (ENUM type: 1/2/3).
`org_admin_delegation_enabled` should render as a toggle (BOOLEAN type).

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/XXX_tier_depth_config.sql` | Create | Insert 2 config rows |
| `src/hooks/queries/useTierDepthConfig.ts` | Create | Config hooks |
| `src/components/admin/TierGuard.tsx` | Edit | Depth-aware gating |
| `src/components/admin/AdminSidebar.tsx` | Edit | Depth-aware menu visibility + header |
| `src/components/admin/platform-admins/PlatformAdminForm.tsx` | Edit | Dynamic tier options |
| `src/pages/admin/platform-admins/PlatformAdminListPage.tsx` | Edit | Conditional tier filter |
| `src/pages/admin/permissions/PermissionsManagementPage.tsx` | Edit | Dynamic tier columns |
| `src/components/org/OrgSidebar.tsx` | Edit | Hide delegation menu |
| `src/pages/org/AdminManagementPage.tsx` | Edit | Disabled state |
| `src/pages/org/CreateDelegatedAdminPage.tsx` | Edit | Redirect when disabled |
| `src/pages/org/OrgDashboardPage.tsx` | Edit | Hide delegation stats |
| `supabase/functions/create-org-admin/index.ts` | Edit | Config guard |

**Zero schema changes** to `platform_admin_profiles` or `seeking_org_admins`. All existing data, RLS policies, triggers, and edge functions continue working. Defaults (depth=3, delegation=true) preserve current behavior.

