

# Fix Plan: 3 Remaining Gaps + Critical Status Case Mismatch

## Critical Bug Found During Analysis

The `seeking_org_admins` table has a **CHECK constraint** allowing only lowercase values (`pending_activation`, `active`, `suspended`, `transferred`), but:
- The **partial unique index** (BR-SOA-006) uses title case (`'Invited'`, `'Active'`) — effectively dead, never matches
- The **suspend/reinstate mutations** use title case (`'Suspended'`, `'Active'`, `'Invited'`) — will fail at runtime
- The **BR-SOA-011 trigger** checks for `'Deactivated'` — not in the allowed values

This must be fixed alongside the 3 gaps.

---

## Changes

### 1. Database Migration

**a) Fix CHECK constraint** — expand to include all needed statuses (standardize on lowercase):
- Drop old CHECK, add new: `pending_activation, active, suspended, transferred, deactivated`

**b) Fix partial unique index** — recreate with lowercase values:
- `WHERE admin_tier = 'PRIMARY' AND status IN ('pending_activation', 'active')`

**c) Fix BR-SOA-011 trigger** — change `'Deactivated'` to `'deactivated'`

**d) Add `designation_method`** column:
- `designation_method TEXT CHECK (designation_method IN ('SELF', 'SEPARATE', 'DELEGATED', 'TRANSFER'))`

### 2. Fix Suspend/Reinstate Mutations (`useSeekerOrgApprovals.ts`)

- `useSuspendOrg`: Change `'Suspended'` → `'suspended'`, `'Active', 'Invited'` → `'active', 'pending_activation'`
- `useReinstateOrg`: Change `'Active'` → `'active'`, `'Suspended'` → `'suspended'`

### 3. Fix ReturnForCorrectionDialog — Dynamic Zod Schema

Move Zod schema inside the component (same pattern as `RejectOrgDialog`) so `.min()` uses the dynamic config value from `md_system_config` instead of hardcoded 50.

### 4. GAP 2: Registrant Title/Role

Already captured as `job_title` in Step 2 (`PrimaryContactForm.tsx`) and persisted to `registrant_contact.job_title`. The BRD says "Step 1" but Step 2 (Primary Contact) is the logical place for personal registrant details. **No change needed** — functionally complete.

---

## Files Modified
- **1 new migration** — fix CHECK, index, trigger, add column
- `src/hooks/queries/useSeekerOrgApprovals.ts` — fix status casing in suspend/reinstate
- `src/pages/admin/seeker-org-approvals/ReturnForCorrectionDialog.tsx` — dynamic Zod schema

