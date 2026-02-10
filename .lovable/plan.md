

# Final Database Schema Migration Plan -- Seeker Organization Registration

## Multi-Tenant Architecture Confirmation

**YES, multi-tenancy is fully factored.** Every seeker organization is its own tenant. Here is how isolation works:

### Tenant Isolation Model

```text
SEEKER TENANT ISOLATION (3 layers)
===================================

Layer 1: DATABASE (RLS)
  seeker_organizations.tenant_id = seeker_organizations.id  (self-referencing)
  All child tables inherit tenant_id from parent org
  RLS policies enforce: tenant_id must match user's tenant

Layer 2: USER-TO-ORG MEMBERSHIP
  org_users table: links auth.users -> seeker_organizations
  Each user belongs to exactly one org (enforced)
  Role within org: owner, admin, member

Layer 3: QUERY SCOPING
  All hooks/services filter by tenant_id
  No cross-tenant joins possible
  Platform admin has separate bypass via has_role()

RESULT: Org A cannot see Org B's challenges, contacts,
        compliance, billing, documents, or any data.
```

### Critical Design Fix: Tenant Resolution

The uploaded schema uses `get_user_tenant_id()` which reads `app_metadata.tenant_id` from JWT. This project currently uses `has_role()` + `auth.uid()` for RLS. The migration must create a tenant resolution function that works with the existing auth pattern:

```text
get_user_tenant_id() implementation:
  1. Look up org_users WHERE user_id = auth.uid() AND is_active = TRUE
  2. Return tenant_id from that row
  3. Falls back to NULL (blocks all access for unmapped users)

This avoids requiring JWT custom claims (which need edge function
to set on login) and works with existing Supabase Auth setup.
```

---

## Architecture: Extend Existing + Create New (Confirmed Final)

### What Gets EXTENDED (Existing Tables -- Column Additions Only)

**1. `countries` table -- Add 9 columns**

| New Column | Type | Default | Nullable | Impact on Existing |
|---|---|---|---|---|
| iso_alpha3 | CHAR(3) | NULL | Yes | None -- existing hooks select specific columns |
| currency_code | CHAR(3) | NULL | Yes | None |
| currency_symbol | VARCHAR(10) | '$' | No | None |
| date_format | VARCHAR(20) | 'YYYY-MM-DD' | No | None |
| number_format | VARCHAR(20) | '#,###.##' | No | None |
| address_format_template | JSONB | NULL | Yes | None |
| is_ofac_restricted | BOOLEAN | FALSE | No | None |
| description | TEXT | NULL | Yes | None |
| phone_code_display | VARCHAR(20) | NULL | Yes | None |

Existing 20 rows: All preserved. New columns get defaults. No data loss.

Existing hooks verified safe:
- `useCountries()` selects `id, code, name, phone_code, display_order, is_active` -- unaffected
- `useReviewerCandidates` selects `id, name, code` -- unaffected
- Smoke tests select `id, name` or `id, name, code` -- unaffected

**2. `industry_segments` table -- Add 1 column**

| New Column | Type | Default | Nullable | Impact on Existing |
|---|---|---|---|---|
| parent_id | UUID (self-ref FK) | NULL | Yes | None -- existing 9 rows get NULL (top-level) |

Existing hooks verified safe:
- `useIndustrySegments()` selects `*` but new column is nullable -- returned harmlessly
- `useProficiencyTaxonomyAdmin` selects `id, name` -- unaffected
- Provider taxonomy FK chain (`proficiency_areas` -> `industry_segments`) -- unaffected

**3. `organization_types` table -- NO CHANGES**

Remains exactly as-is. Extension table `org_type_seeker_rules` references it via FK.

### What Gets CREATED (New Tables)

**New Extension Table (1)**
- `org_type_seeker_rules` -- FK to `organization_types.id`, adds tier_recommendation, subsidized_eligible, compliance_required, zero_fee_eligible, startup_eligible

