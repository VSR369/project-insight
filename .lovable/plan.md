

# Permissions Control Module — Product & Sales Assessment

## A. Product Manager Assessment

### What's Working Well
- 11 permission categories with 45 keys covering the major functional areas
- Supervisor-locked column prevents self-lockout
- Audit trail with change history and admin attribution
- Tier depth config (1/2/3) adapts the UI dynamically
- Mix of `hasPermission()` and `TierGuard` provides defense-in-depth

### Gaps and Risks Identified

#### GAP-1: Inconsistent Access Control (HIGH PRIORITY)
The sidebar still has **dual control systems running in parallel**. Six sections use `hasPermission()` (Master Data, Taxonomy, Interview, Seeker Config, Invitations, Content) while the remaining sections use hardcoded tier flags:

| Section | Current Control | Should Be |
|---|---|---|
| Reassignments | `effectiveSupervisor` (hardcoded) | `hasPermission('supervisor.approve_reassignments')` |
| Notification Audit | `effectiveSupervisor` | `hasPermission('supervisor.view_audit_logs')` |
| Team Performance | `effectiveSupervisor` | `hasPermission('supervisor.view_team_performance')` |
| System Config | `effectiveSupervisor` | `hasPermission('supervisor.configure_system')` |
| Permissions | `effectiveSupervisor` | `hasPermission('supervisor.manage_permissions')` — **key missing from DB** |
| Admin Contact | `canSeeTeamManagement` | `hasPermission('marketplace.manage_config')` |
| Email Templates | `canSeeTeamManagement` | `hasPermission('marketplace.manage_config')` |
| Enterprise Agreements | `canSeeTeamManagement` | `hasPermission('org_approvals.manage_agreements')` — **key missing from DB** |
| Team Management section | `canSeeTeamManagement` | `hasPermission('admin_management.view_all_admins')` |
| Assignment Audit Log | `effectiveSupervisor` | `hasPermission('supervisor.view_audit_logs')` |
| Settings | `canSeeTeamManagement` | `hasPermission('admin_management.view_settings')` — **key missing from DB** |
| Org Approvals | Always visible | `hasPermission('org_approvals.view')` |

**Impact**: Supervisors see toggles in the permissions page for keys like `supervisor.approve_reassignments` and `marketplace.manage_config`, but toggling them does nothing — the sidebar ignores these values and uses hardcoded flags. This is a trust/UX problem: the matrix promises control it doesn't deliver.

#### GAP-2: Three Permission Keys Missing from Database
These keys appear in the permissions matrix UI but have **no rows seeded** in `tier_permissions`:
- `supervisor.manage_permissions` — controls who sees the Permissions page itself
- `org_approvals.manage_agreements` — controls Enterprise Agreements access
- `admin_management.view_settings` — controls Settings page access

Without DB rows, the toggles show empty/disabled states.

#### GAP-3: No "My Profile" / "My Performance" / "My Availability" Permission Control
These personal items are visible to all tiers (correct default), but there's no way to restrict them if needed. Low priority — acceptable as-is since they're self-service.

---

## B. Sales Manager Assessment — Pricing Tier Impact

### Seeker Config Section Is the Revenue Control Center
The `seeker_config.*` permissions gate access to **all pricing master data**:
- Subscription Tiers, Billing Cycles, Engagement Models
- Base Fee Config, Platform Fees, Shadow Pricing
- Subsidized Pricing, Challenge Complexity pricing
- Payment Methods

### Current Default Access Matrix for Pricing

```text
                              SUPERVISOR    SENIOR ADMIN    BASIC ADMIN
seeker_config.view               ✓              ✓              ✗
seeker_config.edit               ✓              ✓              ✗
seeker_config.manage_compliance  ✓              ✗              ✗
```

### Risk Assessment

**RISK-1: Senior Admins can edit ALL pricing** — `seeker_config.edit` is ON by default for Senior Admins. This means they can modify subscription tier prices, base fees, platform fee percentages, and subsidized pricing. A single incorrect edit to `md_tier_country_pricing` or `md_platform_fees` could cascade to all new org registrations and billing calculations.

**Recommendation**: Split `seeker_config.edit` into two granular keys:
- `seeker_config.edit_general` — non-financial config (challenge statuses, postal formats, tax formats)
- `seeker_config.edit_pricing` — financial config (subscription prices, base fees, platform fees, shadow pricing, subsidized pricing)

