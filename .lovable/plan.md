

# Seeker Registration & Organization Management -- Phased Implementation Roadmap

## Scope Summary

This plan implements the complete Seeker Organization system across 3 tech spec documents and 15+ business rule categories. Given the complexity (30+ new tables, 10+ screens, 50+ business rules), the work is divided into **7 sequential phases**, each delivering a testable, deployable increment.

---

## Phase 1: Foundation -- New Master Data Tables, Missing Schema, and Shared Infrastructure

**Goal:** Create all missing database tables, seed data, RLS policies, indexes, and shared frontend infrastructure (Registration Wizard Layout, shared components, types, services) that ALL subsequent phases depend on.

**Deliverables:**

**Database (Migration):**
- Create `md_industries` table + seed data (Technology, Healthcare, Manufacturing, Finance, Retail, Energy, Education, Transportation)
- Create `md_challenge_complexity` table + seed (simple, moderate, complex)
- Create `md_challenge_base_fees` table (country x tier pricing)
- Create `md_challenge_active_statuses` table + seed (10 statuses)
- Create `md_shadow_pricing` table + seed (Basic=100, Standard=75, Premium=0)
- Create `md_membership_tiers` table + seed (annual, multi_year)
- Create `seeker_organization_audit` table + indexes
- Add missing columns to `seeker_subscriptions`: `challenges_used`, `challenge_limit_snapshot`, `current_period_start`, `current_period_end`, `per_challenge_fee_snapshot`, `max_solutions_snapshot`, `pending_downgrade_tier_id`, `pending_downgrade_date`, `shadow_charge_per_challenge`, `shadow_currency_code`
- Add missing columns to `challenges`: `engagement_model_id`, `complexity_id`, `consulting_fee`, `management_fee`, `total_fee`, `currency_code`, `payment_status`, `shadow_fee_amount`, `max_solutions`, `solutions_awarded`, `visibility`
- Create engagement model lock trigger on `challenges`
- Enable RLS + policies on all new tables
- All required indexes per spec

**Frontend Infrastructure:**
- `src/pages/registration/` directory structure
- `src/components/registration/` directory structure  
- `src/components/layouts/RegistrationWizardLayout.tsx` -- 5-step stepper with progress, shared context
- `src/components/shared/StepIndicator.tsx` -- Visual stepper component
- `src/components/shared/FileUploadZone.tsx` -- Reusable file upload (drag-drop, validation, preview)
- `src/contexts/RegistrationContext.tsx` -- Shared wizard state across steps
- `src/types/registration.ts` -- All TypeScript interfaces for registration flow
- `src/config/registration.ts` -- Constants (file size limits, allowed types, step count)
- `src/services/registrationService.ts` -- Business logic layer
- Routes registration in App router: `/registration/*`

---

## Phase 2: REG-001 -- Organization Identity (Step 1)

**Goal:** Complete the first registration screen where seekers provide organization identity details.

**Deliverables:**

**Frontend:**
- `OrganizationIdentityPage.tsx` -- Page component with shell-first rendering
- `OrganizationIdentityForm.tsx` -- Main form with Zod validation (14 fields)
- `IndustryTagSelector.tsx` -- Multi-select tag component for industries
- `CountrySelector.tsx` -- Dropdown with country flags, auto-populates locale fields
- `GeographyTagSelector.tsx` -- Multi-select country tags for operating geographies
- `VerificationDocuments.tsx` -- Conditional upload section (NGO/Academic orgs)
- `DuplicateOrgModal.tsx` -- BR-REG-007 duplicate detection dialog

**Hooks:**
- `useIndustries()` -- Fetch active industries
- `useOrgTypeRules()` -- Fetch org type rules with tier recommendations
- `useStatesForCountry(countryId)` -- Country-dependent state dropdown
- `useSubsidizedPricing(orgTypeId)` -- Discount lookup
- `useTierCountryPricing(countryId)` -- BR-TCP-001 pricing existence check
- `useCreateOrganization()` -- Mutation with batch inserts for industries, geographies, documents
- `useCheckDuplicateOrg()` -- Pre-insert duplicate detection

**Business Rules Implemented:**
- BR-REG-001: Country auto-populates currency, phone code, formats
- BR-REG-002: Org type drives recommendations (subsidized pricing, compliance, startup, zero-fee)
- BR-REG-004: Sanctioned countries excluded
- BR-REG-007: Duplicate organization detection
- BR-CTY-001: Locale formatting persistence
- BR-SUB-001/002: Subsidized pricing calculation + annual re-verification
- BR-TCP-001: Country pricing validation

---

## Phase 3: REG-002 -- Primary Contact & OTP Verification (Step 2)

**Goal:** Capture primary contact information and verify corporate email via OTP.

**Deliverables:**

**Frontend:**
- `PrimaryContactPage.tsx` -- Page component
- `PrimaryContactForm.tsx` -- Form with email, phone (E.164), timezone auto-detect
- `OtpVerification.tsx` -- 6-digit OTP entry (inline/modal) with attempt tracking
- `EmailDomainBlocker.tsx` -- Real-time domain blocklist check

**Edge Function:**
- `send-registration-otp` -- Generate + email OTP with rate limiting (5/hour/email)

**Hooks:**
- `useBlockedDomains()` -- Fetch blocked email domains
- `useLanguages()` -- Fetch available languages
- `useSendOtp()` -- Trigger OTP send
- `useVerifyOtp()` -- Verify OTP code
- `useUpsertContact()` -- UPSERT into seeker_contacts

**Business Rules Implemented:**
- BR-REG-005: Block free email providers; allow .edu, .ac., .gov
- BR-REG-006: OTP limits (10min validity, 3 wrong/OTP, 5 OTP/hour, 24hr lockout)
- Cumulative `total_failed_attempts` tracking

