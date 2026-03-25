

# Fix: Redeploy Triage Edge Function + Frontend Safety Net

## Root Cause

The code fix (pass-with-issues → warning downgrade) was added to `supabase/functions/triage-challenge-sections/index.ts` at lines 230-233 but was **never redeployed** to Supabase. The live edge function still runs the old code that allows "pass" status with issues, so `problem_statement` stays in `routing.pass` and never enters `phase2_queue` for deep review and refinement.

## Fix

### 1. Redeploy the triage edge function

The code is already correct (lines 230-233). It just needs to be deployed to Supabase so the live function picks up the change.

### 2. Add a frontend safety net in `CurationReviewPage.tsx`

After receiving triage results (line 1315-1316), add a client-side correction that moves any "pass" sections with comments into the `phase2_queue`. This ensures even if the edge function somehow returns pass-with-issues, the frontend still routes them correctly:

```ts
// After line 1316:
// Safety net: any "pass" section with comments should be in phase2_queue
const correctedRouting = { ...routing };
triageReviews.forEach(r => {
  if (r.status === 'pass' && r.comments && r.comments.length > 0) {
    r.status = 'warning';
    correctedRouting.pass = correctedRouting.pass.filter(k => k !== r.section_key);
    if (!correctedRouting.phase2_queue.includes(r.section_key)) {
      correctedRouting.warning.push(r.section_key);
      correctedRouting.phase2_queue.push(r.section_key);
    }
  }
});
```

Then use `correctedRouting` instead of `routing` for subsequent Phase 2 logic.

## Files

| File | Action |
|------|--------|
| `supabase/functions/triage-challenge-sections/index.ts` | Redeploy (code already correct) |
| `src/pages/cogniblend/CurationReviewPage.tsx` | Add client-side safety net after line 1316 |