**New Master Data Tables (16)**
- `md_states_provinces` -- FK to `countries.id` (shared)
- `md_languages`, `md_functional_areas`, `md_blocked_email_domains`
- `md_tax_formats` -- FK to `countries.id` (shared)
- `md_export_control_statuses`, `md_data_residency`
- `md_subscription_tiers`, `md_tier_country_pricing` -- FK to `countries.id` (shared)
- `md_tier_features`, `md_engagement_models`, `md_tier_engagement_access`
- `md_billing_cycles`, `md_subsidized_pricing`
- `md_payment_methods_availability` -- FK to `countries.id` (shared)
- `md_postal_formats` -- FK to `countries.id` (shared)

**Platform Table (1)**
- `platform_terms` -- versioned T&C, partial unique index for single active version

**Business Tables (11, all tenant-scoped)**
- `seeker_organizations` -- FK to `countries.id` + `organization_types.id` (shared tables)
- `seeker_org_industries` -- FK to `industry_segments.id` (shared table)
- `seeker_org_geographies` -- FK to `countries.id` (shared table)
- `seeker_org_documents`, `seeker_contacts`, `email_otp_verifications`
- `seeker_compliance`, `seeker_subscriptions`, `enterprise_contact_requests`
- `seeker_billing_info`, `seeker_onboarding`

**Supporting/Stub Tables (4)**
- `org_users`, `user_invitations`, `challenges`, `solver_profile_views`

**Enum Types (11)**
- `document_type_enum`, `document_verification_status_enum`, `contact_type_enum`
- `nda_preference_enum`, `nda_review_status_enum`, `subscription_status_enum`
- `payment_method_type_enum`, `payment_type_enum`, `enterprise_request_status_enum`
- `org_verification_status_enum`, `access_type_enum`

---

## FK Reference Map (Shared vs New)

```text
SHARED TABLES (extended, not duplicated)     SEEKER TABLES (new)
==========================================   ============================
countries.id  <-----------------------------  seeker_organizations.hq_country_id
countries.id  <-----------------------------  seeker_org_geographies.country_id
countries.id  <-----------------------------  seeker_billing_info.billing_country_id
countries.id  <-----------------------------  md_states_provinces.country_id
countries.id  <-----------------------------  md_tax_formats.country_id
countries.id  <-----------------------------  md_tier_country_pricing.country_id
countries.id  <-----------------------------  md_payment_methods_availability.country_id
countries.id  <-----------------------------  md_postal_formats.country_id

industry_segments.id  <---------------------  seeker_org_industries.industry_id

organization_types.id  <--------------------  org_type_seeker_rules.org_type_id
organization_types.id  <--------------------  seeker_organizations.organization_type_id
```

---

## Functions (17 new)

| Function | Purpose | Security |
|---|---|---|
| `get_user_tenant_id()` | Resolve tenant_id via `org_users` lookup (NOT JWT claims) | SECURITY DEFINER |
| `get_auth_user_id()` | Wrapper for `auth.uid()` | SECURITY DEFINER |
| `trigger_set_updated_at()` | Auto-update `updated_at` on new tables only | -- |
| `trigger_set_org_tenant_id()` | Auto-set `tenant_id = id` on org INSERT | -- |
| `trigger_enterprise_auto_flag()` | Revenue >$1B or size >5001 = enterprise | -- |
| `trigger_itar_cascade()` | ITAR export control cascade | -- |
| `trigger_country_format_populate()` | Auto-populate locale from `countries` (extended) | -- |
| `trigger_onboarding_completion_check()` | 3-item checklist auto-complete | -- |
| `trigger_deactivate_old_terms()` | Single active T&C version | -- |
| `check_duplicate_organization()` | Trigram similarity detection | SECURITY DEFINER |
| `calculate_effective_monthly_cost()` | Billing discount math | IMMUTABLE |
| `is_email_domain_blocked()` | Email blocklist check | SECURITY DEFINER |
| `validate_tax_id()` | Country-specific tax ID regex | SECURITY DEFINER |
| `generate_terms_acceptance_hash()` | SHA-256 T&C acceptance proof | IMMUTABLE |
| `cleanup_expired_otps()` | OTP TTL purge (30 days) | SECURITY DEFINER |
| `check_user_limit()` | Tier-based user limit enforcement | SECURITY DEFINER |
| `can_switch_engagement_model()` | Engagement model switch guard | SECURITY DEFINER |

