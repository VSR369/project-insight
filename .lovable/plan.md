

# Seeker Organization Module -- Complete UX Implementation Plan

## Scope Summary

Two deliverables in this plan:

1. **Integrate Seeker-specific master data** into the existing Admin Master Data portal (single portal, no separate module)
2. **Build the complete Seeker Portal** with layout, navigation, auth guards, and all pages
3. **Refine Registration Wizard Screens 1-3** to match the mockup designs pixel-for-pixel

Screens 4, 5, 6 will be added later per your instruction.

---

## Part 1: Admin Master Data -- Seeker Extensions

The following seeker-specific master data tables need CRUD admin pages. They will be added as new items under the existing "Master Data" and a new "Seeker Config" group in the Admin Sidebar.

### New Admin Master Data Pages (8 pages)

| Table | Admin Page | Sidebar Group |
|-------|-----------|---------------|
| `md_tiers` | Subscription Tiers | Seeker Config |
| `md_engagement_models` | Engagement Models | Seeker Config |
| `md_challenge_complexity` | Challenge Complexity | Seeker Config |
| `md_challenge_active_statuses` | Challenge Statuses | Seeker Config |
| `md_membership_tiers` | Membership Tiers | Seeker Config |
| `md_shadow_pricing` | Shadow Pricing | Seeker Config |
| `md_functional_areas` | Functional Areas | Master Data |
| `md_blocked_email_domains` | Blocked Email Domains | Seeker Config |

Additional admin pages (under Seeker Config):
- `export_control_statuses` -- Export Control Statuses
- `data_residency_options` -- Data Residency Options
- `platform_terms` -- Platform Terms & Conditions

### Admin Sidebar Changes

Add two new groups to `AdminSidebar.tsx`:

```text
Master Data (existing)
  Countries
  Industry Segments
  Organization Types
  Participation Modes
  Expertise Levels
  Functional Areas       <-- NEW

Seeker Config            <-- NEW GROUP
  Subscription Tiers
  Engagement Models
  Challenge Complexity
  Challenge Statuses
  Membership Tiers
  Shadow Pricing
  Export Control
  Data Residency
  Blocked Domains
  Platform Terms
```

### Implementation Pattern

Each page follows the existing admin CRUD pattern:
- Reuse `DataTable`, `MasterDataForm`, `DeleteConfirmDialog`, `StatusBadge` from `src/components/admin/`
- Each page in `src/pages/admin/[entity-name]/` folder with barrel export
- React Query hook in `src/hooks/queries/` for each entity
- Lazy-loaded route in `App.tsx` under `AdminGuard`

---

## Part 2: Seeker Portal Shell

### New Components

| File | Purpose |
|------|---------|
| `src/components/org/OrgLayout.tsx` | Layout wrapper: SidebarProvider + OrgSidebar + SidebarInset + OrgHeader + content |
| `src/components/org/OrgSidebar.tsx` | Sidebar with: Dashboard, Challenges, Settings, Team, Billing, Membership |
| `src/components/org/OrgHeader.tsx` | Header with breadcrumbs, org name, tier badge, user dropdown |
| `src/contexts/OrgContext.tsx` | Resolves current user's org via `org_users` table. Provides `organizationId`, `tenantId`, `orgRole` |
| `src/hooks/queries/useCurrentOrg.ts` | Hook to fetch user's org from `org_users` |
| `src/components/auth/SeekerGuard.tsx` | Auth guard verifying user has `org_users` record |

### New Pages

| File | Route | Purpose |
|------|-------|---------|
| `src/pages/org/OrgDashboardPage.tsx` | `/org/dashboard` | Dashboard hub with usage gauges, tier info, quick actions |
| `src/pages/org/ChallengeListPage.tsx` | `/org/challenges` | DataTable of challenges with filters |
| `src/pages/registration/OnboardingCompletePage.tsx` | `/registration/complete` | Post-billing welcome page |

