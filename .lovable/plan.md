

# MOD-01: Platform Admin Profile Management — Final 360-Degree Implementation Plan

## Current State Analysis

**What exists today:**
- `admin_access_codes` table exists (with `code_hash`, `is_used`, `expires_at`) but the registration handler is a stub (`TODO(ADMIN-ACCESS)` on line 297 of `Register.tsx`)
- Login page already has a "Platform Admin" tab that routes to `/admin`
- `AdminGuard` checks `platform_admin` role via `useUserRoles` hook
- `AdminShell` + `AdminSidebar` provide persistent layout for all `/admin/*` routes
- `profiles` table has: `id, user_id, email, first_name, last_name, phone, avatar_url, created_at, updated_at`
- `user_roles` table stores roles with `has_role()` SECURITY DEFINER function
- No `platform_admin_profiles` table exists
- Edge functions follow established pattern: `create-panel-reviewer`, `create-org-admin` (service_role, auth header verification)
- `withCreatedBy`/`withUpdatedBy` utilities in `src/lib/auditFields.ts`
- `FeatureErrorBoundary` in `src/components/ErrorBoundary.tsx`
- `handleMutationError` in `src/lib/errorHandler.ts`

**BRD Business Rules to enforce:**
- BR-MPA-001: Cannot deactivate/put-on-leave last Available admin
- BR-MPA-002: Cannot remove last Supervisor flag
- BR-MPA-003: Minimum 1 industry expertise required
- BR-MPA-004: Auto-sync availability_status from workload ratio
- BR-MPA-005: Leave date validation (end > start, both or neither)
- BR-MPA-006: Immutable audit trail for all profile changes

---

## Implementation Plan (10 Tasks)

### Task 1: Database Migration

Create tables with standard audit fields, indexes, RLS using `has_role()`, and triggers:

**`platform_admin_profiles`** — system-level table (no `tenant_id` since platform admins are global):
- `id` UUID PK, `user_id` UUID UNIQUE NOT NULL FK auth.users ON DELETE RESTRICT
- `full_name` TEXT NOT NULL, `email` TEXT UNIQUE NOT NULL, `phone` TEXT NOT NULL
- `is_supervisor` BOOLEAN DEFAULT FALSE
- `industry_expertise` UUID[] NOT NULL (validated >=1 via trigger)
- `country_region_expertise` UUID[] DEFAULT '{}'
- `org_type_expertise` TEXT[] DEFAULT '{}'
- `max_concurrent_verifications` INTEGER DEFAULT 10 CHECK(1-100)
- `current_active_verifications` INTEGER DEFAULT 0
- `availability_status` TEXT DEFAULT 'Available' CHECK IN (Available, Partially_Available, Fully_Loaded, On_Leave, Inactive)
- `assignment_priority` INTEGER DEFAULT 5 CHECK(1-10)
- `leave_start_date` DATE, `leave_end_date` DATE
- `last_assignment_timestamp` TIMESTAMPTZ
- Standard audit: `created_at, updated_at, created_by, updated_by`

**`platform_admin_profile_audit_log`** — immutable:
- `id`, `admin_id` FK, `event_type` TEXT, `actor_id` UUID, `actor_type` TEXT
- `field_changed`, `old_value` JSONB, `new_value` JSONB, `ip_address`, `created_at`

**`admin_performance_metrics`** — auto-maintained:
- `id`, `admin_id` UUID UNIQUE FK ON DELETE CASCADE
- `verifications_completed` INTEGER DEFAULT 0, `avg_processing_hours` DECIMAL, `sla_compliance_rate_pct` DECIMAL
- Standard audit

**`md_mpa_config`** — module config:
- `id`, `param_key` TEXT UNIQUE, `param_value` TEXT, `description` TEXT, standard audit
- Seed: `executive_escalation_email`, `l1_weight=50`, `l2_weight=30`, `l3_weight=20`

**Triggers:**
1. `fn_guard_min_admins()` — BEFORE UPDATE: blocks last Available admin from On_Leave/Inactive (BR-MPA-001), blocks removing last supervisor (BR-MPA-002)
2. `fn_validate_industry_expertise()` — BEFORE INSERT/UPDATE: ensures array length >= 1 (BR-MPA-003)
3. `fn_sync_admin_workload()` — AFTER UPDATE: auto-calculates availability from current/max ratio (BR-MPA-004)
4. `fn_updated_at_pap()` — BEFORE UPDATE: sets `updated_at = NOW()`

