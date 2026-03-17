

# Plan: M-01-B — Challenge Tables (Mapped to Existing Schema)

## Key Mapping Decisions

The existing `challenges` table (PK: `id`, FK: `organization_id`) already has 26 columns covering fees, status, visibility, and complexity references. Rather than creating a duplicate "Table 7", we **extend the existing `challenges` table** with the missing CogniBlend columns.

| Requested | Existing Equivalent | Decision |
|---|---|---|
| `challenges` (Table 7) | `challenges` (26 cols, PK `id`) | **ALTER** — add ~15 missing columns. Map `challenge_id` → `id`, `org_id` → `organization_id`, `master_status` uses existing `status` column (rename/extend CHECK). |
| `challenge_legal_docs` (Table 8) | Does not exist | **Create new** |
| `amendment_records` (Table 9) | Does not exist | **Create new** |
| `challenge_package_versions` (Table 10) | Does not exist | **Create new** |
| FK `user_challenge_roles.challenge_id` → `challenges` | **Already exists** (`challenges(id) ON DELETE CASCADE`) | **Skip** — no action needed |
| `idx_challenges_org_status` | **Already exists** (`organization_id, status`) | **Skip** — already indexed |

## Changes

### 1. ALTER `challenges` — Add Missing Columns

Add these columns (all nullable with defaults to avoid breaking existing data):

- `problem_statement` text
- `scope` text
- `deliverables` jsonb
- `evaluation_criteria` jsonb
- `reward_structure` jsonb
- `master_status` text DEFAULT 'DRAFT' (new CogniBlend status, parallel to existing `status`)
- `current_phase` integer DEFAULT 1
- `phase_status` text DEFAULT 'ACTIVE'
- `operating_model` text
- `governance_profile` text
- `maturity_level` text
- `complexity_score` numeric
- `complexity_level` text
- `complexity_parameters` jsonb
- `ip_model` text
- `phase_schedule` jsonb
- `submission_deadline` timestamptz
- `rejection_fee_percentage` numeric DEFAULT 10
- `published_at` timestamptz
- `completed_at` timestamptz

CHECK constraints added via validation triggers (per Supabase guidelines) for `master_status`, `current_phase`, `phase_status`, `maturity_level`, `complexity_level`, `ip_model`, `rejection_fee_percentage`.

### 2. CREATE `challenge_legal_docs`

- PK: `id` uuid (standard naming)
- `challenge_id` uuid FK → `challenges(id)` ON DELETE CASCADE
- `document_type`, `document_name`, `tier`, `maturity_level`, `template_version`, `status`
- `attached_by` uuid FK → `auth.users(id)`
- Standard audit fields (`created_at`, `updated_at`)
- RLS: authenticated SELECT; INSERT/UPDATE for attached_by = auth.uid()

### 3. CREATE `amendment_records`

- PK: `id` uuid
- `challenge_id` FK → `challenges(id)` ON DELETE CASCADE
- `amendment_number`, `initiated_by` FK → `auth.users(id)`, `reason`, `scope_of_change`, `status`, `version_before`, `version_after`
- Standard audit fields
- RLS: authenticated SELECT; INSERT for initiated_by = auth.uid()

### 4. CREATE `challenge_package_versions`

- PK: `id` uuid
- `challenge_id` FK → `challenges(id)` ON DELETE CASCADE
- `version_number` integer, `snapshot` jsonb
- Standard audit fields
- RLS: authenticated SELECT; INSERT for authenticated users

### 5. Indexes

- `challenge_legal_docs`: index on `(challenge_id, tier)`
- `amendment_records`: index on `(challenge_id, amendment_number)`
- `challenge_package_versions`: index on `(challenge_id, version_number)`

### What is NOT done

- No new `challenges` table created (existing one extended)
- No FK added for `user_challenge_roles` (already exists)
- No `idx_challenges_org_status` created (already exists)
- No UI components created
- No existing columns or tables modified

