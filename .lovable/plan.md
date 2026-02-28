

## Compliance Gaps — Seeker Org Approvals Module

### Gap 1: Error handling uses raw `toast.error` instead of `handleMutationError`
**Violation:** Section 11.5 (Console Usage Rules), Section 25 (Anti-Patterns)
**Files:** `useSeekerOrgApprovals.ts` — all 6 mutations use `toast.error(...)` in `onError` instead of `handleMutationError(error, { operation: "..." })`
**Fix:** Replace all `onError` callbacks with `handleMutationError` from `@/lib/errorHandler`.

### Gap 2: Mutations missing `withCreatedBy` / `withUpdatedBy` audit utilities
**Violation:** Section 24.1 (Audit Fields Utility), Section 27 (Code Review Checklist)
**Files:** `useSeekerOrgApprovals.ts` — `useApproveOrg`, `useRejectOrg`, `useApproveDocument`, `useRejectDocument` all inline `supabase.auth.getUser()` instead of using the centralized `withUpdatedBy()` from `@/lib/auditFields.ts`.
**Fix:** Replace inline user fetching with `withUpdatedBy()` calls. Also add `updated_at` timestamp to reject mutation.

### Gap 3: `useRejectOrg` does not persist `rejection_reason`
**Violation:** Business logic gap — the rejection reason is collected in the dialog but never stored in the database update.
**Fix:** Add `rejection_reason: reason` to the `.update()` call. Also add `updated_by` and `updated_at` fields.

### Gap 4: Missing `updated_at` on several mutations
**Violation:** Section 2.2 (Mandatory Fields)
**Files:** `useApproveOrg` and `useRejectOrg` do not set `updated_at`. `useApproveDocument` and `useRejectDocument` do not set `updated_at`.
**Fix:** Include `updated_at: new Date().toISOString()` in all update payloads (handled automatically via `withUpdatedBy`).

### Gap 5: `AdminCredentialsCard` generates temp password on every render
**Violation:** Security concern — `Date.now()` makes password non-deterministic across re-renders, and it's generated client-side without any real credential management.
**Fix:** Use `useMemo` to stabilize the generated password within a session. Add a comment noting this is a placeholder until proper credential management is implemented.

### Gap 6: `AdminCredentialsCard` passes `user_id` as `adminEmail`
**Violation:** Data integrity — line 67 sends `adminUser.user_id` (a UUID) as `adminEmail`. The edge function expects an email address.
**Fix:** Fetch the admin user's email from the `org_users` join or add an email field lookup. The `org_users` table likely has or references the auth email — need to resolve this correctly.

### Gap 7: Missing `any` type usage — no TypeScript interfaces
**Violation:** Section 22.2 (Variable Naming), Section 27 (TypeScript types/interfaces defined)
**Files:** All card components use `any` for props (`org: any`, `contacts: any[]`, `compliance: any`, etc.). No shared types defined.
**Fix:** Create `src/pages/admin/seeker-org-approvals/types.ts` with interfaces for `SeekerOrg`, `SeekerContact`, `SeekerCompliance`, `SeekerSubscription`, `SeekerBilling`, `SeekerDocument`, `OrgUser`.

### Gap 8: `SeekerOrgApprovalsPage` list has no pagination
**Violation:** Section 4.4 (Pagination Mandatory for All List Endpoints), Section 16.2 (Pagination mandatory)
**Fix:** Add client-side pagination to the table (page size 20). The query currently fetches all orgs without limit.

### Gap 9: Missing `ComplianceDetailCard` fields from registration
**Violation:** Feature completeness — the compliance card does not show Tax ID, DUNS Number, NDA Preference, Export Control Status, or Data Residency (fields collected in registration Step 3).
**Fix:** Add `tax_id`, `duns_number`, `nda_preference`, `export_control_status_id`, `data_residency_id` fields. Resolve IDs to names where applicable.

### Gap 10: Missing Error Boundary wrapping
**Violation:** Section 11.4 (Error Boundary Pattern), Section 27 (Error boundaries wrap features)
**Fix:** Wrap `SeekerOrgReviewPage` content in a `FeatureErrorBoundary`.

### Gap 11: Dialog components missing `max-h-[90vh] overflow-y-auto`
**Violation:** Section 7.3 (Dialog/Modal Pattern), Section 9.3 (Mandatory Patterns)
**Files:** `RejectOrgDialog.tsx`, `RejectDocumentDialog.tsx` — `DialogContent` missing responsive overflow handling.
**Fix:** Add `max-h-[90vh] flex flex-col overflow-hidden` to `DialogContent`.

### Gap 12: Approve button has no confirmation
**Violation:** UX best practice — destructive/irreversible state change (verification) happens with a single click, no confirmation.
**Fix:** Add an `AlertDialog` confirmation before approving an organization.

---

## Implementation Plan

### Step 1: Create TypeScript interfaces
Create `src/pages/admin/seeker-org-approvals/types.ts` with proper interfaces for all data shapes used across card components.

### Step 2: Fix `useSeekerOrgApprovals.ts` hooks
- Replace all `onError: (error) => toast.error(...)` with `handleMutationError(error, { operation: "..." })`
- Replace inline `supabase.auth.getUser()` with `withUpdatedBy()` from `@/lib/auditFields`
- Add `rejection_reason` to `useRejectOrg` mutation
- Add `updated_at` to all update mutations
- Add query limit to `useSeekerOrgList`

### Step 3: Fix `AdminCredentialsCard`
- Stabilize temp password with `useMemo`
- Fix `adminEmail` to use actual email instead of UUID (fetch from profiles or contacts)

### Step 4: Enhance `ComplianceDetailCard`
- Add missing fields: Tax ID, DUNS, NDA Preference, Export Control Status, Data Residency

### Step 5: Add pagination to `SeekerOrgApprovalsPage`
- Add simple client-side pagination (20 items per page)

### Step 6: Add dialog overflow patterns and confirmation
- Fix `RejectOrgDialog` and `RejectDocumentDialog` with proper `max-h-[90vh]` pattern
- Add `AlertDialog` confirmation for Approve action

### Step 7: Add Error Boundary
- Wrap review page content in `FeatureErrorBoundary`

### Step 8: Apply types to all card components
- Replace `any` props with proper interfaces from `types.ts`