**Leave validation trigger** — BEFORE INSERT/UPDATE: if either leave date is set, both must be set and end > start (BR-MPA-005)

**RLS Policies** (all use `has_role()`):
- `platform_admin_profiles`: SELECT for `platform_admin`. INSERT/UPDATE/DELETE restricted to supervisor via subquery. Self-update policy for availability/leave fields only.
- `platform_admin_profile_audit_log`: SELECT for `platform_admin`. INSERT only via service_role.
- `admin_performance_metrics`: SELECT for `platform_admin`.
- `md_mpa_config`: SELECT for `platform_admin`. INSERT/UPDATE for supervisors only.

**Indexes:** `idx_pap_availability`, `idx_pap_industry_gin` (GIN), `idx_pap_supervisor` (partial), `idx_pap_user_id`, `idx_papal_admin_event`, `idx_apm_admin`

### Task 2: Admin Registration Edge Function — `register-platform-admin`

Completes the currently-stubbed admin registration flow. Follows the `create-panel-reviewer` pattern:

1. Accepts: email, password, first_name, last_name, access_code
2. Validates access code against `admin_access_codes` (hash comparison, not expired, not used)
3. Creates auth.users record via `auth.admin.createUser()` with `role_type: 'platform_admin'` metadata
4. Inserts `profiles` record
5. Inserts `user_roles` record (role = `platform_admin`)
6. Creates `platform_admin_profiles` record (defaults: not supervisor, Available)
7. Creates `admin_performance_metrics` record (defaults)
8. Marks access code as used (`is_used=true`, `used_by`, `used_at`)
9. Inserts audit log (event_type = CREATED)
10. Returns success with user_id

### Task 3: Admin Management Edge Function — `manage-platform-admin`

For supervisor CRUD operations on other admins (create without self-registration, update, deactivate):

1. Verifies caller is supervisor via `platform_admin_profiles.is_supervisor`
2. **Create**: Creates auth user + profile + role + metrics + audit log
3. **Update**: Updates profile fields, generates field-level diff for audit log
4. **Deactivate**: Sets Inactive, logs audit, returns pending verification count

### Task 4: Wire Admin Registration in `Register.tsx`

Replace the `TODO(ADMIN-ACCESS)` stub in `onAdminSubmit`:
- Call `register-platform-admin` edge function with form data
- Handle success: toast + redirect to login
- Handle errors: invalid code, expired code, already used code

### Task 5: React Query Hooks

```
src/hooks/queries/
  usePlatformAdmins.ts          — list all, filter by status
  usePlatformAdminProfile.ts    — single by ID + self
  usePlatformAdminAuditLog.ts   — paginated audit log
  useMpaConfig.ts               — module config

src/hooks/mutations/
  useCreatePlatformAdmin.ts     — calls manage-platform-admin edge fn
  useUpdatePlatformAdmin.ts     — calls manage-platform-admin edge fn
  useDeactivatePlatformAdmin.ts — calls manage-platform-admin edge fn
  useUpdateAvailability.ts      — direct Supabase update (self-service)
```

All hooks: explicit column selects (no `select('*')`), `handleMutationError` for errors, proper invalidation keys `['platform-admins', ...]`, `withCreatedBy`/`withUpdatedBy` where applicable.

### Task 6: Shared UI Components

```
src/components/admin/platform-admins/
  AdminStatusBadge.tsx           — color-coded badge per availability_status
  WorkloadBar.tsx                — current/max progress bar
  ExpertiseTags.tsx              — renders industry/country/org-type tags
  IndustryExpertisePicker.tsx    — multi-select from industry_segments
  CountryExpertisePicker.tsx     — multi-select from countries
  OrgTypeExpertisePicker.tsx     — checkbox group (Corporation, LLC, etc.)
  SupervisorFlagToggle.tsx       — toggle with BR-MPA-002 guard
  ExecutiveContactWarningBanner.tsx — shown when md_mpa_config executive_escalation_email is null
```

All components: Tailwind utility classes, `lg:` breakpoint for layout transitions, accessible labels.

### Task 7: Pages — Supervisor Views (SCR-01-01 through SCR-01-04)

**SCR-01-01 — List Page** (`/admin/platform-admins`):
- DataTable with columns: Name, Email, Status (badge), Supervisor (icon), Workload (bar), Actions
- Status filter dropdown, pagination
- ExecutiveContactWarningBanner at top
- Wrapped in `FeatureErrorBoundary`