Default: Senior Admins get `edit_general` ON, `edit_pricing` OFF. Only Supervisors can modify pricing by default.

**RISK-2: No per-page pricing guard** — Even if `seeker_config.edit` is toggled OFF for a tier, the individual pricing pages (Base Fee Config, Platform Fees, etc.) don't check `hasPermission('seeker_config.edit')` before showing edit/save buttons. The sidebar hides the menu, but direct URL access may still render edit controls.

**RISK-3: Shadow Pricing visibility** — Shadow pricing (internal department charge-back rates) is visible to anyone with `seeker_config.view`. This is sensitive internal financial data that should potentially have its own view permission.

---

## C. Implementation Plan

### Changes Required

#### 1. Seed 3 missing permission keys (9 rows)
```sql
INSERT INTO tier_permissions (tier, permission_key, is_enabled) VALUES
  ('supervisor','supervisor.manage_permissions',true),
  ('senior_admin','supervisor.manage_permissions',false),
  ('admin','supervisor.manage_permissions',false),
  ('supervisor','org_approvals.manage_agreements',true),
  ('senior_admin','org_approvals.manage_agreements',true),
  ('admin','org_approvals.manage_agreements',false),
  ('supervisor','admin_management.view_settings',true),
  ('senior_admin','admin_management.view_settings',true),
  ('admin','admin_management.view_settings',false)
ON CONFLICT DO NOTHING;
```

#### 2. Add 3 missing keys to PermissionsManagementPage.tsx
- Add `supervisor.manage_permissions` → "Supervisor Functions" category
- Add `org_approvals.manage_agreements` → "Org Approvals" category
- Add `admin_management.view_settings` → "Admin Management" category

#### 3. Wire ALL remaining hardcoded sidebar items to `hasPermission()`

Replace every `effectiveSupervisor` and `canSeeTeamManagement` check:

```text
Reassignments         → hasPermission('supervisor.approve_reassignments')
Notification Audit    → hasPermission('supervisor.view_audit_logs')
Team Performance      → hasPermission('supervisor.view_team_performance')
System Config         → hasPermission('supervisor.configure_system')
Permissions           → hasPermission('supervisor.manage_permissions')
Admin Contact         → hasPermission('marketplace.manage_config')
Email Templates       → hasPermission('marketplace.manage_config')
Enterprise Agreements → hasPermission('org_approvals.manage_agreements')
Org Approvals         → hasPermission('org_approvals.view')
Team Management       → hasPermission('admin_management.view_all_admins')
Assignment Audit Log  → hasPermission('supervisor.view_audit_logs')
Settings              → hasPermission('admin_management.view_settings')
My Profile (Other)    → !hasPermission('admin_management.view_all_admins') (fallback)
Test items            → hasPermission('supervisor.configure_system')
```

#### 4. Remove dead variables
Delete `effectiveSupervisor`, `canSeeTeamManagement`, `canSeeSeekerConfig` — all access is now purely `hasPermission()`.

#### 5. Split pricing edit permission (Sales risk mitigation)
Add a new key `seeker_config.edit_pricing` to the Seeker Config category. Default: ON for Supervisor, OFF for Senior Admin, OFF for Admin. Update `PermissionsManagementPage.tsx` to include it.

Seed 3 additional rows:
```sql
INSERT INTO tier_permissions (tier, permission_key, is_enabled) VALUES
  ('supervisor','seeker_config.edit_pricing',true),
  ('senior_admin','seeker_config.edit_pricing',false),
  ('admin','seeker_config.edit_pricing',false)
ON CONFLICT DO NOTHING;
```

### Files to Change
1. **`src/components/admin/AdminSidebar.tsx`** — Replace all hardcoded flags with `hasPermission()`, remove dead variables
2. **`src/pages/admin/permissions/PermissionsManagementPage.tsx`** — Add 4 new permission labels (3 missing + 1 pricing split)
3. **New migration SQL** — Seed 12 new rows (4 keys x 3 tiers)

### Final Permission Count
48 keys total across 11 categories, fully wired to both the matrix UI and sidebar visibility. Zero hardcoded tier flags remaining.

