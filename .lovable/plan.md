

# Plan: Close All Remaining MOD-03 Gaps

## Gap Status Summary

| Gap | Description | Can Close Now? | Reason |
|-----|-------------|----------------|--------|
| GAP-3 | Industry Tags column | **Yes** | Requires new `seeker_org_industries` join table + UI |
| GAP-6 | Org Type column in Open Queue | **Yes** | `organization_type_id` exists on `seeker_organizations` |
| GAP-13 | sla-escalation tier-aware | **Accepted** | Functionally equivalent, no change needed |
| GAP-16 | Return for Correction confirmation | **Yes** | Add modal |
| GAP-17 | Supervisor Reassign bypasses engine | **Yes** | Create RPC |
| GAP-18 | `SELECT *` in useVerificationDetail | **Yes** | Replace with explicit columns |
| GAP-19 | Realtime subscriptions | **Yes** | Add Supabase channel |
| GAP-20 | Navigate after Approve/Reject | **Yes** | Add `onSuccess` navigation |

**7 gaps to close** (GAP-13 accepted as-is).

---

## Implementation

### 1. Database Migration: GAP-3 + GAP-17

**GAP-3: `seeker_org_industries` join table**
```sql
CREATE TABLE seeker_org_industries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES seeker_organizations(id) ON DELETE CASCADE,
  industry_segment_id UUID NOT NULL REFERENCES industry_segments(id),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, industry_segment_id)
);
CREATE INDEX idx_seeker_org_industries_org ON seeker_org_industries(organization_id);
ALTER TABLE seeker_org_industries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins_read_org_industries" ON seeker_org_industries
  FOR SELECT TO authenticated USING (true);
```

Seed industry data for existing test orgs (3-4 per org) using INSERT statements so dashboards show pill chips.

**GAP-17: `supervisor_reassign_to_self` RPC**
```sql
CREATE OR REPLACE FUNCTION supervisor_reassign_to_self(p_verification_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
-- 1. Validate caller is supervisor
-- 2. Close current verification_assignments row (is_current=false, released_at, release_reason)
-- 3. Insert new verification_assignments row for self
-- 4. Update platform_admin_verifications.assigned_admin_id
-- 5. Insert verification_assignment_log entry (SUPERVISOR_REASSIGN)
-- 6. Workload trigger fires automatically
-- Returns {success: true}
$$;
```

### 2. GAP-6: Org Type Column in Both Tabs

**`useMyAssignments` + `useOpenQueue`**: Add `organization_type_id` to org SELECT, fetch `organization_types` table, resolve names into org map.

**`MyAssignmentsTab`**: Add "Org Type" column header + cell.

**`OpenQueueTab`**: Add "Org Type" column header + cell.

### 3. GAP-3: Industry Tags Column in Both Tabs

**`useMyAssignments` + `useOpenQueue`**: After fetching orgs, query `seeker_org_industries` for those org IDs, then resolve `industry_segment_id` → name via `industry_segments`. Attach `industryTags: string[]` to each org in the map.

**Both tabs**: Add "Industry Tags" column rendering up to 2 blue `Badge` pills + "+N" overflow chip.

### 4. GAP-16: Return for Correction Modal

Create `ReturnForCorrectionModal.tsx` — simple confirmation dialog with optional notes textarea. Wire into `VerificationActionBar.tsx` replacing the direct mutation call on line 78.

### 5. GAP-17: Rewrite Supervisor Reassign (UI)

In `VerificationDetailPage.tsx`, replace the raw `supabase.from().update()` in `handleReassignToMe` with `supabase.rpc('supervisor_reassign_to_self', { p_verification_id: id })`. Handle success/error with toast + refetch.

### 6. GAP-18: Replace SELECT * in useVerificationDetail

Replace `.select('*')` on `platform_admin_verifications` (line 151) and `verification_check_results` (line 170) and `verification_assignment_log` (line 176) with explicit column lists.

### 7. GAP-19: Realtime Subscriptions on Dashboard

In `VerificationDashboardPage.tsx`, add a `useEffect` subscribing to Supabase Realtime channels on `platform_admin_verifications` and `open_queue_entries` tables. On any `postgres_changes` event, invalidate the relevant React Query keys. Remove `refetchInterval` from the hooks (Realtime replaces polling).

### 8. GAP-20: Navigate After Approve/Reject/Return

In `VerificationActionBar.tsx`, pass `useNavigate()` and on mutation `onSuccess` for Approve/Reject/Return, call `navigate('/admin/verifications')`.

---

## Files Changed

| File | Changes |
|------|---------|
| New migration SQL | GAP-3 join table, GAP-17 RPC |
| New: `ReturnForCorrectionModal.tsx` | GAP-16 |
| `useVerificationDashboard.ts` | GAP-3 (industry fetch), GAP-6 (org type fetch), GAP-18 (explicit columns), remove `refetchInterval` (GAP-19) |
| `MyAssignmentsTab.tsx` | GAP-3 + GAP-6 columns |
| `OpenQueueTab.tsx` | GAP-3 + GAP-6 columns |
| `VerificationActionBar.tsx` | GAP-16 (modal), GAP-20 (navigate) |
| `VerificationDetailPage.tsx` | GAP-17 (RPC call) |
| `VerificationDashboardPage.tsx` | GAP-19 (Realtime subscription) |

