

# Remediation Plan: Close All RBAC Module Gaps

This plan addresses every full/partial gap and unimplemented feature identified in the QA audit against the BRD (CB-RBAC-2026-001) and Tech Spec (CB-RBAC-2026-001-TS v4.0). Work is organized into 8 phases by priority.

---

## Phase 1: Missing Database Tables & Audit Infrastructure (Foundation)

These are blocking dependencies for multiple downstream features.

### 1A. Create `delegated_soa_scope_audit` table
- **Gap**: Table specified in TS §13.1 / BR-DEL-002 but never created
- **Action**: DB migration to create table with: `soa_id`, `previous_scope` (JSONB), `new_scope` (JSONB), `modified_by`, `orphan_count`, `confirmation_given` (BOOL), `created_at`
- **Wire**: Update `useUpdateDelegatedAdminScope` mutation in `useDelegatedAdmins.ts` to INSERT audit record on every scope change

### 1B. Create `role_domain_tags` table
- **Gap**: TS §13.1 / Design Decision D8 specifies normalized domain tagging per role assignment
- **Current**: Domain tags stored inline as JSONB on `role_assignments.domain_tags`
- **Action**: DB migration to create `role_domain_tags` with: `ra_id` (FK to `role_assignments`), `industry_id`, `sub_domain_id`, `specialty_id`, `proficiency_id`, `dept_id` — all nullable UUIDs
- **Note**: Can be deferred if inline JSONB approach is acceptable; normalized table adds query flexibility but increases write complexity

### 1C. Wire `pending_challenge_refs` into lifecycle
- **Gap**: Table exists in DB but zero frontend/backend usage
- **Action**:
  - Create `usePendingChallengeRefs` hook (INSERT on NOT_READY detection, UPDATE status=Resolved on READY transition)
  - Wire into `RoleReadinessPanel` and `SubmissionBlockedScreen` to show/resolve pending refs
  - Update `role-readiness-notify` Edge Function to create pending refs on NOT_READY dispatch

---

## Phase 2: Missing Business Rule Enforcement (Critical Logic)

### 2A. Supervisor confirmation token for pool member deactivation (BR-PP-002)
- **Gap**: `useDeactivatePoolMember` does simple soft-delete with no `created_by` tier check
- **Action**:
  - In `ResourcePoolPage` / `PoolMemberDetailPage`, check if pool member `created_by` is a Supervisor tier
  - If actor is Senior Admin and member was created by Supervisor: show confirmation modal requiring explicit token/acknowledgment
  - Block deactivation until confirmed

### 2B. 7-day invitation expiry mechanism (BR-RL-009)
- **Gap**: `expires_at` field exists on role_assignments but no enforcement
- **Action**:
  - Create Edge Function `expire-stale-invitations` that queries `role_assignments` and `seeking_org_admins` WHERE `status = 'invited'` AND `invited_at < NOW() - INTERVAL '7 days'`, updates to `expired`
  - Schedule via `pg_cron` daily job
  - Also set `expires_at = NOW() + INTERVAL '7 days'` on all invitation INSERTs

### 2C. Pre-populate previous team suggestion (BR-ASSIGN-002)
- **Gap**: Assignment Panel receives existing assignments but has no "previous org team" suggestion logic
- **Action**:
  - In `AssignMemberModal` or `ChallengeAssignmentPanel`, query `challenge_role_assignments` WHERE `org_id = :orgId` AND `status = 'active'` ORDER BY `assigned_at DESC` to find most recent team
  - Show as "Previously Assigned" suggestion row with current availability badge per SCR-05

### 2D. Concurrent assignment protection — first writer wins (TS §15.2)
- **Gap**: No idempotency key on challenge_role_assignments INSERT
- **Action**:
  - Add `idempotency_key` column (unique, nullable) to `challenge_role_assignments`
  - Generate client-side UUID on confirm, pass in INSERT
  - DB unique constraint returns 409 on duplicate

### 2E. Expert Reviewer lifecycle differentiation (BR-ASSIGN-006)
- **Gap**: No Phase 4 vs Phase 5 reviewer differentiation
- **Action**: Add `assignment_phase` column to `challenge_role_assignments` (enum: `abstract_screening`, `full_evaluation`). UI: show phase selector when assigning R7_MP