### Auth and Routing Updates

**Login.tsx changes:**
- Add 4th tab: "Organization" with `Building2` icon, color teal/cyan
- Add `PortalType = 'admin' | 'provider' | 'reviewer' | 'organization'`
- Add `PORTAL_ROUTES.organization = '/org/dashboard'`
- Add registration CTA: "Registering an organization? Start here" linking to `/registration/organization-identity`

**App.tsx changes:**
- Add all new admin master data routes (11 routes under AdminGuard)
- Wrap all `/org/*` routes with `SeekerGuard` + `OrgContext`
- Add `/org/dashboard`, `/org/challenges`, `/registration/complete` routes

**RoleBasedRedirect changes:**
- Add seeker portal priority: Admin > Reviewer > Seeker > Provider
- Check `org_users` table for seeker role

### Existing Page Refactors

All existing `/org/*` pages will be refactored to:
1. Use `OrgLayout` instead of bare content or `AdminLayout`
2. Use `OrgContext` instead of `DEMO_ORG_ID` / `DEMO_TENANT_ID` hardcoded values

| Page | Changes |
|------|---------|
| `OrgSettingsPage` | Wrap with OrgLayout, use OrgContext for orgId |
| `OrgBillingPage` | Wrap with OrgLayout, use OrgContext for orgId |
| `TeamPage` | Wrap with OrgLayout, use OrgContext for orgId |
| `MembershipPage` | Wrap with OrgLayout, use OrgContext for orgId |
| `ChallengeCreatePage` | Wrap with OrgLayout, use OrgContext for orgId |
| `ParentDashboardPage` | Wrap with OrgLayout, use OrgContext for orgId |

---

## Part 3: Registration Wizard Screens 1-3 Refinements

Based on the mockup screenshots, the following refinements are needed:

### Screen 1: Organization Identity (REG-001)

Current form has all fields but UI needs alignment with mockups:

- **Header area**: Add platform logo icon (layered chevrons icon) centered above the stepper
- **Step indicator**: Step labels always visible (currently `hidden lg:block` -- needs `sm:block`)
- **Form title**: "Tell us about your organization" with subtitle "This helps us personalize your experience and recommend the right plan."
- **Industries**: Display as togglable chip/pill tags (currently uses IndustryTagSelector -- verify matches mockup style with `+` prefix)
- **Country selector**: Show flag emoji + country name (mockup shows "us United States")
- **Country hint text**: "Currency, date format, and phone code will be set automatically" (matches spec)
- **Operating Geographies**: Tags with country code + flag (mockup: "US US", "GB UK", etc.)
- **Logo upload**: Show thumbnail preview with green checkmark, filename, size, "Remove logo" link (match mockup exactly)
- **Profile Document**: Show file icon, green checkmark, filename, size, date, "Remove document" link
- **Verification Documents**: Info banner "Document Verification Required" in blue/light blue. "+ Add Document" full-width cyan button. Listed docs with title, filename, size, date, "Remove" link
- **Privacy notice**: Blue info banner with lock icon: "Your data is encrypted and never shared with other organizations."
- **Footer**: "Already have an account? Sign in" on left, "Step 1 of 5" center-right, "Continue" button (dark blue, not full-width) on right
- **Back button**: Disabled/hidden on Step 1

### Screen 2: Primary Contact (REG-002)

Refinements per mockups:

- **Full Name**: Single "Full Name" input instead of separate first/last name fields (mockup shows one field). Helper text: "Unicode characters supported for international names"
- **Job Title**: Label just "Job Title" (currently "Designation / Job Title")
- **Department**: Shows "Optional" hint below
- **Department Functional Area**: Dropdown with "Technology" etc. Shows "Optional" hint
- **Business Email**: Input with mail icon, green checkmark when verified, green border. "Must be a corporate email." hint. "Verify Email" cyan button to the right
- **Phone Number**: Country code prefix box ("+1 us") with flag, phone icon in the number field
- **Preferred Language**: Dropdown
- **Timezone**: Shows full format "America/New_York (EST, UTC-5)". Hint: "Auto-detected with override option"
- **Footer**: "Back" outlined button (left), "Step 2 of 5", "Continue" dark blue button (right)

