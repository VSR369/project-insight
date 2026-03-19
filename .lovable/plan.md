

# Why the "AI generation unavailable" banner appears

## Root Cause

The banner is **misleading** — the AI generation itself is NOT failing. The error comes from the **challenge creation step** that runs AFTER successful AI generation.

The flow in `handleGenerateWithAI` (ConversationalIntakePage.tsx, lines 315-391) is:

```text
1. generateSpec.mutateAsync()    ← AI edge function (this WORKS)
2. createChallenge.mutateAsync() ← initialize_challenge RPC (this FAILS)
3. saveStep.mutateAsync()        ← never reached
```

The entire sequence is wrapped in a single `try/catch` (line 388):
```tsx
} catch {
  setAiFailure(true);  // Shows "AI generation unavailable" banner
}
```

So when `initialize_challenge` fails (the `tenant_id` column error we just fixed), the catch block sets `aiFailure = true`, displaying the misleading "AI generation unavailable" banner.

## Current Status

The database migration fixing `initialize_challenge` (removing `tenant_id` from `sla_timers` INSERT) was **just applied**. I confirmed:
- The DB function now has the correct code (verified via `pg_proc`)
- The edge function `generate-challenge-spec` IS deployed and responding
- No error logs from the edge function

## What to do

### 1. Try again
The fix was just applied. Please **reload the page** and try "Generate with AI" again. The `initialize_challenge` function should now succeed.

### 2. Fix misleading error handling (code change)
If the challenge creation step fails, the user should see a specific error — not "AI generation unavailable." The fix:

- In `ConversationalIntakePage.tsx`, update the catch block to distinguish between AI generation failures and challenge creation failures
- Show "AI generation unavailable" only when `generateSpec` fails
- Show "Challenge creation failed" when `createChallenge` or `saveStep` fails
- In the challenge creation failure case, offer a retry that skips the AI step (since the spec was already generated)

This is a small change to the `handleGenerateWithAI` function — splitting the single try/catch into separate error handling for each step.

