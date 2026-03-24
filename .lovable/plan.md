

# Plan: Cap Legal Doc Columns + Limit Evaluation Rows

## What Changes

Two one-line fixes in `supabase/functions/review-challenge-sections/index.ts`:

### Fix 1 — Drop large text fields from legal docs fetch (line 210)

Remove `content_summary` and `rationale` from the select list. These can contain full document text that balloons prompt token count. Keep only metadata columns: `document_type, tier, status, lc_status, lc_review_notes, document_name`.

### Fix 2 — Add LIMIT 10 to evaluation records fetch (line 228)

Chain `.order('created_at', { ascending: false }).limit(10)` to the `evaluation_records` query so only the 10 most recent records are sent to the prompt.

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/review-challenge-sections/index.ts` | Remove `content_summary, rationale` from legal docs select; add `.order().limit(10)` to evaluation records query |

No other files affected.

