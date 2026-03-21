

## Plan: Fix Legal Document Generation — Trigger Rejects `ai_suggested` Status

### Root Cause

The `trg_challenge_legal_docs_validate` trigger on `challenge_legal_docs` only allows these status values:
```
ATTACHED, TRIGGERED, SIGNED, EXPIRED
```

The edge function inserts with `status: 'ai_suggested'`, which the trigger rejects with an exception. The error is caught silently (logged but the function still returns `success: true`), so the UI shows "generated successfully" but no rows are persisted.

### Fix (2 changes)

**1. Database migration — Add `ai_suggested` to the allowed status values**

Update the `trg_challenge_legal_docs_validate` function to also allow `'ai_suggested'`:
```sql
IF NEW.status IS NOT NULL AND NEW.status NOT IN (
  'ATTACHED','TRIGGERED','SIGNED','EXPIRED','ai_suggested'
) THEN
  RAISE EXCEPTION '...';
END IF;
```

**2. Edge function — Stop returning success on DB insert failure**

In `suggest-legal-documents/index.ts`, change the insert error handling so the function returns an error response instead of silently swallowing it:

```typescript
if (insertErr) {
  console.error("Failed to persist suggestions:", insertErr.message);
  return new Response(
    JSON.stringify({ success: false, error: { code: "DB_ERROR", message: "Failed to save suggestions" } }),
    { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
```

### Files modified
- 1 DB migration (update trigger function)
- `supabase/functions/suggest-legal-documents/index.ts` (error handling)

