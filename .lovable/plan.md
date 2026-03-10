

# Implementation Plan: RBAC Module — MOD-01 Resource Pool Management (Screens from Screenshots)

## Scope Assessment

The BRD and Tech Spec cover **7 modules, 30 screens, 22 API endpoints, and 12 database tables**. This is far too large for a single implementation pass. Based on the 3 screenshots you provided, I will focus on **MOD-01: Platform Admin Hierarchy & Resource Pool Management** first — the screens you are showing me.

### Screens to Build (from your screenshots)

| Screen | Description | Screenshot |
|--------|-------------|------------|
| **SCR-01** | Resource Pool Dashboard (image-262) — KPI cards, Management Consoles, Recent Activity | Dashboard view |
| **SCR-01b** | Resource Pool List (image-263) — Data table with filters, availability badges, edit/delete actions | Table view |
| **SCR-02** | Add/Edit Pool Member Form (image-264) — Full Name, Email, Phone, Role checkboxes, Industry chips, Proficiency dropdown | Side-sheet form |

---

## Phase 1: Database Foundation

### New Tables (Migration)

1. **`platform_provider_pool`** — Pool members with `role_codes[]`, `industry_ids[]`, `proficiency_id`, `max_concurrent`, `current_assignments`, `availability_status`, audit fields, soft delete
2. **`challenge_role_assignment`** — Per-challenge assignments (needed for availability tracking)
3. **`role_audit_log`** — Append-only audit trail for all pool changes
4. **`md_proficiency_levels`** — Master data for proficiency (if not existing)
5. **`md_slm_role_codes`** — Reference table for R3, R5_MP, R6_MP, R7_MP

### RLS Policies
- All tiers can SELECT pool members
- Only Supervisor + Senior Admin can INSERT/UPDATE
- Basic Admin is read-only (BR-PP-003)

### DB Functions
- `recalculate_availability_status()` — trigger on assignment changes (BR-AVAIL-001)
- Availability logic: Available (assignments < max), Partially Available (assignments = max - 1), Fully Booked (assignments >= max) (BR-POOL-002)

---

## Phase 2: Hooks & Data Layer

| Hook | Purpose |
|------|---------|
| `usePoolMembers(filters)` | Fetch pool list with role/industry/proficiency/availability filters. staleTime: 5min |
| `useCreatePoolMember()` | INSERT mutation with audit fields, invalidates pool-members query |
| `useUpdatePoolMember()` | UPDATE mutation with before/after audit logging |
| `useDeactivatePoolMember()` | Soft delete with Supervisor confirmation check (BR-PP-002) |
| `usePoolPermissions()` | Returns `{ canWrite }` based on caller tier — false for Basic Admin |
| `useProficiencyLevels()` | Master data hook for proficiency dropdown |
| `usePoolKpiStats()` | KPI aggregates for dashboard cards (active count, pending requests, role readiness, delegated admin count) |
| `useRecentPoolActivity()` | Recent audit log entries for dashboard feed |

### Zod Schema
```
poolMemberSchema: full_name, email, phone (optional), 
  role_codes (array of R3|R5_MP|R6_MP|R7_MP, min 1),
  industry_ids (UUID[], min 1), 
  proficiency_id (UUID, required),
  max_concurrent (int, 1-20)
```

---

## Phase 3: UI Components