---

## Phase 4: REG-003 through REG-005 -- Compliance, Plan Selection & Billing (Steps 3-5)

**Goal:** Complete the remaining registration wizard steps.

**Deliverables:**

**REG-003 -- Compliance:**
- Tax ID form with country-specific format (BR-REG-008)
- Export control declaration (BR-REG-009)
- ITAR restriction logic

**REG-004 -- Plan Selection:**
- Tier comparison cards (Basic/Standard/Premium)
- Pricing in local currency (BR-REG-011)
- Cost estimator with shadow pricing for internal depts (BR-REG-014)
- Premium triggers "Contact Sales" (BR-REG-013)
- Billing cycle discount display (BR-REG-015: quarterly 8%, annual 17%)

**REG-005 -- Billing & Account Creation:**
- Payment method selection (country-dependent, BR-REG-016)
- Stripe integration for payment
- Internal department: skip billing (BR-SAAS-001/003)
- Shadow billing record creation (BR-ZFE-001 + BR-SAAS-002)
- Supabase Auth account creation
- Subscription record creation with snapshots

**New Tables in Migration:**
- `seeker_invoices` + `seeker_invoice_line_items`
- `seeker_challenge_topups`

---

## Phase 5: ORG-001 -- Organization Settings & Profile Management

**Goal:** Post-registration settings page for managing organization profile.

**Deliverables:**

**Frontend:**
- `OrgSettingsPage.tsx` -- Tabbed layout (Profile | Subscription | Engagement Model)
- `ProfileTab.tsx` -- Editable form with field-level locking (Legal Entity Name locked)
- `SubscriptionTab.tsx` -- Tier upgrade/downgrade with prorated billing
- `EngagementModelTab.tsx` -- Model switching for Basic tier (BR-MSL-001, BR-ENG-001)
- `AuditTrailTable.tsx` -- Profile change history
- `TierComparisonModal.tsx` -- Side-by-side comparison
- `ActiveChallengesBlocker.tsx` -- Shows blocking challenges

**Business Rules Implemented:**
- Section 14: Profile editability rules (Legal Name locked, Country cascading)
- BR-MSL-001: Basic model switching blocked by active challenges
- BR-ENG-001: Single model at Basic tier level
- Tier upgrade (immediate) / downgrade (next cycle) with validation

---

## Phase 6: MEM-001 + SAS-001 -- Membership & SaaS Administration

**Goal:** Membership management and parent org SaaS dashboard.

**Deliverables:**

**Database:**
- `seeker_memberships` table
- `saas_agreements` table

**Frontend:**
- `MembershipPage.tsx` -- Membership status, discounts, auto-renewal
- `SaasAgreementPage.tsx` (Admin) -- Create/manage SaaS agreements
- `ParentDashboardPage.tsx` -- 6-widget dashboard (tier, fee, dept count, shadow charges, challenges, renewal)

**Business Rules:**
- BR-MEM-001 through BR-MEM-004: Discounts, exclusions, internal bypass
- BR-SFC-001 through BR-SFC-003: SaaS fee management
- Background jobs: membership renewal, expiry notifications

---

## Phase 7: TEM-001 + CHG-001 + BIL-001 -- Team Management, Challenge Creation & Billing Lifecycle

**Goal:** User/role management, challenge creation with pricing, and billing operations.

**Deliverables:**

**Database:**
- `org_roles` table + system role seeds
- Enhance `org_users` table (subsidiary support)

**Frontend:**
- `TeamPage.tsx` -- Invite users, assign roles, tier-based limits
- `CustomRoleBuilder.tsx` (Premium) -- Granular permissions
- `ChallengeCreatePage.tsx` -- Engagement model selection, complexity pricing
- `BillingPage.tsx` -- Challenge counter, top-ups, invoices

**Business Rules:**
- BR-REG-017: User limits by tier
- BR-MSL-002: Model locked after Draft
- BR-EMF-002/003: Marketplace vs Aggregator runtime rules
- BR-TFR-001 through BR-TFR-004: Challenge limits, fees, max solutions
- BR-ZFE-001/002: Internal department zero-fee flow

---

## Implementation Approach for Each Phase

Every phase follows this consistent pattern (per Project Knowledge v4.0):

1. **Database Migration** -- Tables, columns, indexes, constraints, RLS policies, seed data
2. **TypeScript Types Regeneration** -- Auto-update from schema
3. **Service Layer** -- Business logic functions (stateless, max ~200 lines/file)
4. **React Query Hooks** -- Data fetching with proper staleTime/gcTime per data type
5. **UI Components** -- Shell-first rendering, Zod+RHF forms, all 4 states (loading/empty/error/success)
6. **Verification** -- DB queries to confirm data, browser testing

---

## Technical Standards Applied Throughout

- Tenant isolation: `tenant_id` on all business tables + RLS
- Audit fields: `withCreatedBy()` / `withUpdatedBy()` on all mutations
- Hook ordering: useState > Context > Form > Query/Mutation > useEffect > Conditional returns
- Responsive: `lg:` breakpoint for layout transitions, never `md:`
- Error handling: `handleMutationError()` -- no `console.log`
- State: React Query for server data, RHF+Zod for forms
- Files max ~200 lines; decompose into sub-modules

---

## Recommended Starting Point

**Phase 1 (Foundation)** should be implemented first as all other phases depend on it. This includes the database migration for ~10 new tables and the shared frontend infrastructure (RegistrationWizardLayout, FileUploadZone, RegistrationContext, types).

After Phase 1, Phase 2 (REG-001) delivers the first visible, testable registration screen.

