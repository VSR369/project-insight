

# Hybrid Shadow Pricing Model — Implementation Plan

## Concept

Platform sets **default** shadow pricing rates per tier/country (existing `md_shadow_pricing`). Parent organizations can **override** these with custom rates stored in a new `org_shadow_pricing` table. Resolution logic: org override wins over platform default.

## Current State

- `md_shadow_pricing` — platform-wide rates by `tier_id` + `country_id` (no org scoping)
- `saas_agreements` already has a `shadow_charge_rate` column (per-agreement override) but no structured org-level override table
- Platform Admin page at `/admin/seeker-config/shadow-pricing` — full CRUD
- Org Portal sidebar has an "Administration" group for PRIMARY SO Admins with Delegated Admins, My Profile, Email Templates
- `usePlanSelectionData.ts` consumes `md_shadow_pricing` for registration billing

## Architecture

```text
Challenge billing resolution:

1. Check org_shadow_pricing (org_id + tier_id + country_id)
   └─ Found? Use org rate
   └─ Not found?
2. Check md_shadow_pricing (tier_id + country_id)
   └─ Use platform default
```

## Changes

### 1. Database — New `org_shadow_pricing` table

```sql
CREATE TABLE public.org_shadow_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES seeker_organizations(id),
  tier_id UUID NOT NULL REFERENCES md_subscription_tiers(id),
  country_id UUID REFERENCES countries(id),
  shadow_charge_per_challenge NUMERIC NOT NULL CHECK (shadow_charge_per_challenge >= 0),
  currency_code VARCHAR(5) NOT NULL DEFAULT 'USD',
  currency_symbol VARCHAR(5) NOT NULL DEFAULT '$',
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  tenant_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID,
  UNIQUE (organization_id, tier_id, country_id)
);
```

RLS policies:
- SELECT/INSERT/UPDATE: `tenant_id = get_user_tenant_id()` (org users see only their own)
- Platform admins: full read access via `has_role()` fallback

Indexes on `(organization_id, tier_id, country_id)` and `(tenant_id)`.

### 2. Hook — `useOrgShadowPricing`

New file: `src/hooks/queries/useOrgShadowPricing.ts`

- `useOrgShadowPricing(orgId)` — fetches org-specific overrides from `org_shadow_pricing`
- `useCreateOrgShadowPricing()` — insert with `organization_id` and `tenant_id` from OrgContext
- `useUpdateOrgShadowPricing()` — update by id
- `useDeleteOrgShadowPricing()` — soft delete (set `is_active = false`)
- Follows the same pattern as `useShadowPricing.ts` but scoped to org

### 3. Resolution Hook — `useResolvedShadowPricing`

New file: `src/hooks/queries/useResolvedShadowPricing.ts`

- Fetches both `org_shadow_pricing` (for the org) and `md_shadow_pricing` (platform defaults)
- Merges: for each tier+country combo, org override takes priority
- Returns a unified list with a `source: 'org' | 'platform'` indicator
- Used by billing/registration logic instead of raw `md_shadow_pricing`

### 4. Org Portal — Shadow Pricing Page

New file: `src/pages/org/OrgShadowPricingPage.tsx`

- Reuses `DataTable`, `MasterDataForm`, `DeleteConfirmDialog` pattern (same as platform page)
- Shows the org's custom overrides with a badge indicating "Custom" vs "Platform Default"
- "Add Override" button opens form pre-populated with platform defaults
- Form fields: Country (select), Tier (select), Charge per Challenge, Currency (auto-filled from country)
- Context: uses `useOrgContext()` for `organizationId` and `tenantId`

### 5. Org Sidebar — Add Shadow Pricing link

In `OrgSidebar.tsx`, add to the `adminOperationsItems` array (for PRIMARY SO Admins):
```
{ title: 'Shadow Pricing', icon: DollarSign, path: '/org/shadow-pricing' }
```

### 6. Route Registration

In `App.tsx`, add within the `/org` route group:
```tsx
<Route path="shadow-pricing" element={<OrgShadowPricingPage />} />
```

### 7. Platform Admin Page — Mark as "Defaults"

Update `ShadowPricingPage.tsx`:
- Change heading to "Shadow Pricing — Platform Defaults"
- Update subtitle to clarify these are fallback rates that orgs can override
- Make it read-only for non-Supervisors (already handled by `edit_pricing` permission)

### 8. Update Registration Billing Logic

In `usePlanSelectionData.ts`, update the `useShadowPricing()` consumer to use `useResolvedShadowPricing(orgId)` where org context is available, falling back to platform defaults when no org is known (e.g., during initial registration).

## What Stays Unchanged

- `md_shadow_pricing` table structure — untouched
- Platform Admin CRUD — still works for setting global defaults
- `saas_agreements.shadow_charge_rate` — remains as a per-agreement override (different granularity)
- Existing permission keys — `seeker_config.view_shadow_pricing` still controls platform page visibility

## File Summary

| File | Action |
|---|---|
| Migration SQL | Create `org_shadow_pricing` table + RLS + indexes |
| `src/hooks/queries/useOrgShadowPricing.ts` | New — org-scoped CRUD hook |
| `src/hooks/queries/useResolvedShadowPricing.ts` | New — merge org + platform rates |
| `src/pages/org/OrgShadowPricingPage.tsx` | New — org admin CRUD page |
| `src/components/org/OrgSidebar.tsx` | Add Shadow Pricing nav item |
| `src/App.tsx` | Add `/org/shadow-pricing` route |
| `src/pages/admin/shadow-pricing/ShadowPricingPage.tsx` | Update heading to "Platform Defaults" |
| `src/hooks/queries/usePlanSelectionData.ts` | Update to use resolved pricing |

