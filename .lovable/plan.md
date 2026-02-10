

# Gap Analysis: Tech Specs REG-001 + REG-002 vs Current DB Schema (11 Feb 2026)

## Methodology
Every column, index, RLS policy, and function referenced in the tech spec was compared against what currently exists in the database. Existing columns that serve the same purpose (even with different names) are mapped and reused. Only truly missing items are listed.

---

## SECTION A: What Already Exists and Maps Correctly (NO CHANGES)

| Spec Field | DB Column | Table | Verdict |
|---|---|---|---|
| `legal_entity_name` | `legal_entity_name` | seeker_organizations | EXISTS |
| `trade_brand_name` | `trade_brand_name` | seeker_organizations | EXISTS (added in gap-fill) |
| `organization_type_id` | `organization_type_id` | seeker_organizations | EXISTS |
| `company_size_range` | `employee_count_range` | seeker_organizations | REUSE (same purpose, adapt UI) |
| `annual_revenue_range` | `annual_revenue_range` | seeker_organizations | EXISTS |
| `year_founded` | `founding_year` | seeker_organizations | REUSE (same purpose, adapt UI) |
| `hq_country_id` | `hq_country_id` | seeker_organizations | EXISTS |
| `state_province` | `hq_state_province_id` | seeker_organizations | REUSE (UUID FK is better than string) |
| `city` | `hq_city` | seeker_organizations | REUSE (same purpose) |
| `currency_code` | `preferred_currency` | seeker_organizations | REUSE (auto-populated by trigger) |
| `date_format` | `date_format` | seeker_organizations | EXISTS |
| `number_format` | `number_format` | seeker_organizations | EXISTS |
| `registration_step` | `registration_step` | seeker_organizations | EXISTS (added in gap-fill) |
| `enterprise_flag` | `is_enterprise` | seeker_organizations | REUSE (trigger uses `is_enterprise`) |
| `verification_status` | `verification_status` | seeker_organizations | EXISTS (enum) |
| `logo_file` storage | `logo_url` | seeker_organizations | REUSE for URL reference |
| `full_name` | `first_name` + `last_name` | seeker_contacts | REUSE (UI concatenates/splits) |
| `department` | `functional_area_id` | seeker_contacts | REUSE (FK to md_functional_areas) |
| `business_email` | `email` | seeker_contacts | REUSE (same purpose) |
| `is_email_verified` | `email_verified` | seeker_contacts | REUSE (same purpose) |
| `email_verified_at` | `email_verified_at` | seeker_contacts | EXISTS |
| `phone_country_code` | `phone_country_code` | seeker_contacts | EXISTS |
| `phone_number` | `phone_number` | seeker_contacts | EXISTS |
| `preferred_language_id` | `preferred_language_id` | seeker_contacts | EXISTS |
| `job_title` | `job_title` | seeker_contacts | EXISTS |
| `contact_type` | `contact_type` | seeker_contacts | EXISTS (enum) |
| `is_primary_admin` | `is_primary` | seeker_contacts | REUSE |
| `is_decision_maker` | `is_decision_maker` | seeker_contacts | EXISTS |
| Soft-delete on contacts | `is_deleted`, `deleted_at`, `deleted_by` | seeker_contacts | EXISTS (added in gap-fill) |
| `organization_id` on OTP | `organization_id` | email_otp_verifications | EXISTS (added in gap-fill) |
| `locked_until` on OTP | `locked_until` | email_otp_verifications | EXISTS (added in gap-fill) |
| `attempt_count` | `attempts` | email_otp_verifications | REUSE (same purpose) |
| Pre-auth INSERT policies | All 4 child tables | RLS | EXISTS (added in gap-fill) |
| All 7 functions | All present | public schema | EXISTS |
| Seed data: md_functional_areas | 10 rows | md_functional_areas | EXISTS (added in gap-fill) |
| Seed data: org_type_seeker_rules | 9 rows | org_type_seeker_rules | EXISTS (added in gap-fill) |
| Seed data: md_states_provinces | 233 rows | md_states_provinces | EXISTS (added in gap-fill) |

