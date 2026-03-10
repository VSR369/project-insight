

# Rename "Org Admin Delegation" to "Seeking Org Admin Delegation"

## Change

Update the label for `org_admin_delegation_enabled` in two places:

### 1. `src/components/admin/system-config/ConfigParamRow.tsx`
Update `ENUM_OPTIONS.org_admin_delegation_enabled` labels:
- `'Enabled — PRIMARY + DELEGATED admins'` → `'Enabled — PRIMARY + DELEGATED seeking org admins'`
- `'Disabled — PRIMARY admin only'` → `'Disabled — PRIMARY seeking org admin only'`

### 2. Database: update the `label` column in `md_mpa_config`
Run a migration to update the display label:
```sql
UPDATE md_mpa_config
SET label = 'Seeking Org Admin Delegation'
WHERE param_key = 'org_admin_delegation_enabled';
```

### 3. `src/pages/admin/system-config/SystemConfigPage.tsx`
Update `GROUP_META.GOVERNANCE.description` to reference "seeking org admin delegation" instead of "org admin delegation".