### Screen 3: Compliance & Legal Setup (REG-003)

Major refinement -- current form differs significantly from mockup:

- **Title**: "Compliance & Legal Setup" with subtitle "Required for regulatory compliance and platform security."
- **Tax ID section** (NEW -- missing from current form):
  - "EIN (Employer Identification Number)" -- label changes based on country (e.g., EIN for US, GST for India)
  - Format hint below: "Format: XX-XXXXXXX"
  - Driven by `md_tax_formats` table (country-specific)
- **DUNS Number** (NEW): Optional text input
- **Platform Terms & Conditions**:
  - Scrollable terms viewer showing versioned terms from `platform_terms` table
  - Checkbox: "I accept the Platform Terms & Conditions (Version X.X, dated [date])" with "Read Full Terms" link
  - Green checkmark + "Accepted on [date/time] UTC" confirmation after acceptance
- **NDA Preference** (NEW):
  - Radio group: "Standard Platform NDA" (recommended badge) vs "Custom NDA"
  - Standard: "Use our pre-approved mutual NDA for all engagements"
  - Custom: "Upload your organization's NDA template for review"
- **Export Control Status**: Dropdown (existing, keep)
- **Data Residency Requirements**: Dropdown (existing, keep). Hint: "Specifies where your organization's data will be stored and processed"
- **Remove**: Compliance certifications grid (GDPR, HIPAA, SOC2, ISO27001) and additional notes -- not in the mockups for Screen 3
- **Footer**: "Back" + "Step 3 of 5" + "Continue"

### Compliance Validation Schema Update

Update `complianceSchema` to include:
- `tax_id`: string, conditional format validation based on country
- `duns_number`: string, optional, 9 digits
- `terms_accepted`: boolean, must be true
- `terms_version`: string
- `terms_accepted_at`: string (timestamp)
- `nda_preference`: enum ('standard' | 'custom')
- `custom_nda_file`: File, optional (required if nda_preference = 'custom')

### RegistrationWizardLayout Updates

- Add centered platform logo icon above stepper
- Step labels visible on `sm:` breakpoint (not just `lg:`)
- Footer: left = privacy notice with lock icon, right = step counter

---

## Technical Details

### File Count Summary

| Category | New Files | Modified Files |
|----------|-----------|----------------|
| Admin Master Data Pages | ~22 (11 pages + 11 hooks) | 2 (AdminSidebar, App.tsx) |
| Seeker Portal Shell | 6 | 8 (existing org pages + App.tsx + Login.tsx) |
| Registration Refinements | 0 | 6 (layout, forms, validation, step indicator) |
| **Total** | **~28** | **~16** |

### Execution Order

1. Admin Sidebar + master data CRUD pages (extend existing pattern)
2. OrgContext + SeekerGuard + OrgLayout shell
3. Login.tsx 4th tab + routing updates
4. OrgDashboard + ChallengeListPage
5. Refactor existing org pages to use OrgLayout
6. Registration Screen 1 UI refinements
7. Registration Screen 2 UI refinements
8. Registration Screen 3 major refactor (Tax ID, Terms, NDA)
9. OnboardingCompletePage

### Patterns Followed

- Shell-first rendering per Runtime Stability v4.0
- Hook ordering: State > Context > Form > Query > Effect > Conditional > Handlers > Render
- `lg:` breakpoint for layout transitions (not `md:`)
- React Query for all server data, RHF + Zod for forms
- Reuse existing `DataTable`, `MasterDataForm` admin components
- `withCreatedBy` / `withUpdatedBy` for all mutations
- Structured error handling via `handleMutationError`