---

## SECTION B: ACTUAL GAPS (Migration Required)

### B1. Missing Columns

#### `seeker_organizations` -- 3 columns missing

| Column | Type | Default | Spec Reference | Why Needed |
|---|---|---|---|---|
| `address_format_template` | JSONB | NULL | REG-001 BR-REG-001/BR-CTY-001 | Auto-populated from countries.address_format_template on HQ country selection. The `countries` table has this column but `seeker_organizations` does not persist it. |
| `subsidized_discount_pct` | NUMERIC(5,2) | 0 | REG-001 Section 3.1 INSERT | Stores the discount percentage applied from md_subsidized_pricing based on org type (Academic 50%, NGO 30%, Startup 25%). Used in Step 4 (Plan Selection). |
| `verification_expiry_date` | DATE | NULL | REG-001 BR-SUB-002 | Subsidized pricing requires annual re-verification. Set to `created_at + 1 year` for eligible orgs. |

#### `seeker_contacts` -- 2 columns missing

| Column | Type | Default | Spec Reference | Why Needed |
|---|---|---|---|---|
| `department` | VARCHAR(100) | NULL | REG-002 Section 2.1 | Free-text department name (e.g., "R&D", "IT", "Innovation"). Separate from `functional_area_id` which is the standardized dropdown. The spec has BOTH: a free-text `department` field AND a `department_functional_area_id` dropdown. |
| `timezone` | VARCHAR(100) | NULL | REG-002 Section 2.1, 2.2 | Contact's timezone (IANA format, e.g., "America/New_York"). Auto-detected from browser, user-overridable. Per-contact, not per-org. |

#### `email_otp_verifications` -- 1 column missing

| Column | Type | Default | Spec Reference | Why Needed |
|---|---|---|---|---|
| `total_failed_attempts` | INTEGER | 0 | REG-002 BR-REG-006, Section 3.1 | Cumulative failure count across ALL OTP codes for an email. Different from `attempts` (per-OTP). When `total_failed_attempts >= 5` within 24h, `locked_until` is set. The existing `attempts` column tracks per-OTP attempts (max 3), but the spec requires a separate cumulative counter. |

### B2. Missing Indexes (7 indexes)

| Index Name | Table | Columns | Exists? |
|---|---|---|---|
| `idx_seeker_orgs_legal_name_country` | seeker_organizations | `(LOWER(legal_entity_name), hq_country_id)` | NO -- needed for duplicate detection (BR-REG-007) |
| `idx_seeker_orgs_deleted` | seeker_organizations | `(is_deleted)` | NO |
| `idx_seeker_orgs_reg_step` | seeker_organizations | `(registration_step)` | NO |
| `idx_contacts_org_type` | seeker_contacts | `(organization_id, contact_type)` | NO -- needed for UPSERT lookup |
| `idx_otp_email_org` | email_otp_verifications | `(email, organization_id, created_at DESC)` | NO -- needed for OTP lookup + rate limiting |
| `idx_otp_locked` | email_otp_verifications | `(email, locked_until)` | NO -- needed for lock status check |
| `idx_blocked_domains_lower` | md_blocked_email_domains | `(LOWER(domain))` | NO -- needed for fast domain lookup |

Note: Many indexes DO already exist (idx_seeker_orgs_tenant, idx_seeker_orgs_type, idx_seeker_orgs_country, idx_seeker_contacts_email, idx_seeker_contacts_org, idx_seeker_contacts_tenant, idx_otp_email, idx_otp_expires, idx_states_country, idx_countries_active, etc.)

### B3. Missing RLS Policies (3 policies)

The spec requires separate SELECT and UPDATE policies for `seeker_contacts`. Currently there is only a combined `ALL` policy. This works functionally but the spec also calls for:

