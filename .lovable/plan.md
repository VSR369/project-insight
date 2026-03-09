

## Critical Business Analysis: Two Assignment Modes for Org Verification

### The Problem You've Identified (Correctly)

The auto-assignment engine with domain scoring (L1/L2/L3 weights, workload ratios, priority, round-robin) is designed for **scale** -- 10+ admins, hundreds of orgs per month. Today, you have 1-2 basic admins. The scoring engine is overengineered for current volume and creates friction:

- Admins can only see orgs assigned to them (restrictive)
- If expertise data is incomplete, the engine fails to match and pushes to Open Queue
- Manual supervisor intervention needed for queue items
- No flexibility for a small team to just "pick and work"

### The Two Modes (Business Perspective)

| Aspect | Mode 1: Auto-Assignment | Mode 2: Open Claim (First-Come-First-Served) |
|--------|------------------------|----------------------------------------------|
| **When it fits** | 5+ admins, high volume, domain expertise matters | 1-3 admins, low volume, everyone is generalist |
| **Fairness** | Engine distributes evenly by score + workload | Self-selection; risk of cherry-picking |
| **Speed** | Immediate (trigger-based, <5s) | Admin-driven; depends on responsiveness |
| **Concurrency risk** | None (engine picks one admin) | Two admins could open the same org simultaneously |
| **Oversight burden** | Low (automated) | Low (less infrastructure) |
| **Complexity** | High (scoring, SLA, fallback queue) | Low (just a lock mechanism) |

### Concurrency Problem in Open Claim Mode

**The risk:** Admin A and Admin B both see "Testing Org" in `payment_submitted`. Both click to review. The current `SeekerOrgReviewPage` auto-transitions the org to `under_verification` on open. Without a lock, both admins start working on the same org.

**Solution: Atomic Claim-on-Open**

Replace the current `useStartVerification` (which just updates status) with an atomic RPC:

```text
claim_verification_for_review(p_org_id, p_admin_id)
  → UPDATE seeker_organizations
    SET verification_status = 'under_verification',
        verification_started_at = NOW()
    WHERE id = p_org_id
      AND verification_status = 'payment_submitted'  -- Only if still unclaimed
    RETURNING id;
```

If the UPDATE returns 0 rows, another admin already claimed it. The UI shows: "This organization is already being reviewed by [Admin Name]."

This is a **database-level optimistic lock** -- no race condition possible.

### How the Config Toggle Works

Add a new parameter to `md_mpa_config`:

| Key | Value | Description |
|-----|-------|-------------|
| `org_verification_assignment_mode` | `auto_assign` or `open_claim` | Controls whether orgs are auto-assigned or published for claiming |

Supervisor configures this on the System Config page. The system reads it at two decision points:

1. **On `payment_submitted` trigger**: If `auto_assign` -- run scoring engine. If `open_claim` -- skip engine, leave org visible to all admins.
2. **On admin opening an org**: If `open_claim` -- run atomic claim RPC. If `auto_assign` -- org is already assigned, just open it.

### Implementation Plan

#### 1. Migration: Add config parameter

Insert `org_verification_assignment_mode` into `md_mpa_config` with default `open_claim` (since you're starting small). Supervisor can switch to `auto_assign` when the team grows.

#### 2. Migration: Create `claim_org_for_verification` RPC

An atomic RPC that:
- Checks the org is still in `payment_submitted` (or `returned_for_correction` resubmitted)
- Atomically sets `verification_status = 'under_verification'` + `verification_started_at = NOW()`
- Creates/updates a `platform_admin_verifications` record with the claiming admin
- Returns success or "already claimed by [name]"

This RPC is used in **both** modes -- in `auto_assign` mode the trigger pre-assigns, in `open_claim` mode the admin claims on open.

#### 3. Migration: Update `fn_auto_assign_on_payment_submitted` trigger

Read `org_verification_assignment_mode` from `md_mpa_config`:
- If `auto_assign`: run `execute_auto_assignment` (current behavior)
- If `open_claim`: create a `platform_admin_verifications` record with `assigned_admin_id = NULL` and status `Pending_Assignment` (visible in queue, no owner yet)

#### 4. Frontend: Update `SeekerOrgReviewPage` auto-transition

Replace the current `useStartVerification` call with `claim_org_for_verification` RPC:
- On success: proceed to review as today
- On conflict (already claimed): show an alert with the claiming admin's name and a "Go Back" button
- This works for both modes -- in `auto_assign` mode, the assigned admin claims seamlessly; another admin gets blocked

#### 5. Frontend: Update `SeekerOrgApprovalsPage` visibility

- In `open_claim` mode: all Senior Admins and Basic Admins see all `payment_submitted` orgs (shared inbox). Supervisors see everything for oversight.
- In `auto_assign` mode: non-supervisors see only their assigned orgs (current restrictive behavior).
- Read the mode from `useMpaConfig` to toggle filtering logic.

#### 6. Frontend: Add config entry to System Config page

Add `org_verification_assignment_mode` to the `GROUP_META` and make it editable with a radio/select: "Auto-Assignment (Engine)" vs "Open Claim (First-Come-First-Served)".

### Summary of Changes

| Layer | Change |
|-------|--------|
| **Migration** | Insert `org_verification_assignment_mode` config param into `md_mpa_config` |
| **Migration** | Create `claim_org_for_verification` RPC (atomic claim with concurrency guard) |
| **Migration** | Update `fn_auto_assign_on_payment_submitted` to check mode before running engine |
| **Frontend** | `SeekerOrgReviewPage`: replace `useStartVerification` with claim RPC + conflict handling |
| **Frontend** | `SeekerOrgApprovalsPage`: toggle visibility based on assignment mode |
| **Frontend** | `SystemConfigPage`: expose the new parameter for supervisor configuration |

### Flow Diagram

```text
Seeker completes payment
        |
        v
DB trigger fires on 'payment_submitted'
        |
        v
  Read org_verification_assignment_mode
        |
   ┌────┴─────────────────┐
   │ auto_assign           │ open_claim
   │                       │
   v                       v
  execute_auto_assignment  Create verification record
  (scoring, 2-pass,       (assigned_admin_id = NULL)
   supervisor excluded)    Org visible to all admins
   │                       │
   v                       v
  Admin sees in            Any admin clicks to review
  "My Verifications"       │
   │                       v
   v                  claim_org_for_verification()
  Opens org review    (atomic lock)
   │                       │
   v                  ┌────┴────┐
  Already assigned    │ Success  │ Conflict
  → proceed           │→ proceed │→ "Already claimed
                      │          │   by [Name]"
                      └──────────┘
```

