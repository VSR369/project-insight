

# MOD-06 Gap Analysis — Final Review

## Verified as Complete (No Issues)

All previously identified 13 gaps have been addressed. The following are fully implemented:
- TABLE-06-01, RLS policies, validation trigger
- `reassign_verification` RPC with IP logging, config lookup, BR-MPA-040/043/045
- `place_in_open_queue` RPC (EC-06-11)
- `bulk_reassign_admin` RPC with assignment method override
- `on_admin_leave` trigger via `fn_trigger_bulk_reassign`
- `request_reassignment` updated to INSERT into `reassignment_requests`
- `bulk-reassign` edge function with notifications
- SCR-06-01 inbox, SCR-06-02 extensions, MOD-M-04, MOD-M-05
- All hooks, sidebar badge, routing

---

## Remaining Gaps Found

### GAP-A: Duplicate/Conflicting RPC Definitions (CRITICAL)

Two migrations define `reassign_verification` and `bulk_reassign_admin`:
- Migration 1 (`20260308081937`): Original definitions — `reassign_verification` has `p_requesting_admin_id, p_supervisor_id` params, hardcoded max, no IP. `bulk_reassign_admin` calls `execute_auto_assignment(v_rec.verification_id)` with one arg.
- Migration 2 (`20260308125205`): Gap-fix overwrite — `reassign_verification` has `p_ip_address`, config lookup, different column names (`admin_id` vs `assigned_admin_id`). `bulk_reassign_admin` calls `execute_auto_assignment(v_rec.id, p_departing_admin_id)` with two args.

The second migration wins at deploy time. However:
1. **The gap-fix `reassign_verification` uses different column names** than the original (`admin_id` vs `assigned_admin_id` in `verification_assignments`). Need to verify which column actually exists.
2. **The gap-fix `bulk_reassign_admin` calls `execute_auto_assignment` with 2 args** but the actual function signature requires `(UUID, UUID[], UUID, TEXT)` — 4 params. This call will fail at runtime.
3. **The gap-fix `reassign_verification` inserts into `verification_assignment_log` with `(verification_id, event_type, from_admin_id, to_admin_id, reason, initiator, created_at)`** but the original uses `(verification_id, event_type, initiator, from_admin_id, to_admin_id, reason, scoring_snapshot, created_at)`. The column order mismatch means different schemas are assumed.

**The original migration's `reassign_verification` (which matches the hook's parameters) is being overwritten by the gap-fix version that has incompatible column assumptions.** The `useReassignVerification` hook calls the RPC with params `(p_verification_id, p_to_admin_id, p_reason, p_initiator, p_trigger, p_ip_address)` which matches the gap-fix signature, so the hook is consistent with the final RPC.

**Fix needed**: Reconcile the gap-fix `bulk_reassign_admin` to call `execute_auto_assignment` with the correct 4-parameter signature. Verify column names in `verification_assignments` (`admin_id` vs `assigned_admin_id`).

### GAP-B: `execute_auto_assignment` Signature Mismatch

`execute_auto_assignment` requires `(p_verification_id UUID, p_industry_segments UUID[], p_hq_country UUID, p_org_type TEXT)`. The gap-fix `bulk_reassign_admin` calls it as `execute_auto_assignment(v_rec.id, p_departing_admin_id)` — passing a UUID as `p_industry_segments UUID[]`. This will cause a **runtime type error** for every bulk reassignment.

The original migration's `bulk_reassign_admin` calls `execute_auto_assignment(v_rec.verification_id)` with one arg, which also doesn't match the 4-param signature.

**Fix**: Inside `bulk_reassign_admin`, fetch the verification's org context (industry segments, HQ country, org type) and pass all 4 params. Add a `p_skip_admin_id` parameter to `execute_auto_assignment` to exclude the departing admin.

### GAP-C: `industrySegmentIds` and `industryNames` Never Populated

`VerificationDetailPage` passes `(verification as any).industrySegmentIds` and `(verification as any).industryNames` to `SupervisorReassignModal`, but `useVerificationDetail` never fetches industry segments from `seeker_org_industries` or resolves names. These will always be empty arrays, so the modal's eligible admins query gets no industry context and the org summary shows no industry chips.

