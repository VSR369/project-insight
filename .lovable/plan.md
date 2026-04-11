
Goal: fix why submitted challenges are not consistently visible in role inbox/list screens, without chasing the wrong root cause.

What I verified
- The sample challenge `25ca71a0-3880-4338-99b3-e157f2b88b3b` is successfully submitted: Phase 2, `IN_PREPARATION`, `ACTIVE`.
- Role assignment is present in DB: creator has `CR`, curator has `CU`, and an active `challenge_role_assignments` row exists.
- The live `assign_challenge_role` function already contains the JSONB fix, so the “missing migration” theory is not the blocker here.
- `useMyChallenges` worked for the creator in the captured request: the join returned the challenge successfully.
- `challenges` RLS is enabled, but the only live access policy is tenant-based.
- `CurationQueuePage` hard-filters by `organization_id = currentOrg.organizationId`, and the assigned curator belongs to different org(s) than the challenge org.

Verdict on the proposed analysis
| Claim | Verdict | Notes |
|---|---|---|
| My Challenges silently hides query errors | Partly true | Page lacks explicit error UI, but that is not the main blocker in this case |
| FK embed / schema cache / ambiguous join is the root cause | Not supported | The live `user_challenge_roles -> challenges` embed returned 200 with the challenge object |
| `challenges` has no RLS | False | RLS is enabled live |
| `assign_challenge_role` JSONB fix is not applied | False for this case | Live function + live CU row prove assignment is working |
| Curator queue org filter can hide assigned challenges | True | This is a real frontend blocker |
| Root cause is “no CU row created” | False for this case | CU row exists already |

Corrected 5-Why analysis
1. Why does the assigned curator not see the submitted challenge?
   Because the queue is driven by org context, not by actual assignment.
2. Why is org context wrong here?
   Because pool-based curators can be assigned to a challenge from a different org/tenant.
3. Why doesn’t assignment automatically grant visibility?
   Because `challenges` RLS currently allows same-tenant access only; it does not grant access via active `user_challenge_roles`.
4. Why can this also affect “My Challenges” for assigned non-creator users?
   Because `useMyChallenges` embeds `challenges` from `user_challenge_roles`; with tenant-only RLS, the role row can exist while the embedded `challenges` object comes back null.
5. Why wasn’t this caught?
   Because same-org/demo flows pass, but the real cross-tenant provider/pool scenario was not covered.

Actual root cause
This is a cross-tenant access mismatch:
- Backend: assigned users do not get `challenges` read/update access through RLS.
- Frontend: `CurationQueuePage` uses `currentOrg` instead of assignment as its source of truth.

Fix plan

1. Database fix first (required)
- Create a new migration.
- Add a `SECURITY DEFINER` helper such as `has_active_challenge_role(challenge_id, user_id)`.
- Replace the current tenant-only `challenges` policy with split policies so:
  - same-tenant org users still work
  - platform admins still work
  - explicitly assigned users with active `user_challenge_roles` can `SELECT` their assigned challenges
  - explicitly assigned users can `UPDATE` their assigned challenges to match current app behavior for curation/review screens
- Keep `INSERT`/`DELETE` tenant-scoped.
- Do not spend time reapplying the JSONB migration for this bug.

2. Fix Curator Queue to use assignment-based inbox logic
File: `src/pages/cogniblend/CurationQueuePage.tsx`
- Remove org ID as the primary filter.
- Base the queue on the current user’s active `CU` assignments.
- If product behavior should still include same-org preview items, merge them secondarily and dedupe by challenge ID.
- Change query enablement from `!!user?.id && !!organizationId` to `!!user?.id`.
- Update empty-state copy from org-centric wording to inbox/assignment wording.

3. Harden My Challenges
Files:
- `src/hooks/cogniblend/useMyChallenges.ts`
- `src/pages/cogniblend/MyChallengesPage.tsx`
Changes:
- Add explicit error rendering in `MyChallengesPage` instead of only loading/empty states.
- Add defensive handling/logging if a `user_challenge_roles` row exists but the embedded `challenges` relation is null.
- Keep the current hook structure unless post-RLS testing still shows edge cases.

4. Regression verification after implementation
Test these flows end-to-end:
- Creator submits a STRUCTURED or CONTROLLED challenge.
- Creator still sees it in My Challenges after submission.
- Assigned curator from a different org sees it in:
  - My Challenges
  - Curation Queue
  - Curation Review / detail page
- Existing same-tenant creator/curator flows still behave the same.

Files likely involved
- `supabase/migrations/<new>_challenge_assignment_access_rls.sql`
- `src/pages/cogniblend/CurationQueuePage.tsx`
- `src/hooks/cogniblend/useMyChallenges.ts`
- `src/pages/cogniblend/MyChallengesPage.tsx`

Technical note
The real issue is not “missing migration” or “bad FK embed.” It is that the app already supports cross-tenant role assignment at the workflow layer, but the `challenges` RLS and curator queue query still assume same-org access. The fix must therefore be both backend (RLS) and frontend (assignment-based queue source).