### 2F. Platform Admin "Create On Behalf" for core roles (BR-CORE-003)
- **Gap**: No admin-portal form to create R2/R8/R9 on behalf of an org
- **Action**:
  - Create `CreateOnBehalfSheet` component in admin marketplace section
  - Includes org selector + role code selector (R2/R8/R9 only) + user details
  - Audit log records "Created By: Platform Admin on behalf of [Org Name]"
  - Add route and sidebar entry in admin portal

---

## Phase 3: Missing Screens & Modals (UI Gaps)

### 3A. SCR-05b: Fully Booked Alternatives Modal
- **Gap**: Fully Booked members shown greyed out but no "View Alternatives" link/modal
- **Action**: Create `FullyBookedAlternativesModal` — lists alternative available pool members with matching domain tags, "Select" button per row

### 3B. SCR-05c: No Available Members Alert (3-option)
- **Gap**: Current "no available members" message is plain text with generic advice
- **Action**: Create `NoAvailableMembersAlert` modal with 3 option cards:
  1. "Broaden Domain Match" — clears domain filters
  2. "Wait for Availability (set reminder)" — logs reminder
  3. "Escalate to Supervisor" — if actor is Senior Admin

### 3C. SCR-06: Assignment Confirmation Screen (standalone)
- **Gap**: Confirm button exists but no standalone summary screen
- **Action**: Create `AssignmentConfirmationScreen` showing challenge title, org name, table of confirmed assignments (Role | Member | Industry | Availability), "Confirm" and "Back" buttons

### 3D. SCR-14: Edit Scope Side-Sheet with before/after comparison
- **Gap**: `EditDelegatedAdminPage` exists but doesn't show side-by-side scope comparison
- **Action**: Add two-column layout — "Current Scope" (greyed, read-only) vs "Proposed New Scope" (editable). Orange badge showing orphan count when narrowing detected

### 3E. SCR-16: Delegated SOA List as dedicated tab view
- **Gap**: Delegated admin list exists in org dashboard but not as a dedicated tab in Role Management
- **Action**: Add "Delegated Admins" tab to `RoleManagementDashboard` (alongside Core Roles and Aggregator Roles tabs) showing the delegated admin table with Edit Scope and Deactivate actions

### 3F. SCR-16a: Delegated SOA Limit Warning (80%/100%)
- **Gap**: No visual warning for approaching/reaching delegated admin limit
- **Action**:
  - In `CreateDelegatedAdminPage`, query count of delegated admins for org
  - At 80%: amber toast "You are at 80% of your Delegated Admin limit (8/10)"
  - At 100%: disable "Add" button with tooltip "Limit reached", error toast
  - Show usage bar below the Add button

### 3G. SCR-15: Deactivation Check Confirmation (full flow)
- **Gap**: Orphan modal exists but not the full deactivation check confirmation flow
- **Action**: Before showing orphan modal, show intermediate confirmation: "Are you sure you want to deactivate [Admin Name]?" with role impact summary. Then proceed to Reassignment Wizard if orphans detected

---

## Phase 4: Code Quality & Standards Compliance

### 4A. Replace raw `console.error` with structured logging
- **Files**: `useSeekerOrgApprovals.ts` (lines 208, 224)
- **Action**: Replace with `handleMutationError()` or `logWarning()` per TS §6.1

### 4B. Consolidate duplicate hooks in `useSlmRoleCodes.ts`
- **Gap**: `useOrgCoreRoles()` and `useCoreRoleCodes()` are identical
- **Action**: Remove `useOrgCoreRoles()`, update all consumers to use `useCoreRoleCodes()`

### 4C. Consolidate `useSlmPoolRoles()` vs `useChallengeRoleCodes("mp")`
- **Gap**: Nearly identical but subtle `both` handling difference
- **Action**: Keep `useChallengeRoleCodes(model)` as the canonical parameterized hook, remove `useSlmPoolRoles()`

### 4D. Extract shared mapping logic in `useSolutionRequests.ts`
- **Gap**: Duplicate `challenge_role_assignments` JOIN mapping in `useChallengeAssignments()` and `useAllChallengeAssignments()`
- **Action**: Extract `mapChallengeAssignment()` shared function

