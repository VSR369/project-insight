
Goal: stop the “save fails everywhere / RLS error” loop by fixing shared authorization defects, not one-off UI patches.

What I confirmed from code + DB:
1) Not all failures are RLS: current System Config save example is a business-rule failure (`SLA_TIER_ORDER_VIOLATION`), not policy denial.
2) There is a real cross-screen RLS root cause in admin flows:
   - `platform_admin_profiles` write policies still require `is_supervisor = true`.
   - Current supervisor account has `admin_tier='supervisor'` but `is_supervisor=false`.
   - Result: UPDATE/INSERT/DELETE on admin profile paths fail with RLS.
3) Additional policy defect: `admin_notifications` INSERT policy has `WITH CHECK false` (hard deny), which can break notification-related writes.
4) `md_mpa_config` has `supervisor_modify_config USING false` (intended RPC-only), so any direct table update path will fail by design.

5 Whys (condensed):
1. Why saves fail? RLS blocks write operations.
2. Why RLS blocks? Policies and data model are inconsistent.
3. Why inconsistent? Migration introduced `admin_tier`, but critical write policies still key off legacy `is_supervisor`.
4. Why repeated? UI/mutations still mix direct table writes + RPCs, so one policy mismatch impacts many screens.
5. Why not caught earlier? No module-wide write-policy audit and no standardized “RPC-only for privileged writes” enforcement.

Implementation plan:
Phase 1 — Policy/data consistency fix (root cause)
- Add a security-definer helper (e.g., `is_supervisor_tier(auth.uid())`) using `admin_tier='supervisor'` (optionally OR legacy flag).
- Replace `platform_admin_profiles` write policies (`supervisor_insert/update/delete_profiles`) to use helper instead of `is_supervisor=true`.
- Data repair migration: backfill/sync `is_supervisor` from `admin_tier` to remove mixed state.

Phase 2 — Fix known policy hard-blockers
- Correct `admin_notifications` INSERT policy from `WITH CHECK false` to explicit allowed condition (or remove client insert path and make notifications RPC/edge-only).
- Keep `md_mpa_config` RPC-only policy, but verify no remaining direct updates to this table in frontend.

Phase 3 — “All screens” write audit (systematic)
- Build a write matrix from code (`insert/update/delete/rpc`) and verify each target table has valid SELECT/INSERT/UPDATE/DELETE policies with proper `TO authenticated` and correct `WITH CHECK`.
- Priority tables from failing modules:
  - Admin Management: `platform_admin_profiles`, `reassignment_requests`, `open_queue_entries`, `verification_check_results`
  - Seeker Approvals: `seeker_organizations`, `seeker_org_documents`, `seeker_billing_info`, `seeking_org_admins`
  - Config: `md_mpa_config` (RPC-only), `md_system_config`
- Standardize privileged writes to RPC/edge functions where possible (reduce direct-RLS fragility).

Phase 4 — UX/error clarity
- Normalize mutation errors to distinguish:
  - `RLS/permission denied`
  - `business validation` (like SLA ordering)
  - `constraint/data` issues
- This prevents users from seeing every failure as “RLS”.

Validation plan (must pass before closing):
1) Supervisor account can perform admin profile writes (create/update/deactivate, availability changes).
2) Verification actions (claim/release/check updates/reassignment decisions) persist successfully.
3) Seeker approval actions (approve/reject/return/reinstate, document/billing actions) persist successfully.
4) System Config:
   - valid values save,
   - invalid SLA ordering shows business-rule error (not RLS).
5) End-to-end regression in Preview + Published with the same test identities.

Technical notes:
- Main SQL touchpoints: `platform_admin_profiles` policies, `admin_notifications` INSERT policy, consistency backfill.
- Keep role checks server-side (`has_role`/helper functions); do not rely on client role state.
- Use explicit per-command policies and `WITH CHECK` for INSERT/UPDATE safety.
