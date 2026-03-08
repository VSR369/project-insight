

## Wire Auto-Assignment Engine into Seeker Org Registration Flow

### Rules (per BRD + user override)

**BRD Algorithm (Section 3.1) — followed exactly, with one modification:**

| Rule | Source | Detail |
|------|--------|--------|
| **Trigger** | BR-MPA-010 | On `payment_submitted` status, within 5 seconds |
| **Scoring** | BR-MPA-012 | L1 Industry (50pts, hard gate), L2 Country (30pts, wildcard=15), L3 Org Type (20pts, wildcard=10) |
| **2-pass system** | BRD 3.1 | Pass 1: Available only. Pass 2: Available + Partially Available |
| **Tiebreakers** | BRD 3.1 | Total score DESC → Workload ratio ASC → Assignment Priority ASC → Round-robin (oldest `last_assignment_timestamp`) |
| **Fallback** | BRD 3.1 | Open Queue if no candidate scores > 0 on L1 |
| **Supervisor exclusion** | User override | Supervisors (`admin_tier = 'supervisor'`) excluded from candidate pool. They oversee only. |

Senior Admins and Basic Admins compete **equally** — no tier priority between them. This follows the BRD exactly.

### Current State

- `execute_auto_assignment` RPC exists and already implements the BRD 2-pass scoring correctly
- **But** it does NOT exclude supervisors (`admin_tier = 'supervisor'`)
- **And** it is never triggered — no DB trigger fires when `verification_status` changes to `payment_submitted`
- No `platform_admin_verifications` record is created automatically
- The Org Approvals page is a shared inbox with no assignment filtering

### Changes Required

#### 1. Migration: Add Supervisor Exclusion to `execute_auto_assignment`

Add `AND pap.admin_tier != 'supervisor'` to the WHERE clause in the scoring CTE (line 144-147 equivalent). This is a single-line addition to the existing 2-pass engine. No structural change to the algorithm.

Also add the same exclusion to the affinity check (Step 1) so supervisors are never picked via affinity routing either.

#### 2. Migration: Add Supervisor Exclusion to `get_eligible_admins_ranked`

Same `AND pap.admin_tier != 'supervisor'` filter so the Reassign Modal also excludes supervisors from the candidate list.

#### 3. Migration: Create DB Trigger `fn_auto_assign_on_payment_submitted`

A trigger on `seeker_organizations` that fires AFTER UPDATE when `verification_status` changes to `'payment_submitted'`:

1. Creates a `platform_admin_verifications` record for the org (status = `'Pending_Assignment'`, `is_current = true`)
2. Reads the org's `industry_segment_ids` (from `seeker_org_industries`), `hq_country_id`, and `organization_type_id`
3. Calls `execute_auto_assignment(verification_id, industry_segments, hq_country, org_type)`
4. If assignment succeeds: updates the verification record status to `'Under_Verification'`, sets `sla_start_at = NOW()`
5. If fallback (open queue): verification stays as `'Pending_Assignment'`

This is a SECURITY DEFINER function since it needs to read across tables and call the RPC.

#### 4. Frontend: Filter Org Approvals by Assignment (for non-Supervisors)

Update `useSeekerOrgList` hook:
- For Supervisors: continue showing all orgs (shared inbox for oversight)
- For Senior Admins and Admins: show only orgs assigned to them via `platform_admin_verifications`

This requires joining or sub-querying `platform_admin_verifications` to filter by `assigned_admin_id`.

#### 5. Frontend: Add "Unassigned" tab for Supervisors

Add a tab/filter on the Org Approvals page for Supervisors to see orgs in the Open Queue (no admin assigned). This gives them visibility into items needing manual intervention.

### Flow Diagram

```text
Seeker completes payment (BillingForm.tsx)
        │
        ▼
UPDATE seeker_organizations SET verification_status = 'payment_submitted'
        │
        ▼ (DB trigger fires)
        │
   ┌────┴────┐
   │ Create  │  platform_admin_verifications (Pending_Assignment)
   │ record  │
   └────┬────┘
        │
        ▼
   execute_auto_assignment()
   (Supervisors excluded from candidate pool)
        │
   ┌────┴──────────────────────────┐
   │  Pass 1: Available admins     │──► L1 hard gate → Score → Assign
   │  Pass 2: + Partially Avail   │──► L1 hard gate → Score → Assign
   │  Fallback: Open Queue         │──► Supervisor oversight
   └───────────────────────────────┘
        │
        ▼
   Assigned admin gets notification
   Org appears in their verification queue
```

### Files Changed

| Layer | File/Object | Change |
|-------|-------------|--------|
| Migration | `execute_auto_assignment` RPC | Add `admin_tier != 'supervisor'` filter |
| Migration | `get_eligible_admins_ranked` RPC | Add `admin_tier != 'supervisor'` filter |
| Migration | New trigger `fn_auto_assign_on_payment_submitted` | Wire trigger on `seeker_organizations` |
| Frontend | `useSeekerOrgApprovals.ts` — `useSeekerOrgList` | Filter by assigned admin for non-supervisors |
| Frontend | `SeekerOrgApprovalsPage.tsx` | Add "Unassigned" tab for supervisors |