### 4E. Rename `ReassignmentWizard` disambiguation
- **Gap**: Name collision between delegated admin orphan wizard and mid-challenge reassignment
- **Action**: Rename `src/components/rbac/ReassignmentWizard.tsx` to `DelegatedAdminReassignmentWizard.tsx`

---

## Phase 5: Security & Auth Enforcement

### 5A. MFA enforcement for admin roles (TS §0.3)
- **Gap**: No MFA check anywhere in RBAC pages
- **Action**: Add MFA status check in `AuthGuard` or a new `MfaGuard` wrapper. For Platform Admin (all tiers), Primary SOA, Delegated SOA, Finance Coordinator, Innovation Director — redirect to MFA setup if not enabled
- **Note**: Requires Supabase Auth MFA configuration

### 5B. Rate limiting on role endpoints (TS §7.2)
- **Gap**: No rate limiting — spec requires 60 req/min per authenticated user
- **Action**: Implement via Edge Function middleware or Supabase config. Not achievable purely in frontend — document as infrastructure task

---

## Phase 6: Notification Engine Gaps

### 6A. Notification dispatch retries with exponential backoff (TS §15.3)
- **Gap**: `role-readiness-notify` Edge Function has no retry mechanism
- **Action**: Add retry logic (up to 3 attempts) with exponential backoff in the Edge Function. Log failures in a `notification_log` table

### 6B. NOT_READY notification routing to in-scope Delegated SOAs (BR-AGG-005)
- **Gap**: Notification currently goes to Primary SOA only
- **Action**: In `role-readiness-notify`, query `seeking_org_admins` WHERE `org_id` AND `admin_tier = 'DELEGATED'` AND `status = 'active'`, filter by `domain_scope` overlap with challenge domain, dispatch to all matching

### 6C. READY transition auto-notification to Challenge Creator (BR-CORE-007)
- **Gap**: `pending_challenge_refs` not wired; no auto-notification on READY
- **Action**: DB trigger on `role_readiness_cache` — when `overall_status` changes from NOT_READY to READY, call Edge Function to notify Challenge Creator and resolve pending_challenge_refs

---

## Phase 7: API Layer Formalization

### 7A. Role Readiness API Edge Function (API-18)
- **Gap**: Data exists in `role_readiness_cache` but no formal GET endpoint for CLM consumption
- **Action**: Create Edge Function `role-readiness-api` that implements `GET /role-readiness/:org_id/:model` returning the exact contract from TS §14.2

### 7B. Admin Contact API (API-19, API-22)
- **Gap**: Contact data stored but no formal API endpoint
- **Action**: Expose via the same Edge Function or a separate one

---

## Phase 8: Remaining Edge Cases & Polish

### 8A. Session expired mid-assignment recovery (TS §15.2)
- Preserve form data in `sessionStorage` on JWT expiry, restore after re-login

### 8B. Duplicate invitation check (EC-11)
- Before creating role assignment, check if email already has Active assignment for same role+org, return 409

### 8C. Cross-org data access returns 404 not 403 (TS §15.2)
- Verify RLS policies return empty results (appearing as 404) rather than explicit 403 for cross-org queries

---

## Implementation Priority Order

```text
Phase 1 (Foundation)     → 1A, 1C (1B can defer)
Phase 2 (Critical Logic) → 2A, 2B, 2C, 2F
Phase 3 (UI Gaps)        → 3A, 3B, 3E, 3F, 3D
Phase 4 (Code Quality)   → 4A–4E (quick wins)
Phase 5 (Security)       → 5A
Phase 6 (Notifications)  → 6A, 6B, 6C
Phase 7 (API)            → 7A, 7B
Phase 8 (Polish)         → 8A, 8B, 8C
```

## Estimated Scope

- **DB migrations**: 3 (delegated_soa_scope_audit, role_domain_tags, pending_challenge_refs columns)
- **New Edge Functions**: 2 (expire-stale-invitations, role-readiness-api)
- **Updated Edge Functions**: 1 (role-readiness-notify)
- **New components**: ~8 (modals, sheets, screens)
- **Modified components**: ~12
- **New/modified hooks**: ~5

