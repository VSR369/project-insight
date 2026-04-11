

## Root Cause: Curator Was Assigned to Wrong User

### What the DB shows

| Role | Assigned to | Email | Is demo user? |
|------|------------|-------|---------------|
| CR | 376d7eb8 | nh-cr@testsetup.dev | Yes |
| CU | 58fa3afe | vsr@btbt.co.in | **No** — real user from old seeding |

The demo curator **Casey Underwood** (`nh-cu@testsetup.dev`, user `5c67ff44`) has **zero** `user_challenge_roles` rows. The CU role was auto-assigned to **Srinivasa Rao Vegendla** (`vsr@btbt.co.in`) instead.

### Why the wrong person was picked

The auto-assignment function (`autoAssignChallengeRole`) queries `platform_provider_pool` for members with matching SLM role codes (e.g. `R5_MP` for CU). The pool contains **6 members** with CU-compatible codes. The function picks the one with the lowest `current_assignments`.

At assignment time, `vsr@btbt.co.in` was likely at 0 assignments and was picked first (alphabetical or insertion-order tiebreak). The demo users Casey Underwood and Paul Curtis also have `R5_MP`/`R5_AGG` but lost the tiebreak.

Now `vsr` is at `current_assignments=2, fully_booked` — confirming they were assigned (and possibly assigned twice from prior test runs).

### Why it is invisible in the demo flow

1. Demo CU user (`nh-cu@testsetup.dev`) logs in
2. `get_user_all_challenge_roles` returns `[]` — because CU was assigned to a different user
3. `user_challenge_roles` for this user filtered by `role_code=CU` returns `[]`
4. Both My Challenges and Curation Queue show empty

The challenge IS visible in the Curation Queue org-filter path (same org), but the "Assigned to" badge shows `vsr@btbt.co.in`, not the demo curator.

### The fix: Two issues to address

**Issue 1 — Stale pool member from real account**
`vsr@btbt.co.in` is a real user in the pool who should not be auto-assigned in demo flows. The auto-assignment picked them because they had the matching role codes and lowest assignment count.

**Issue 2 — No way to control which pool member gets assigned**
The auto-assignment is purely workload-based with no org/tenant affinity. Any pool member with matching codes can be assigned to any challenge.

### Fix Plan

**Step 1 — Immediate data fix (SQL to run in Supabase)**
Reassign the CU role from `vsr` to the demo curator `Casey Underwood`:
- Update `user_challenge_roles`: deactivate vsr's CU row, insert/activate one for Casey
- Update `challenge_role_assignments`: point pool_member_id to Casey's pool entry
- Decrement vsr's `current_assignments`, increment Casey's

**Step 2 — Deactivate non-demo pool members (SQL)**
Set `is_active = false` on pool members that are not part of the demo user set (like `vsr@btbt.co.in`, `mark.thompson`, `anita.desai`, `priya.sharma`) so future auto-assignments only pick demo users.

**Step 3 — Code fix: Add org affinity to auto-assignment (optional, future)**
In `autoAssignChallengeRole`, prefer pool members from the same org as the challenge before falling back to cross-org pool members. This prevents the wrong-person scenario structurally.

### Recommended immediate action

Run the data fix SQL (Steps 1-2) to unblock testing. Step 3 is a structural improvement for later.

I can generate the exact SQL statements for Steps 1 and 2 once approved.