---

## RLS Policies

**Master data tables (16 + org_type_seeker_rules)**: Public SELECT where `is_active = TRUE`
**Platform terms**: Public SELECT where `is_active = TRUE`
**Business tables (14)**: Tenant-scoped CRUD via `get_user_tenant_id()`
**email_otp_verifications**: Server-only (`USING(FALSE)`)
**Platform admin override**: `has_role(auth.uid(), 'platform_admin')` grants full access

**Pre-auth registration INSERT**: `WITH CHECK (TRUE)` on `seeker_organizations` only (REG-001 is pre-auth; validated by rate limiting + CAPTCHA at API layer). Child table INSERTs use `WITH CHECK (TRUE)` during registration flow, then tenant-scoped after auth is established.

---

## Triggers (7 definitions, applied to new tables only)

Existing tables (`countries`, `industry_segments`, `organization_types`) are NOT touched by triggers. They already have their own update mechanisms.

---

## Indexes (~65 new)

All `CREATE INDEX IF NOT EXISTS`. Applied only to new tables. No index changes on existing tables. Includes:
- Tenant isolation indexes on all 14 business tables
- Trigram GIN index for duplicate org detection (`pg_trgm` extension required)
- Partial indexes for active/soft-delete filtering
- Composite indexes for common query patterns

---

## Seed Data (idempotent)

All `ON CONFLICT DO NOTHING`:
- 3 subscription tiers (Basic, Standard, Premium)
- 3 billing cycles (Monthly 0%, Quarterly 8%, Annual 17%)
- 3 export control statuses (None, EAR, ITAR)
- 6 data residency regions
- 12 languages
- 8 blocked email domains

---

## Zero-Touch Guarantee (Existing System)

| What | Status |
|---|---|
| Existing `countries` data (20 rows) | Preserved. New nullable columns get defaults. |
| Existing `industry_segments` data (9 rows) | Preserved. `parent_id` = NULL (top-level). |
| Existing `organization_types` data (9 rows) | Preserved. No column changes. |
| `useCountries()` hook | Unaffected. Selects `id, code, name, phone_code, display_order, is_active`. |
| `useIndustrySegments()` hook | Unaffected. New `parent_id` column returned as null. |
| `useOrganizationTypes()` hook | Unaffected. No table changes. |
| Provider enrollment, assessment, interview flows | Zero changes. |
| Pulse social/gamification (16 tables) | Zero changes. |
| All 18 existing enum types | Zero changes. |
| All existing RLS policies, triggers, functions | Zero changes. |
| All existing regression/smoke tests | Continue working. |

---

## Implementation Steps

**Step 1**: Execute single migration SQL containing (in order):
1. Enable `pg_trgm` extension
2. Create 11 enum types (with `EXCEPTION WHEN duplicate_object` safety)
3. `ALTER TABLE countries ADD COLUMN IF NOT EXISTS` -- 9 columns
4. `ALTER TABLE industry_segments ADD COLUMN IF NOT EXISTS parent_id`
5. Create `org_type_seeker_rules` with FK to `organization_types`
6. Create 16 master data tables
7. Create `platform_terms`
8. Create 11 business tables (all with `tenant_id NOT NULL`)
9. Create 4 supporting/stub tables
10. Create ~65 indexes
11. Create 17 functions (helper + trigger + utility)
12. Enable RLS + create policies on all new tables
13. Create 7 trigger definitions + attach to new tables
14. Insert seed data

**Step 2**: Regenerate Supabase TypeScript types

**Step 3**: Verify with queries:
- All 32 new tables exist
- `countries` has 9 new columns, 20 rows intact
- `industry_segments` has `parent_id`, 9 rows intact
- All seed data populated
- All RLS policies active
- Existing provider data untouched

**Step 4** (optional follow-up): UPDATE existing 20 countries with `iso_alpha3`, `currency_code`, etc. to enrich shared data for seeker use

