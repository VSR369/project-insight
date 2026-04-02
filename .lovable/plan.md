

# Fix Auto-Assignment Pipeline — Final Plan

## What's broken (verified against live DB)

| Bug | Hook writes | DB CHECK allows | Result |
|-----|------------|-----------------|--------|
| Wrong role_code | `'CU'` (governance code) | `R3, R5_MP, R6_MP, R7_MP` | Silent INSERT fail |
| Wrong status | `'ACTIVE'` | `active, reassigned, completed, cancelled` | Silent INSERT fail |
| Wrong phase | `'PHASE_3'` | `abstract_screening, full_evaluation` | Silent INSERT fail |
| RLS cross-user | Creator inserts for Curator | `user_id = auth.uid()` | Silent INSERT fail |
| No pool entry | Casey Underwood (`nh-cu@testsetup.dev`) | Not in `platform_provider_pool` | No candidate found |
| Stale constraint | `R6_MP` (removed Innovation Director) still in CHECK | Missing `R4, R5_AGG, R7_AGG, R8, R9, R10_CR` | AGG + support roles permanently blocked |
| Legacy roles active | `AM, RQ, ID, CA` still `is_active = true` in `platform_roles` | — | Data integrity issue |

## Phase mapping clarification

`abstract_screening` and `full_evaluation` are ER-specific phases for evaluating solutions — they do NOT apply to Curators. The correct mapping:

| Role | Phase meaning | Value |
|------|--------------|-------|
| CU | Curator refines challenge spec | `curation` |
| ER | Reviewer evaluates solutions | `abstract_screening` or `full_evaluation` |
| LC | Legal compliance review | `legal_review` |
| FC | Finance/escrow management | `finance_review` |
| CR | Challenge owner | `NULL` |

---

## Implementation Steps

### Step 1: Database Migration

**A. Fix CHECK constraints**

```sql
-- Remove stale role_code CHECK (has removed R6_MP, missing AGG + support codes)
ALTER TABLE challenge_role_assignments
  DROP CONSTRAINT challenge_role_assignments_role_code_check;
ALTER TABLE challenge_role_assignments
  ADD CONSTRAINT challenge_role_assignments_role_code_check
  CHECK (role_code IN ('R3','R4','R10_CR','R5_MP','R5_AGG','R7_MP','R7_AGG','R8','R9'));

-- Expand assignment_phase to include role-specific phases
ALTER TABLE challenge_role_assignments
  DROP CONSTRAINT challenge_role_assignments_assignment_phase_check;
ALTER TABLE challenge_role_assignments
  ADD CONSTRAINT challenge_role_assignments_assignment_phase_check
  CHECK (assignment_phase IN (
    'abstract_screening','full_evaluation',
    'curation','legal_review','finance_review'
  ));
```

**B. Create `auto_assign_challenge_role` SECURITY DEFINER RPC**

Named differently from existing `assign_role_to_challenge` (which is for manual human assignment). This new function:

1. Inserts `challenge_role_assignments` with SLM code (`R5_MP`), lowercase `'active'`, correct phase (`'curation'`)
2. Upserts `user_challenge_roles` with governance code (`CU`), `is_active = true`, `auto_assigned = true`
3. Increments `platform_provider_pool.current_assignments`
4. Inserts audit trail row
5. Returns JSONB `{success, assignment_id}`

All four writes atomic. SECURITY DEFINER bypasses RLS for cross-user insertion.

Parameters: `p_challenge_id UUID, p_pool_member_id UUID, p_user_id UUID, p_slm_role_code TEXT, p_governance_role_code TEXT, p_assigned_by UUID, p_assignment_phase TEXT`

**C. Deactivate removed legacy roles**

```sql
UPDATE platform_roles SET is_active = false, updated_at = NOW()
WHERE role_code IN ('AM','RQ','ID','CA');
```

**D. Insert demo curator pool entry + backfill user_ids**

Insert Casey Underwood (`5c67ff44-51df-4562-9151-0545a5a9faf3`) into `platform_provider_pool` with `role_codes: ['R5_MP']`, empty domain_scope (matches all), `availability_status: 'available'`.

Backfill `user_id` on existing pool members by matching emails against `auth.users`.

### Step 2: Refactor `useAutoAssignChallengeRoles.ts`

Replace `persistAssignment()` (lines 182-254) with a single RPC call:

- Track which SLM code matched during `filterAndScore` (return it alongside candidate)
- Map governance role to correct phase: `CU→'curation'`, `ER→'abstract_screening'`, `LC→'legal_review'`, `FC→'finance_review'`, `CR→null`
- Call `supabase.rpc('auto_assign_challenge_role', {...})`
- Remove all direct table inserts and `as any` casts
- Keep `filterAndScore` and `findValidCandidate` unchanged

### Step 3: Pass `engagementModel` from AISpecReviewPage

Both call sites (lines ~1332 and ~1428) need:

```typescript
engagementModel: challenge?.operating_model === 'AGG' ? 'aggregator' : 'marketplace',
```

Currently missing — without it, the role code mapping defaults to all-model codes instead of model-specific ones.

---

## Files Modified

| File | Change |
|------|--------|
| New migration | Fix CHECK constraints, create `auto_assign_challenge_role` RPC, deactivate legacy roles |
| Data operations | Insert Casey pool entry, backfill user_ids |
| `src/hooks/cogniblend/useAutoAssignChallengeRoles.ts` | Replace `persistAssignment` with RPC call, fix phase map, track matched SLM code |
| `src/pages/cogniblend/AISpecReviewPage.tsx` | Add `engagementModel` to both call sites |

## End-to-end flow after fix

1. Creator approves spec on AISpecReviewPage
2. Hook queries pool, filters by `R5_MP`, scores by taxonomy, validates role separation
3. Calls `auto_assign_challenge_role` RPC (SECURITY DEFINER)
4. RPC atomically writes: `challenge_role_assignments` (SLM code + correct status + phase) + `user_challenge_roles` (governance `CU`) + increments pool counter + audit trail
5. `get_user_all_challenge_roles` returns `CU` for assigned user
6. Curator sidebar and Curation Queue become visible

