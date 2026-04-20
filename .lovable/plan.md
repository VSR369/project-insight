

The user's external diagnosis is plausible but I should verify before accepting. Let me reason:

1. The previous attempt fixed `extensions.digest()` schema qualification — that was a real bug.
2. User still gets the same generic error. The external claim is that GRANT EXECUTE is missing on 5 RPCs.
3. **However** — if GRANT EXECUTE were missing, supabase-js would return a PostgREST error like `permission denied for function freeze_for_legal_review` (HTTP 403), which `errorHandler` would surface differently. Worth verifying via DB.
4. I should check `pg_proc` ACLs to confirm before running the migration.

Let me verify, then present a combined plan: (a) GRANT EXECUTE migration if confirmed missing, AND (b) the diagnostic/UX improvements from Sprint 6D so we never get an opaque toast again.

## Sprint 6D — Combined Permissions + Diagnostics Fix

### Verification step (first action)
Run `supabase--read_query` against `pg_proc` + `pg_authid` to confirm whether `authenticated` has EXECUTE on:
- `freeze_for_legal_review`, `unfreeze_for_recuration`, `assemble_cpa`, `complete_legal_review`, `complete_financial_review`

If grants are truly missing → that's the root cause. If grants exist → the failure is inside the function body and the diagnostics work becomes critical.

### Fix package (apply both regardless of which root cause wins)

| # | Change | File | Type |
|---|---|---|---|
| 1 | **Migration:** `GRANT EXECUTE ... TO authenticated` for the 5 RPCs | new SQL migration | CREATE |
| 2 | Bubble server-side error message to toast title | `src/hooks/cogniblend/useFreezeActions.ts` | MODIFY (~+10 lines) |
| 3 | Extend keyword map (`phase`, `frozen`, `hash`, `permission denied`, `legal review`) | `src/lib/errorHandler.ts` | MODIFY (~+10 lines) |
| 4 | Log raw `data` + `error` payload via `logWarning` before throwing | `src/hooks/cogniblend/useFreezeActions.ts` | MODIFY |

### Why both
- The GRANT migration is cheap, idempotent, reversible — apply it even if not strictly needed (defense-in-depth).
- The diagnostics changes ensure that *any* future RPC failure produces an actionable toast + structured log instead of "Please try again or contact support."

### Out of scope
- `LcLegalWorkspacePage` refactor (still deferred).
- Email delivery for notifications.
- `unfreeze_for_recuration` / `assemble_cpa` UX changes — same hook, will inherit the diagnostics improvements automatically.

### Safety
- GRANT EXECUTE is additive — no existing call path breaks.
- The function bodies remain `SECURITY DEFINER` with `SET search_path = public`, so privilege escalation is bounded.
- Pure observability changes in the hook — zero behavioral change to the freeze workflow itself.

### Test plan
1. Apply migration → re-test "Send to Legal" on challenge `25ca71a0-3880-4338-99b3-e157f2b88b3b`.
2. If success → verify `curation_lock_status='FROZEN'` and `legal_review_content_hash` is populated.
3. If still failing → toast will now show the real server message (e.g. "Challenge must be in Phase 2") + console log will carry the raw payload for further diagnosis.

