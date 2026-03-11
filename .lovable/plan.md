

# Fix: Seed Data Not Visible

## Two Issues Found

### Issue 1: Wrong column name in query (causes 400 error)
The `useSolutionRequests` hook queries `seeker_organizations.legal_name`, but the actual column is `organization_name`. This is confirmed by the network response: `"column seeker_organizations_1.legal_name does not exist"`.

The same issue exists in `useAllChallengeAssignments` on the Assignment History page.

**Fix:** Change `legal_name` to `organization_name` in `useSolutionRequests.ts`.

### Issue 2: Seed assignments were skipped
The seed migration only inserts `challenge_role_assignments` if there are >= 5 pool members. The database has only 1 pool member ("Srinivasa Rao Vegendla"). So the `IF array_length(v_pool_ids, 1) >= 5` check failed, and no assignments were created.

The 3 seed challenges *were* created successfully.

**Fix:** Run a new data insert that assigns the single existing pool member to multiple roles across the seed challenges (since that member has all 4 role codes: R3, R5_MP, R6_MP, R7_MP).

## Changes

| File | Change |
|---|---|
| `src/hooks/queries/useSolutionRequests.ts` | Replace `legal_name` with `organization_name` in all 3 queries |
| Database (insert) | Insert challenge_role_assignments using the existing pool member for all roles across the 3 seed challenges |

