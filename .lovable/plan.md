
# Fix: Auto-Assignment Pipeline — Complete Solution

## Root Cause Summary

Auto-assignment silently fails every time due to four compounding issues:

1. **Stale CHECK constraint on `challenge_role_assignments.role_code`** — Only allows `R3, R5_MP, R6_MP, R7_MP`. Missing all AGG codes (`R4, R5_AGG, R7_AGG, R10_CR`) and support roles (`R8, R9`). Contains removed role `R6_MP` (Innovation Director).
2. **Wrong values in hook** — Writes governance code `'CU'` (not SLM code `R5_MP`), uppercase `'ACTIVE'` (constraint requires `'active'`), and `'PHASE_3'` (constraint only allows `'abstract_screening', 'full_evaluation'`).
3. **RLS blocks cross-user insert** — `user_challenge_roles` INSERT policy: `WITH CHECK (user_id = auth.uid())`. A Creator cannot insert a CU row for another user.
4. **Demo curator not in pool** — `nh-cu@testsetup.dev` has no `platform_provider_pool` entry, so auto-assignment can never find them.

The existing `execute_auto_assignment` RPC is for MPA admin verification — completely unrelated. A new RPC is needed for challenge role assignment.

## Implementation Steps

### Step 1: Database Migration

**A. Update CHECK constraints:**

```sql
-- Remove stale role_code CHECK (includes removed R6_MP, missing AGG/support codes)
ALTER TABLE challenge_role_assignments
  DROP CONSTRAINT challenge_role_assignments_role_code_check;

ALTER TABLE challenge_role_assignments
  ADD CONSTRAINT challenge_role_assignments_role_code_check
  CHECK (role_code IN (
    'R3', 'R4', 'R10_CR',           -- CR (MP, AGG, AGG-alt)
    'R5_MP', 'R5_AGG',              -- CU
    'R7_MP', 'R7_AGG',              -- ER
    'R8',                            -- FC (both)
    'R9'                             -- LC (both)
  ));

-- Update assignment_phase CHECK to include curation/legal/finance phases
ALTER TABLE challenge_role_assignments
  DROP CONSTRAINT challenge_role_assignments_assignment_phase_check;

ALTER TABLE challenge_role_assignments
  ADD CONSTRAINT challenge_role_assignments_assignment_phase_check
  CHECK (assignment_phase IN (
    'abstract_screening', 'full_evaluation',   -- ER phases
    'curation',                                 -- CU phase
    'legal_review',                             -- LC phase
    'finance_review'                            -- FC phase
  ));
```

**B. Create `assign_challenge_role` SECURITY DEFINER RPC:**

This function receives pre-resolved parameters from the client-side hook (which handles candidate selection and scoring) and performs the atomic server-side writes that require elevated privileges:

- Insert into `challenge_role_assignments` (SLM code, lowercase status, correct phase)
- Insert into `user_challenge_roles` (governance code, is_active = true) — bypasses RLS
- Increment `platform_provider_pool.current_assignments`
- Insert audit trail row
- Returns the assignment ID or null on failure

Parameters: `p_challenge_id UUID, p_pool_member_id UUID, p_user_id UUID, p_slm_role_code TEXT, p_governance_role_code TEXT, p_assigned_by UUID, p_assignment_phase TEXT`

**C. Deactivate removed legacy roles:**

```sql
UPDATE platform_roles SET is_active = false, updated_at = NOW()
WHERE role_code IN ('AM', 'RQ', 'ID', 'CA');
```

### Step 2: Refactor `useAutoAssignChallengeRoles.ts`

Keep the existing candidate selection logic (query pool, filter by SLM codes, score by taxonomy, validate role conflicts). Replace `persistAssignment()` with a call to the new `assign_challenge_role` RPC.

Key changes:
- Track which SLM code matched during filtering (e.g., `R5_MP`) so it can be passed to the RPC
- Map governance roles to correct `assignment_phase`: CU → `'curation'`, ER → `'abstract_screening'`, LC → `'legal_review'`, FC → `'finance_review'`, CR → null
- Remove all direct inserts into `challenge_role_assignments` and `user_challenge_roles`
- Remove `as any` casts (no more client-side inserts)

### Step 3: Pass `engagementModel` from AISpecReviewPage

Both call sites (lines ~1332 and ~1428) need `engagementModel` added. The challenge's `operating_model` is already available (`'MP'` or `'AGG'`). Map to the format the mapping function expects:

```typescript
engagementModel: challenge?.operating_model === 'AGG' ? 'aggregator' : 'marketplace',
```

### Step 4: Link Demo Curator to Pool

Insert a `platform_provider_pool` row for `nh-cu@testsetup.dev` (user_id: `5c67ff44-51df-4562-9151-0545a5a9faf3`) with `role_codes: ['R5_MP']` and matching domain scope so auto-assignment can find them.

Also backfill `user_id` on existing pool members that have auth accounts (3 members currently have `user_id = null` despite having matching emails).

## Phase Mapping Clarification

The `assignment_phase` values map to **role responsibilities**, not ER-specific evaluation stages:

| Governance Role | assignment_phase | Meaning |
|---|---|---|
| CU (Curator) | `curation` | Curator reviews/refines the challenge spec |
| ER (Expert Reviewer) | `abstract_screening` or `full_evaluation` | ER evaluates submitted solutions |
| LC (Legal Compliance) | `legal_review` | LC reviews legal/compliance docs |
| FC (Finance Controller) | `finance_review` | FC manages escrow/payments |
| CR (Creator) | NULL | Creator is the challenge owner, not phase-gated |

`abstract_screening` and `full_evaluation` are ER-specific phases for solution evaluation — they do NOT apply to CU assignments.

## Files Modified

| File | Change |
|---|---|
| **Migration** | Update CHECK constraints, create `assign_challenge_role` RPC, deactivate legacy roles |
| `src/hooks/cogniblend/useAutoAssignChallengeRoles.ts` | Replace `persistAssignment` with RPC call, fix phase mapping, track matched SLM code |
| `src/pages/cogniblend/AISpecReviewPage.tsx` | Pass `engagementModel` to both `autoAssignChallengeRole` call sites |
| **Data insert** | Pool entry for demo curator + backfill user_id on existing members |
