## Root cause

The "Accept & Continue" button in `RoleLegalGate` (PWA / SPA / SKPA first-login dialog) crashes with:

> new row for relation "legal_acceptance_log" violates check constraint "legal_acceptance_log_action_check"

The DB constraint requires uppercase values:

```
CHECK (action = ANY (ARRAY['ACCEPTED'::text, 'DECLINED'::text]))
```

But `useAcceptRoleLegal.ts` line 36 inserts lowercase `'accepted'`. Postgres rejects the row, the pending row is never resolved, and the user is permanently stuck on the gate screen.

This is the only writer to `legal_acceptance_log` that uses the wrong case. All other writers (`useLegalAcceptanceLog`, `usePriorAcceptanceCheck` reader, the `AcceptanceAction` type in `src/types/legal.types.ts`) already use uppercase `'ACCEPTED'` / `'DECLINED'`. The other lowercase `'accepted'` strings found in the codebase write to different columns (`challenge_legal_docs.ai_review_status`, JSONB `version_history` entries) and are not affected by this constraint.

## Fix (one-line change, zero schema risk)

**File:** `src/hooks/legal/useAcceptRoleLegal.ts`

Change line 36 from:

```ts
action: 'accepted',
```

to:

```ts
action: 'ACCEPTED',
```

That alone unblocks the PWA gate completely. Also strengthen the type to prevent regressions:

1. Import `AcceptanceAction` from `@/types/legal.types` and either:
   - Hard-code `action: 'ACCEPTED'` (the hook only ever accepts — no decline path through this entry point), **or**
   - Add an `action: AcceptanceAction` field to the payload and pass it from `RoleLegalGate` (preferred if a decline flow lands later).

For now we go with option 1 since `RoleLegalGate` has no decline branch — `handleRoleLegalDeclined` in `AuthGuard.tsx` only resets local state, it does not call this mutation.

## Verification steps after the fix

1. Reload `/org/dashboard` as `soadmin@test.local` (the user from the failing trace).
2. The PWA gate appears (one pending row exists for this user).
3. Scroll to bottom → check the box → click "Accept & Continue".
4. Expect:
   - `POST /rest/v1/legal_acceptance_log` returns 201
   - `PATCH /rest/v1/pending_role_legal_acceptance` resolves the row
   - React Query invalidates `pending-role-legal-acceptance`, `pwa-acceptance-status`, `assemble-role-doc`, `legal-gate`
   - User lands on `/org/dashboard` content
5. Refresh — gate does not reappear (resolved row is filtered out by `is null` on `resolved_at`).

## Why no migration is needed

- The constraint is correct per the data contract documented in `src/types/legal.types.ts` (`AcceptanceAction = 'ACCEPTED' | 'DECLINED'`).
- All read paths and the prior-acceptance check already query uppercase.
- Loosening the constraint to accept lowercase would corrupt audit reconstruction and break `usePriorAcceptanceCheck`. The application code is wrong, not the DB.

## Out of scope (no action needed, but noted)

- `useLcPass3Mutations.ts:94` and `useCuratorLegalReview.ts:261` write `action: 'accepted'` into JSONB `version_history` on `challenge_legal_docs` — different column, no constraint, intentionally lowercase. **Leave as-is.**
- Phase 9 v4 / v4b backfill logic is functioning correctly. The pending row that triggered the gate was enqueued by `trg_legal_template_activated_backfill` exactly as designed; the gate failed only because of the casing bug above.

## Files to change

- `src/hooks/legal/useAcceptRoleLegal.ts` — one-line value change (lowercase → uppercase).

No DB migration. No new files. No type changes required.
