
Root cause confirmed from code + runtime:

- The UI logic in `src/hooks/cogniblend/useContextLibrary.ts` is behaving correctly: it deletes attachments, attempts to delete the digest, then re-checks whether the digest row still exists.
- Runtime evidence shows the exact failure pattern:
  - `DELETE /challenge_context_digest?...&select=id` returns `200 []`
  - immediate `GET /challenge_context_digest?...` still returns the same row
  - `DELETE /challenge_attachments?...` succeeds with `204`
- That is classic Supabase/PostgREST behavior when a `DELETE` is silently filtered by RLS.
- Repository review explains why: both digest mutation policies were written against `challenge_role_assignments.role_code IN ('CU','SA','PA')`, but that table actually stores SLM role codes such as `R5_MP`, `R5_AGG`, `R7_MP`, `R7_AGG`, `R8`, `R9`, `R3`. So the predicate cannot match the curator assignment model used by this flow.
- Important: the same logic bug exists in `curator_can_update_digest`, so the permanent fix should repair both UPDATE and DELETE together, not DELETE only.

Impact analysis:

- Low-risk, targeted fix.
- No table/column/function/route renames.
- No edge function is needed.
- No change needed to `challenge_attachments` permissions; those deletes are already succeeding.
- Small frontend hardening is advisable so a future policy failure cannot leave the system in a partial-cleared state.

Implementation plan:

1. Verify live DB state first
- Query live `pg_policies` for `challenge_context_digest`.
- Query the affected challenge’s `user_challenge_roles`, `challenge_role_assignments`, and `platform_provider_pool` rows for challenge `25ca71a0-3880-4338-99b3-e157f2b88b3b`.
- If production is missing an expected migration, still ship one new corrective migration so production and repo converge deterministically.

2. Create one corrective SQL migration
- Do not edit old migrations.
- Drop and recreate both broken policies on `public.challenge_context_digest`:
  - `curator_can_update_digest`
  - `curator_can_delete_digest`
- Replace the broken assignment predicate with the real actor model:
  - challenge-assigned curator via `public.user_challenge_roles`
    - same `challenge_id`
    - `user_id = auth.uid()`
    - `role_code = 'CU'`
    - `is_active = true`
  - OR the existing platform-admin predicate already used elsewhere in this codebase for admin-managed tables
- Leave these unchanged:
  - `auth_read_context_digest`
  - `svc_manage_context_digest`
- Do not introduce service-role bypass for this user action.

3. Harden the frontend clear flow
- Update `src/hooks/cogniblend/useContextLibrary.ts`.
- Keep the post-delete verification check; it is useful and correctly detects silent RLS blocks.
- Reorder the destructive sequence so digest deletion is attempted before attachment/storage cleanup. That prevents the current bad partial state where sources are gone but the digest row remains.
- Keep existing invalidations/cache reset.
- Slightly tighten the toast copy so it identifies an access-policy block more clearly if this ever happens again.

4. Validate end to end
- Curator on the affected challenge can click Clear All successfully.
- Platform admin can also clear successfully.
- An authenticated but unauthorized user still cannot delete the digest.
- Curator can still save an edited digest after the policy repair.
- Recheck the network behavior:
  - authorized digest DELETE should no longer return `[]` when the row exists
  - follow-up GET should return no row
- Confirm no regressions in Context Library generate/save/review workflows.

Technical notes:

- I do not recommend fixing only DELETE; UPDATE has the same structural bug.
- I do not recommend an edge function for this; direct client mutation with correct RLS is the clean architecture here.
- Most likely files to change after approval:
  - `supabase/migrations/<new_timestamp>_fix_context_digest_rls.sql`
  - `src/hooks/cogniblend/useContextLibrary.ts`