| Table | Policy | Exists? |
|---|---|---|
| `seeker_contacts` | Separate SELECT for tenant | NO (covered by ALL policy -- functionally OK) |
| `seeker_contacts` | Separate UPDATE for tenant | NO (covered by ALL policy -- functionally OK) |
| `email_otp_verifications` | Admin ALL access | YES (already exists) |

**Verdict on RLS**: The current `ALL` policy on `seeker_contacts` covers SELECT and UPDATE. No functional gap -- the spec's separate policies are a best-practice recommendation but not a blocker.

### B4. Missing Supabase Storage Bucket

The spec (REG-001 Section 3.1) requires file uploads for:
- Organization Logo (PNG/JPG/SVG, max 5MB)
- Profile Document (PDF, max 10MB)
- Verification Documents (PDF, max 10MB each)

A Supabase Storage bucket `org-documents` needs to be created with appropriate policies.

---

## SECTION C: Column Name Mapping (UI Must Adapt)

These are cases where the spec uses a different column name than what exists. No DB changes needed -- the frontend/service layer maps them.

| Spec Name | DB Column | Adaptation |
|---|---|---|
| `company_size_range` | `employee_count_range` | UI label says "Company Size", saves to `employee_count_range` |
| `year_founded` | `founding_year` | UI label says "Year Founded", saves to `founding_year` |
| `city` | `hq_city` | Direct map |
| `state_province` | `hq_state_province_id` | Spec uses string; DB uses UUID FK (better). UI shows name, saves ID |
| `full_name` | `first_name` + `last_name` | UI can show single field, split on save, or use two fields |
| `business_email` | `email` | Direct map |
| `is_email_verified` | `email_verified` | Direct map |
| `is_primary_admin` | `is_primary` | Direct map |
| `attempt_count` | `attempts` | Direct map |
| `currency_code` | `preferred_currency` | Auto-populated by trigger |

---

## SECTION D: Summary

| Category | Count | Details |
|---|---|---|
| New columns to add | 6 | 3 on seeker_organizations, 2 on seeker_contacts, 1 on email_otp_verifications |
| New indexes to add | 7 | Performance indexes per spec Section 3.4 |
| New RLS policies | 0 | Existing ALL policy covers requirements functionally |
| Storage bucket | 1 | `org-documents` bucket for file uploads |
| Column renames needed | 0 | UI adapts to existing names |
| Tables to create | 0 | All tables exist |
| Seed data to add | 0 | All populated in previous migration |

---

## SECTION E: Proposed Migration SQL

```text
1. ALTER TABLE seeker_organizations
   ADD COLUMN IF NOT EXISTS address_format_template JSONB
   ADD COLUMN IF NOT EXISTS subsidized_discount_pct NUMERIC(5,2) DEFAULT 0
   ADD COLUMN IF NOT EXISTS verification_expiry_date DATE

2. ALTER TABLE seeker_contacts
   ADD COLUMN IF NOT EXISTS department VARCHAR(100)
   ADD COLUMN IF NOT EXISTS timezone VARCHAR(100)

3. ALTER TABLE email_otp_verifications
   ADD COLUMN IF NOT EXISTS total_failed_attempts INTEGER NOT NULL DEFAULT 0

4. CREATE INDEX idx_seeker_orgs_legal_name_country
   ON seeker_organizations(LOWER(legal_entity_name), hq_country_id)

5. CREATE INDEX idx_seeker_orgs_deleted ON seeker_organizations(is_deleted)
6. CREATE INDEX idx_seeker_orgs_reg_step ON seeker_organizations(registration_step)
7. CREATE INDEX idx_contacts_org_type ON seeker_contacts(organization_id, contact_type)
8. CREATE INDEX idx_otp_email_org ON email_otp_verifications(email, organization_id, created_at DESC)
9. CREATE INDEX idx_otp_locked ON email_otp_verifications(email, locked_until)
   WHERE locked_until IS NOT NULL
10. CREATE INDEX idx_blocked_domains_lower ON md_blocked_email_domains(LOWER(domain))

11. Post-migration: Regenerate Supabase TypeScript types
12. Post-migration: Create org-documents storage bucket
```