### SCR-01 — Marketplace Dashboard (image-262)
- **Route**: `/admin/marketplace` (new sidebar section "MARKETPLACE")
- **Sidebar**: Dark navy (#1E3A5F) with items: Dashboard, Resource Pool, Solution Requests, Role Management, Delegated Admins, Email Templates, Knowledge Centre
- **KPI Cards** (4): Active Pool Members, Pending Requests, Role Readiness (x/y), Delegated Admins — with trend arrows and sub-labels
- **Management Consoles** (4 cards): Resource Pool, Solution Requests, Role Management, Delegated Admins — each with description and count badge
- **Recent Activity** timeline: Audit log entries with icons, timestamps, descriptions

### SCR-01b — Resource Pool List (image-263)
- **Route**: `/admin/marketplace/resource-pool`
- **Breadcrumb**: Platform Admin > Resource Pool
- **Filter bar**: 4 dropdowns — All Roles, All Industries, All Proficiency Levels, All Availability
- **Data table columns**: Full Name, Assigned Roles (colored pill badges), Industry Segments (grey tags), Proficiency, Active (count), Max (count), Availability (color-coded badge), Actions (edit/delete)
- **Availability badges**: Green "Available", Amber "Partially Available", Red "Fully Booked"
- **"+ Add Pool Member" button**: Top-right, hidden for Basic Admin (BR-PP-003)
- **Empty state**: Illustration + "No pool members added yet"

### SCR-02 — Add/Edit Pool Member Form (image-264)
- **Type**: Side-sheet (slide from right) or full-page form as shown
- **Fields**: Full Name, Email, Phone (+country prefix), Role(s) (checkbox group: Challenge Architect, Challenge Curator/MP, Innovation Director/MP, Expert Reviewer/MP — min 1 required), Industry Segment(s) (multi-select chip selector from master data), Proficiency Level (single dropdown), Max Concurrent Challenges (number, min 1)
- **Validation**: Zod schema, red asterisks on required fields, inline errors
- **Save**: Disabled until valid. On success: toast "Pool member [Name] added successfully", close form, invalidate query
- **Edit mode**: Email locked with padlock icon

---

## Phase 4: Business Rules Enforcement

| Rule | Implementation |
|------|---------------|
| BR-PP-001 | Supervisor: full CRUD on all pool members |
| BR-PP-002 | Senior Admin cannot deactivate Supervisor-created members without confirmation token |
| BR-PP-003 | Basic Admin: read-only — hide Add button, disable edit/delete actions |
| BR-PP-004 | Mandatory: role + industry + proficiency before save |
| BR-PP-005 | Audit log: created_by recorded, edits log before/after |
| BR-POOL-002 | Real-time availability badge recalculation |
| BR-POOL-003 | Filter/sort by role, industry, proficiency, availability |
| BR-AVAIL-003 | Max concurrent per person, not global |

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/migrations/xxx_rbac_pool_tables.sql` | Create tables, enums, RLS, indexes, triggers |
| `src/lib/validations/poolMember.ts` | Zod schema |
| `src/hooks/queries/usePoolMembers.ts` | CRUD hooks |
| `src/hooks/queries/useProficiencyLevels.ts` | Master data hook |
| `src/hooks/usePoolPermissions.ts` | Permission check based on tier |
| `src/pages/admin/marketplace/MarketplaceDashboard.tsx` | SCR-01 dashboard |
| `src/pages/admin/marketplace/ResourcePoolPage.tsx` | SCR-01b list + filters |
| `src/components/admin/marketplace/PoolMemberTable.tsx` | Data table component |
| `src/components/admin/marketplace/PoolMemberForm.tsx` | Add/Edit form (SCR-02) |
| `src/components/admin/marketplace/PoolFilterBar.tsx` | Filter dropdowns |
| `src/components/admin/marketplace/AvailabilityBadge.tsx` | Color-coded badge |
| `src/components/admin/marketplace/RoleBadge.tsx` | Colored role pill badges |
| `src/components/admin/marketplace/MarketplaceSidebar.tsx` | Sidebar navigation (or extend existing) |
| `src/App.tsx` | Add marketplace routes |
| `src/pages/admin/AdminDashboard.tsx` | Add Marketplace section link |

---

## What is NOT in this phase (future phases)

- **MOD-02**: Challenge Assignment Panel (SCR-04 to SCR-07)
- **MOD-03**: Delegated SOA Management (SCR-13 to SCR-16) — partially exists
- **MOD-04**: Core Role Management (SCR-08, SCR-09)
- **MOD-05**: AGG Role Setup (SCR-10, SCR-10a)
- **MOD-06**: Role Readiness API & Notifications (SCR-11, SCR-12)
- Edge Functions for notifications
- Email templates (NOT_READY, READY)

These will be implemented in subsequent phases after MOD-01 is validated.

