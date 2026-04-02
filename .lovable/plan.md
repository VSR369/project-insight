

# Fix: Auto-Assignment Role Code Mapping + Missing user_id

## What's Broken

Three confirmed bugs prevent auto-assignment from ever working:

1. **Role code mismatch** — Pool members store SLM codes (`R5_MP`, `R7_AGG`) but the function filters for governance codes (`CU`, `ER`). Zero matches every time.
2. **No `user_id` column** — The `platform_provider_pool` table has no `user_id`. The function references `m.user_id` which resolves to `undefined`, breaking `user_challenge_roles` inserts.
3. **Dead double-query** — Lines 43-61 query the pool without `role_codes`, realize it can't filter, `return true` on everything, then re-query at line 64. Wasteful dead code.

Additionally, the **admin UI** (`usePoolMembers` hook, line 52-53) has the same mismatch — filtering by governance code `CU` against SLM codes `R5_MP` returns nothing.

## Confirmed Data

Pool members in DB have codes like: `[R3, R5_MP, R6_MP, R7_MP]`

SLM-to-Governance mapping (from `md_slm_role_codes`):

```text
Governance    SLM (MP)     SLM (AGG)     model_applicability
─────────────────────────────────────────────────────────────
CR            R3           R4, R10_CR    mp / agg
CU            R5_MP        R5_AGG        mp / agg
ER            R7_MP        R7_AGG        mp / agg
LC            R9           R9            both
FC            R8           R8            both
```

Engagement models: `marketplace` and `aggregator`.

## Implementation Plan

### Step 1: Create Role Code Mapping Constants
**New file:** `src/constants/roleCodeMapping.constants.ts`

Single helper function: `getPoolCodesForGovernanceRole(govCode: string, engagementModel?: string): string[]`

- `getPoolCodesForGovernanceRole('CU', 'marketplace')` → `['R5_MP']`
- `getPoolCodesForGovernanceRole('CU', 'aggregator')` → `['R5_AGG']`
- `getPoolCodesForGovernanceRole('CU')` → `['R5_MP', 'R5_AGG']` (fallback: all models)
- `getPoolCodesForGovernanceRole('LC')` → `['R9']` (model-independent)

No reverse lookup needed now. Keep it simple.

### Step 2: Database Migration — Add `user_id` to Pool Table
**Migration SQL:**

```sql
ALTER TABLE platform_provider_pool
ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Backfill existing pool members by email match
UPDATE platform_provider_pool p
SET user_id = u.id
FROM auth.users u
WHERE lower(p.email) = lower(u.email)
  AND p.user_id IS NULL;

-- Index for lookups
CREATE INDEX idx_pool_user_id ON platform_provider_pool(user_id);
```

Column is nullable (not all pool members may have auth accounts yet). Named `user_id` per project convention.

### Step 3: Fix `useAutoAssignChallengeRoles.ts`
**File:** `src/hooks/cogniblend/useAutoAssignChallengeRoles.ts`

Full rewrite of the function (~120 lines). Changes:

1. **Add `engagementModel` to `AssignmentInput` interface** — caller passes the challenge's engagement model code (`'marketplace'` or `'aggregator'`).

2. **Single query** — Remove the double-query. One query selecting `id, user_id, role_codes, domain_scope, current_assignments, max_concurrent`.

3. **Use mapping for filtering** — Convert governance code to pool codes via `getPoolCodesForGovernanceRole(input.roleCode, input.engagementModel)`. Filter: pool member must have at least one matching SLM code. If engagement-model-specific query yields zero candidates, fall back to all-model codes.

4. **Use `user_id` column** — Replace all `m.user_id` references (which were undefined) with the actual column now present.

5. **Proper typing** — Remove all `: any` casts. Define a `PoolCandidate` interface for the scored/filtered results.

6. **Use centralized error handler** — Replace `console.error` calls with `handleMutationError` / `logWarning`.

### Step 4: Fix `usePoolMembers.ts` Admin Filter
**File:** `src/hooks/queries/usePoolMembers.ts` (lines 52-54)

When `filters.role` is a governance code (e.g., `'CU'`), convert it to pool codes before querying:

```typescript
if (filters.role) {
  const poolCodes = getPoolCodesForGovernanceRole(filters.role);
  // Client-side filter: member must have at least one matching pool code
  results = results.filter(m =>
    m.role_codes.some(code => poolCodes.includes(code))
  );
}
```

Remove the server-side `.contains("role_codes", [filters.role])` since it can't handle the mapping. Move to client-side filtering alongside the existing industry/proficiency filters.

### Step 5: Update `PoolMemberRow` Interface
**File:** `src/hooks/queries/usePoolMembers.ts`

Add `user_id: string | null` to the `PoolMemberRow` interface. Add `user_id` to the select columns in the query.

## Files Modified

| File | Change |
|------|--------|
| `src/constants/roleCodeMapping.constants.ts` | **New** — governance-to-SLM code mapping helper |
| `src/hooks/cogniblend/useAutoAssignChallengeRoles.ts` | Fix role filtering, single query, use `user_id`, engagement model awareness, remove `: any` |
| `src/hooks/queries/usePoolMembers.ts` | Fix role filter to use mapping; add `user_id` to interface and select |
| **Migration** | Add `user_id` column + email-based backfill + index |

## What This Fixes

After implementation, when a Creator submits a challenge:
1. System converts `CU` → `['R5_MP']` (for marketplace challenges)
2. Finds pool members with `R5_MP` in their `role_codes`
3. Scores by taxonomy match (industry → proficiency → sub-domain → speciality)
4. Picks best match with lowest workload
5. Assigns them as CU on the challenge via `user_challenge_roles`
6. Challenge appears in that Curator's queue as "Assigned to Me"

The admin pool management page also correctly filters members when selecting governance role codes.