**Fix**: In `useVerificationDetail`, fetch `seeker_org_industries` for the org and resolve segment names from `industry_segments` table. Add `industrySegmentIds` and `industryNames` to the returned verification object.

### GAP-D: `currentAdminAvailability` and `currentAdminPendingCount` Not Passed from Inbox

`ReassignmentInboxPage` opens `SupervisorReassignModal` but does not pass `currentAdminName`, `currentAdminAvailability`, or `currentAdminPendingCount`. The modal supports these props but they're never populated from the inbox entry point.

**Fix**: Pass `currentAdminName` from `request.requesting_admin?.full_name`, `currentAdminAvailability` from `request.requesting_admin?.availability_status`. For `currentAdminPendingCount`, the `useReassignmentRequests` hook would need to fetch `current_active_verifications` from the requesting admin's profile.

### GAP-E: `useReassignmentRequests` Missing `current_active_verifications` for Requesting Admin

The hook fetches `full_name, availability_status` from `platform_admin_profiles` but not `current_active_verifications`, which is needed for the "Current Admin" row in MOD-M-04.

**Fix**: Add `current_active_verifications` to the admin profile select.

### GAP-F: `isFullyLoaded` Not Passed to `AssignedStateBanner`

`VerificationDetailPage` renders `AssignedStateBanner` for STATE 2 but never passes `isFullyLoaded`. The Fully Loaded guard (EC-06-09) on "Reassign to Me" is always enabled regardless of the supervisor's actual workload.

**Fix**: In `useVerificationDetail`, return `currentAdminProfile` with `current_active_verifications` and `max_concurrent_verifications`. Pass `isFullyLoaded` computed from these.

### GAP-G: Supervisor Filter in `bulk-reassign` Edge Function

Line 84: `.or("admin_tier.eq.supervisor,is_supervisor.eq.true")` — this may fail if `is_supervisor` column doesn't exist or returns unexpected results. Should use a single consistent check.

**Fix**: Use `.eq('admin_tier', 'supervisor')` only (matching the pattern used in all RLS policies).

---

## Implementation Plan

### Phase 1: Database Migration (GAP-A, GAP-B)

1. **Reconcile `bulk_reassign_admin`**: Fetch org context per verification, call `execute_auto_assignment` with correct 4 params. Add `p_skip_admin_id UUID DEFAULT NULL` parameter to `execute_auto_assignment` and filter out that admin in the candidate query.
2. **Verify column names** in `reassign_verification` gap-fix against actual `verification_assignments` schema (likely `assigned_admin_id` based on original migration).

### Phase 2: Hook Fixes (GAP-C, GAP-D, GAP-E, GAP-F)

1. **`useVerificationDetail`**: Fetch `seeker_org_industries` + resolve `industry_segments` names. Add to returned verification object. Also return supervisor's own workload for `isFullyLoaded`.
2. **`useReassignmentRequests`**: Add `current_active_verifications` to admin profile select.
3. **`ReassignmentInboxPage`**: Pass `currentAdminName`, `currentAdminAvailability`, `currentAdminPendingCount` to modal.
4. **`VerificationDetailPage`**: Pass `isFullyLoaded` to `AssignedStateBanner`. Remove `(verification as any)` casts once industry data is properly typed.

### Phase 3: Edge Function Fix (GAP-G)

1. Update supervisor filter to use `.eq('admin_tier', 'supervisor')` consistently.

---

## Summary

| Gap | Severity | Description |
|-----|----------|-------------|
| GAP-A | CRITICAL | Conflicting RPC column assumptions between migrations |
| GAP-B | CRITICAL | `execute_auto_assignment` called with wrong params — runtime failure |
| GAP-C | High | Industry context never fetched for eligible admins ranking |
| GAP-D | Medium | Current admin info not passed from inbox to modal |
| GAP-E | Medium | Missing `current_active_verifications` in request query |
| GAP-F | Medium | `isFullyLoaded` guard not wired on detail page |
| GAP-G | Low | Inconsistent supervisor filter in edge function |

