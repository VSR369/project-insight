

# Expert Assessment: Expertise Scoping per Platform Admin Tier

## Your Proposal vs. My Recommendation

Your idea is directionally correct but "exactly one" for Basic Admin is too rigid operationally. Here is why:

- A Basic Admin handling "Technology" in "India" will inevitably need to cover neighboring markets (India + Sri Lanka) or related org types (Startup + SME) that overlap in practice.
- Hard-coding "exactly 1" creates bottlenecks -- if that admin goes on leave, no other Basic Admin with the same single scope exists, and reassignment fails.
- It also cannot be adjusted without a code deployment.

### Recommended Model: Configurable Caps

| Tier | Industries | Countries | Org Types | Scope Enforcement |
|---|---|---|---|---|
| **Supervisor** | ALL (bypass) | ALL (bypass) | ALL (bypass) | No scope checks |
| **Senior Admin** | Multiple (uncapped) | Multiple (uncapped) | Multiple (uncapped) | Scoped to their selections |
| **Basic Admin** | Capped (default 3) | Capped (default 3) | Capped (default 3) | Scoped to their selections |

The caps for Basic Admin are **configurable by Supervisors** via the existing System Config page (`md_mpa_config`), so if a small platform wants "exactly 1", they set the cap to 1. A larger platform can raise it to 5. No code change needed.

Senior Admin stays uncapped because they are operational leaders who need broad coverage -- but they are still scoped (not ALL like Supervisor).

## Implementation

### 1. Add config parameters to `md_mpa_config`

New `param_group: 'EXPERTISE_CAPS'` with three keys:

| Key | Default | Description |
|---|---|---|
| `basic_admin_max_industries` | 3 | Max industry selections for Basic Admin |
| `basic_admin_max_countries` | 3 | Max country selections for Basic Admin |
| `basic_admin_max_org_types` | 3 | Max org type selections for Basic Admin |

These appear in System Config under a new "Expertise Caps" accordion group, editable by Supervisors.

### 2. Enforce caps in the form schema

Update `platformAdminFormSchema` to accept a dynamic `maxItems` refinement. The `PlatformAdminForm` component reads the config values via `useMpaConfigValue` and passes them to the pickers.

### 3. Update expertise pickers with `maxItems` prop

Add a `maxItems` prop to `IndustryExpertisePicker`, `CountryExpertisePicker`, and `OrgTypeExpertisePicker`. When reached, disable further selections and show a helper like "Maximum 3 allowed for Admin tier."

### 4. Enforce scope on all downstream operations

Create a `useAdminExpertiseScope` hook that:
- For **Supervisor**: returns `{ isScopeBypassed: true }` (skip all scope filters)
- For **Senior/Basic Admin**: returns their `industry_expertise`, `country_region_expertise`, `org_type_expertise` arrays as scope filters

This hook will be used by verification assignment, challenge role management, and any future feature that needs domain-scoped access.

### 5. Add SystemConfig group metadata

Add `EXPERTISE_CAPS` to the `GROUP_META` in `SystemConfigPage.tsx` so the new parameters render in the existing accordion UI.

## Files

| File | Change |
|---|---|
| Database migration | Seed 3 new `md_mpa_config` rows for expertise caps |
| `src/pages/admin/system-config/SystemConfigPage.tsx` | Add "Expertise Caps" group to `GROUP_META` |
| `src/components/admin/platform-admins/PlatformAdminForm.tsx` | Read caps config, pass `maxItems` to pickers based on selected tier |
| `src/components/admin/platform-admins/IndustryExpertisePicker.tsx` | Add `maxItems` prop, disable when cap reached |
| `src/components/admin/platform-admins/CountryExpertisePicker.tsx` | Add `maxItems` prop |
| `src/components/admin/platform-admins/OrgTypeExpertisePicker.tsx` | Add `maxItems` prop |
| `src/hooks/useAdminExpertiseScope.ts` | New hook -- returns scope filters or bypass flag per tier |

