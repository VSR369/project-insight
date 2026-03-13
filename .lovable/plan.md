

# Add `seeker_config.view_shadow_pricing` Permission

## What & Why
Shadow Pricing shows internal department charge-back rates — sensitive financial data. Currently it's visible to anyone with `seeker_config.view`. We'll add a dedicated view permission so visibility can be toggled independently per tier.

## Changes

### 1. Database — Seed 3 new rows (insert tool)
```sql
INSERT INTO tier_permissions (tier, permission_key, is_enabled) VALUES
  ('supervisor','seeker_config.view_shadow_pricing',true),
  ('senior_admin','seeker_config.view_shadow_pricing',false),
  ('admin','seeker_config.view_shadow_pricing',false)
ON CONFLICT DO NOTHING;
```
Default: only Supervisors can see Shadow Pricing.

### 2. `src/pages/admin/permissions/PermissionsManagementPage.tsx`
Add to the Seeker Config category (after `edit_pricing`):
```
{ key: 'seeker_config.view_shadow_pricing', label: 'View Shadow Pricing' }
```

### 3. `src/components/admin/AdminSidebar.tsx`
Split Shadow Pricing out of `seekerConfigItems` array. In the sidebar render, show it conditionally:
- Move `{ title: 'Shadow Pricing', ... }` out of the static array
- Render it inline with `hasPermission('seeker_config.view_shadow_pricing')` guard, similar to how `complianceConfigItems` are handled

### Final Seeker Config permission keys (6 total)
| Key | Supervisor | Senior | Admin |
|---|---|---|---|
| `seeker_config.view` | on | on | off |
| `seeker_config.edit` | on | on | off |
| `seeker_config.edit_pricing` | on | off | off |
| `seeker_config.view_shadow_pricing` | on | off | off |
| `seeker_config.manage_compliance` | on | off | off |

