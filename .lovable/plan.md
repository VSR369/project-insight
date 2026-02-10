

# Admin Master Data CRUD Screens -- Complete Build

## What's Missing

The Admin Sidebar has menu items for 8 Seeker Config entities + 1 new Master Data entity (Functional Areas), but **none of them have actual CRUD page files or routes in App.tsx**. Clicking any of these sidebar links currently leads to a 404. Additionally, the existing Countries admin page needs updating to expose the 9 new columns added for seeker locale/compliance support.

---

## Deliverables (26 new files + 3 modified files)

### A. Update Existing Countries Page

The `countries` table now has 9 additional columns that the admin page doesn't expose:
- `iso_alpha3` (ISO Alpha-3 code)
- `currency_code`, `currency_symbol`
- `date_format`, `number_format`
- `phone_code_display`
- `is_ofac_restricted` (OFAC sanctions flag)
- `address_format_template` (JSON)

**Changes:**
- Update `CountriesPage.tsx` form fields to include all new columns
- Update table columns to show `currency_code` and `is_ofac_restricted`
- Update `useCountries` hook select list to include the new columns
- Update view dialog fields

---

### B. New Functional Areas Page (Master Data group)

Table: `md_functional_areas` -- columns: `code, name, description, display_order, is_active`

Files to create:
- `src/hooks/queries/useFunctionalAreasAdmin.ts` (CRUD hooks)
- `src/pages/admin/functional-areas/FunctionalAreasPage.tsx`
- `src/pages/admin/functional-areas/index.ts`

---

### C. Seeker Config CRUD Pages (8 entities)

Each follows the exact same pattern as `CountriesPage.tsx`: hook file + page file + barrel export.

**1. Subscription Tiers** (`md_subscription_tiers`)
- Columns: `code, name, description, max_challenges, max_users, is_enterprise, display_order, is_active`
- Files: `useSubscriptionTiers.ts`, `SubscriptionTiersPage.tsx`

**2. Engagement Models** (`md_engagement_models`)
- Columns: `code, name, description, display_order, is_active`
- Files: `useEngagementModels.ts`, `EngagementModelsPage.tsx`

**3. Challenge Complexity** (`md_challenge_complexity`)
- Columns: `complexity_code, complexity_label, complexity_level, consulting_fee_multiplier, management_fee_multiplier, description, display_order, is_active`
- Files: `useChallengeComplexity.ts`, `ChallengeComplexityPage.tsx`

**4. Challenge Statuses** (`md_challenge_active_statuses`)
- Columns: `status_code, status_label, blocks_model_switch, display_order, is_active`
- Files: `useChallengeStatuses.ts`, `ChallengeStatusesPage.tsx`

**5. Export Control Statuses** (`md_export_control_statuses`)
- Columns: `code, name, description, requires_itar_compliance, display_order, is_active`
- Files: `useExportControlStatuses.ts`, `ExportControlPage.tsx`

**6. Data Residency** (`md_data_residency`)
- Columns: `code, name, description, display_order, is_active`
- Files: `useDataResidency.ts`, `DataResidencyPage.tsx`

**7. Blocked Email Domains** (`md_blocked_email_domains`)
- Columns: `domain, reason, is_active`
- Files: `useBlockedDomains.ts`, `BlockedDomainsPage.tsx`

**8. Platform Terms** (`platform_terms`)
- Columns: `version, title, content (textarea), effective_date, published_at, is_active`
- Files: `usePlatformTerms.ts`, `PlatformTermsPage.tsx`

---

### D. App.tsx Route Registration

Add 9 new lazy-loaded routes under `AdminGuard`:
```text
/admin/master-data/functional-areas
/admin/seeker-config/subscription-tiers
/admin/seeker-config/engagement-models
/admin/seeker-config/challenge-complexity
/admin/seeker-config/challenge-statuses
/admin/seeker-config/export-control
/admin/seeker-config/data-residency
/admin/seeker-config/blocked-domains
/admin/seeker-config/platform-terms
```

---

## File Summary

| Category | New Files | Modified Files |
|----------|-----------|----------------|
| Hook files (CRUD) | 9 | 1 (`useCountries.ts`) |
| Page files | 9 pages + 9 barrel exports = 18 | 1 (`CountriesPage.tsx`) |
| Routing | -- | 1 (`App.tsx`) |
| **Total** | **27** | **3** |

## Pattern

Every page reuses the existing admin component library:
- `AdminLayout` for page shell with breadcrumbs
- `DataTable` for listing with search, sort, actions
- `MasterDataForm` for create/edit dialogs with Zod validation
- `MasterDataViewDialog` for read-only detail view
- `DeleteConfirmDialog` for soft-delete/hard-delete confirmation
- `StatusBadge` for active/inactive display
- `withCreatedBy` / `withUpdatedBy` for audit fields
- `handleMutationError` for structured error handling

