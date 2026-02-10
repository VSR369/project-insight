

# Gap-Fill Migration: Only What's Actually Missing

## Analysis Method

Compared every column and policy the Tech Spec requires against what currently exists in the database. Existing columns that serve the same purpose (even if named slightly differently) are reused — no redundant additions.

---

## What Already Exists and Will Be REUSED (No Changes Needed)

| Spec Requirement | Existing Column/Object | Verdict |
|---|---|---|
| `enterprise_flag` | `seeker_organizations.is_enterprise` | SAME — trigger already uses `is_enterprise` |
| `full_name` on contacts | `seeker_contacts.first_name` + `last_name` | REUSE — adapt UI to use two fields (better practice) |
| `attempt_count` on OTP | `email_otp_verifications.attempts` | SAME — just different name, keep as-is |
| Pre-auth INSERT on `seeker_organizations` | Policy `Pre-auth registration insert` already exists | READY |
| `organization_id` on contacts | `seeker_contacts.organization_id` already exists | READY |

---

## ACTUAL GAPS (Migration Required)

### 1. Missing Columns (3 columns across 2 tables)

**`seeker_organizations`** — 2 columns:

| Column | Type | Default | Why |
|---|---|---|---|
| `trade_brand_name` | VARCHAR(200) | NULL | REG-001: optional brand/trade name |
| `registration_step` | INTEGER | 1 | Wizard progress tracking (steps 1-5) |

**`email_otp_verifications`** — 2 columns:

| Column | Type | Default | Why |
|---|---|---|---|
| `organization_id` | UUID (FK to seeker_organizations) | NULL | Links OTP to org during registration |
| `locked_until` | TIMESTAMPTZ | NULL | Account lockout per BR-REG-006 |

Note: `total_failed_attempts` is NOT needed — the existing `attempts` + `max_attempts` columns handle the per-OTP logic, and lockout is handled by `locked_until`.

### 2. Missing Soft-Delete on `seeker_contacts` (3 columns)

| Column | Type | Default | Why |
|---|---|---|---|
| `is_deleted` | BOOLEAN | FALSE | Standard soft-delete pattern |
| `deleted_at` | TIMESTAMPTZ | NULL | Deletion timestamp |
| `deleted_by` | UUID | NULL | Who deleted |

### 3. Missing RLS Policies (4 pre-auth INSERT policies)

These tables currently only have tenant-scoped `ALL` policies. During registration (pre-auth), no tenant context exists yet, so INSERTs will fail.

| Table | Missing Policy |
|---|---|
| `seeker_contacts` | `INSERT WITH CHECK (true)` |
| `seeker_org_industries` | `INSERT WITH CHECK (true)` |
| `seeker_org_geographies` | `INSERT WITH CHECK (true)` |
| `seeker_org_documents` | `INSERT WITH CHECK (true)` |

### 4. Missing Seed Data (3 tables with 0 rows)

| Table | Data Needed | Approximate Rows |
|---|---|---|
| `md_functional_areas` | Technology, Operations, Finance, Marketing, HR, Legal, Strategy, R&D, Supply Chain, Sales | ~10 |
| `org_type_seeker_rules` | One rule row per existing organization_type (9 types) mapping to tier recommendations and eligibility flags | 9 |
| `md_states_provinces` | States/provinces for the 20 supported countries (US 50, IN 36, CA 13, AU 8, GB 4, etc.) | ~200 |

---

## What Is NOT Needed (Previously Flagged, Now Confirmed Unnecessary)

| Previously Flagged Gap | Why It's NOT Needed |
|---|---|
| `enterprise_flag` column | `is_enterprise` already exists and trigger uses it |
| `full_name` on contacts | `first_name` + `last_name` is better — UI will concatenate |
| `total_failed_attempts` on OTP | `attempts` + `max_attempts` + `locked_until` covers the spec |
| `department` on contacts | `functional_area_id` FK already serves this purpose |
| `timezone` on contacts | Org-level `timezone` on `seeker_organizations` is sufficient |
| `attempt_count` rename | Keep existing `attempts` column name — no functional difference |
| `organization_id` on OTP | Actually needed (listed above) — links OTP to registration context |

---

## Implementation: Single Migration

### SQL Migration Contents

```text
1. ALTER TABLE seeker_organizations
   ADD COLUMN IF NOT EXISTS trade_brand_name VARCHAR(200)
   ADD COLUMN IF NOT EXISTS registration_step INTEGER DEFAULT 1

2. ALTER TABLE seeker_contacts
   ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE
   ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ
   ADD COLUMN IF NOT EXISTS deleted_by UUID

3. ALTER TABLE email_otp_verifications
   ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES seeker_organizations(id)
   ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ

4. CREATE INDEX on email_otp_verifications(organization_id)
   CREATE INDEX on seeker_contacts(tenant_id, is_deleted)

5. Add 4 pre-auth INSERT policies (WITH CHECK (true)) on:
   seeker_contacts, seeker_org_industries, seeker_org_geographies, seeker_org_documents

6. INSERT seed data:
   - md_functional_areas (~10 rows)
   - org_type_seeker_rules (9 rows, one per org type)
   - md_states_provinces (~200 rows for 20 countries)
```

### Post-Migration

- Regenerate Supabase TypeScript types
- Verify with SELECT queries on all modified tables

---

## Summary

| Category | Count |
|---|---|
| New columns to add | 7 (across 3 tables) |
| New indexes | 2 |
| New RLS policies | 4 (pre-auth INSERT) |
| Seed data tables | 3 |
| Tables/columns previously flagged but NOT needed | 6 items eliminated |