**SCR-01-02 — Create Page** (`/admin/platform-admins/new`):
- `PlatformAdminForm` with Zod schema validation
- Fields per spec: name, email, phone, supervisor flag, industry/country/org expertise pickers, max verifications, assignment priority
- Calls `useCreatePlatformAdmin` mutation

**SCR-01-03 — Edit Page** (`/admin/platform-admins/:adminId/edit`):
- Same form, email read-only, pre-populated
- Calls `useUpdatePlatformAdmin` mutation

**SCR-01-04 — View Page** (`/admin/platform-admins/:adminId`):
- Tabbed: Profile | Assignment Log (placeholder "Coming in MOD-02") | Audit Log | Performance (placeholder "Coming in MOD-05")
- Audit log tab: paginated table with event_type, actor, timestamp, field/old/new values

Access: Supervisor-only check via `usePlatformAdminSelf()` hook — redirect non-supervisors to My Profile.

### Task 8: Pages — Self-Service Views (SCR-01-05, SCR-01-06)

**SCR-01-05 — My Profile** (`/admin/my-profile`):
- Read-only display of own profile data
- "Update Availability" button → navigates to SCR-01-06

**SCR-01-06 — Availability Settings** (`/admin/availability`):
- Status dropdown (Available / On Leave only for self-service)
- Conditional date pickers when On Leave selected
- LeaveConfirmationModal (MOD-M-08) before confirming leave
- Calls `useUpdateAvailability` mutation

All pages: `FeatureErrorBoundary`, loading/empty/error states, `lg:` responsive transitions.

### Task 9: Modals

**DeactivateAdminModal (MOD-M-05):** Confirmation dialog, shows pending verifications count, requires typed confirmation. Calls `useDeactivatePlatformAdmin`.

**SupervisorFlagModal (MOD-M-06):** Confirmation when toggling supervisor on/off. Guards BR-MPA-002 (last supervisor check).

**LeaveConfirmationModal (MOD-M-08):** Shows leave date range, confirms intent. Guards BR-MPA-001 (last available admin check).

All modals: `DialogContent` with `max-h-[90vh] overflow-y-auto`, standard toast patterns.

### Task 10: Routing & Sidebar Wiring

**Routes in `App.tsx`** (nested under existing `/admin` AdminGuard + AdminShell):
```
platform-admins           → PlatformAdminListPage (lazy)
platform-admins/new       → CreatePlatformAdminPage (lazy)
platform-admins/:adminId  → ViewPlatformAdminPage (lazy)
platform-admins/:adminId/edit → EditPlatformAdminPage (lazy)
my-profile                → MyProfilePage (lazy)
availability              → AvailabilitySettingsPage (lazy)
```

**AdminSidebar.tsx** — Add new sidebar group "Team Management":
- "Platform Admins" (supervisor-only visibility via `usePlatformAdminSelf`)
- "My Profile" (all platform_admin users)

---

## Architecture Compliance Checklist

| Standard | Implementation |
|----------|---------------|
| `has_role()` for all RLS | Yes — no direct `user_roles` queries |
| `withCreatedBy`/`withUpdatedBy` | Yes — in all mutation hooks |
| `handleMutationError` | Yes — in all mutation `onError` callbacks |
| `FeatureErrorBoundary` | Yes — wraps all 6 pages |
| Explicit column selects | Yes — no `select('*')` |
| `lg:` breakpoint transitions | Yes — no `md:flex-row` |
| React Query for server state | Yes — no global state for API data |
| Zod + React Hook Form | Yes — for create/edit forms |
| Hook order compliance | Yes — hooks before conditional returns |
| Toast standards | Yes — entity name + action + duration |
| Structured logging | Yes — `logInfo`/`logWarning` not console.log |
| Service_role for privileged ops | Yes — edge functions only |
| Loading/empty/error/success states | Yes — all screens |

## Deferred Items

| Item | Deferred To |
|------|-------------|
| Assignment Log tab data | MOD-02 |
| Bulk reassignment on deactivate | MOD-02 |
| Performance dashboard link | MOD-05 |
| `pg_cron` leave auto-transition | MOD-03 |
| Welcome email sending | Post-MOD-01 (email infra) |

## Implementation Sequence

Tasks 1 → 2 → 3 → 4 (sequential, DB then edge functions then registration wiring)
Tasks 5 + 6 (parallel, hooks and shared components)
Tasks 7 + 8 + 9 (parallel, pages and modals — depend on 5+6)
Task 10 (final, routing — depends on 7+8+9)

