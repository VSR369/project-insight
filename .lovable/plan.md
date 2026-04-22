
# Assessment — Mostly correct diagnosis, but not fully aligned with Lovable architecture

## What is correct in your write-up

Your root-cause logic is directionally right:

```text
No FC assignment row
→ get_user_all_challenge_roles returns no FC
→ sidebar hides Finance Workspace
→ FC queue is empty
→ challenge finance page shows Access Denied
```

That matches the current code:

- `useCogniPermissions.ts` hides FC nav through `canSeeEscrow`
- `useCogniUserRoles.ts` depends on `get_user_all_challenge_roles`
- `FcFinanceWorkspacePage.tsx` checks `roles?.includes('FC')`
- `FcChallengeQueuePage.tsx` only loads challenges from `user_challenge_roles`

So yes: missing FC assignment data is the primary functional blocker.

## What is already implemented now

Two items in your proposed fix are already in code:

1. `/cogni/escrow` is already redirected in `src/App.tsx`
   - Current code: `<Route path="/cogni/escrow" element={<Navigate to="/cogni/fc-queue" replace />} />`

2. The FC queue empty-state and CONTROLLED-only note are already present in `src/pages/cogniblend/FcChallengeQueuePage.tsx`
   - “No FC assignments yet”
   - “Finance review applies to CONTROLLED governance challenges only.”

So those are no longer gaps.

## Actual gaps vs Lovable / project architecture

### 1. The FC assignment was handled the wrong way
The repo contains a SQL migration that inserts data into `user_challenge_roles`.

That is not aligned with the project rules:
- schema changes → migration
- data changes → data operation / insert tool

So the FC seed should not live as a permanent migration file if it is only test data.

### 2. Your SQL example is not aligned with the real schema
`public.user_challenge_roles` does **not** have an `assigned_via` column.

Actual columns include:
- `user_id`
- `challenge_id`
- `role_code`
- `assigned_by`
- `assigned_at`
- `revoked_at`
- `is_active`
- `auto_assigned`
- `created_at`
- `updated_at`
- `created_by`
- `updated_by`

So this version would fail:

```sql
INSERT INTO public.user_challenge_roles (..., assigned_via)
```

### 3. There is still a frontend architecture violation in the FC queue page
`src/pages/cogniblend/FcChallengeQueuePage.tsx` currently:
- queries Supabase directly inside the page
- uses `(supabase as any)`
- contains business filtering logic in the page

That breaks workspace rules:
- no Supabase calls in page/components
- zero `any`
- business logic should move into hook/service layer

### 4. Error-state UX is still incomplete
The FC queue page logs query errors via `handleQueryError`, but it does not render a proper user-facing error state with retry CTA.  
That does not meet the “4 mandatory states” rule.

### 5. The “migration exists” question is separate from “data actually applied”
Even though the SQL file exists in the repo, the real user problem remains if the FC row was not actually applied in the connected Supabase project.  
So the true operational gap is:

```text
repo contains seed SQL
≠
database definitely has active FC row for Frank
```

## Corrected implementation plan to align with architecture

### A. Fix the data the right way
Use a data operation to upsert the FC assignment for Frank on the test challenge:

```sql
INSERT INTO public.user_challenge_roles (
  challenge_id,
  user_id,
  role_code,
  is_active
)
VALUES (
  '25ca71a0-3880-4338-99b3-e157f2b88b3b',
  '8f429cdb-20c6-49ab-8a3a-75b4a4cd257b',
  'FC',
  true
)
ON CONFLICT (user_id, challenge_id, role_code)
DO UPDATE SET
  is_active = true,
  revoked_at = null;
```

Do **not** use `assigned_via`.

### B. Remove test-data seeding from schema migration history
Clean up the current SQL migration strategy so test-role assignment is not represented as a structural migration.

### C. Refactor FC queue to follow Lovable architecture
Split `FcChallengeQueuePage.tsx` into:
- page = layout/composition only
- query hook = data fetching
- service/util = queue filtering and mapping

Specifically:
- move Supabase calls out of the page
- remove `as any`
- move governance filtering (`QUICK` / `STRUCTURED`) out of the page
- keep page under the file-size and responsibility rules

### D. Add complete error-state UX
For FC queue:
- loading skeleton
- empty state
- error card with retry button
- success state

### E. Re-verify finance workspace reachability end-to-end
After the FC row exists:
1. sidebar shows **Finance Workspace**
2. `/cogni/fc-queue` shows the assigned challenge
3. “View challenge context” opens `/cogni/challenges/:id/finance`
4. two tabs render:
   - Finance Review
   - Curated Challenge
5. preview mode works before Phase 3
6. deposit form appears at Phase 3 only

## Final verdict

## Alignment verdict
- **Root cause:** Yes, mostly correct
- **“Route not fixed”:** No, that part is already fixed
- **“Migration never created”:** No longer accurate; a seed SQL file exists
- **Architecture alignment:** Not fully aligned yet

## Remaining real gaps
1. FC assignment must exist in the live DB, not just in repo history
2. data seed should be handled as data, not migration
3. remove `assigned_via` from the proposed SQL
4. refactor `FcChallengeQueuePage` to hook/service architecture
5. add proper error-state UX

## Recommended next implementation scope
One cleanup pass should do all of this together:
- correct the FC data assignment in DB
- remove/replace the improper seed migration approach
- refactor FC queue data access into hook/service
- add full error state
- re-verify sidebar → queue → two-tab workspace flow
