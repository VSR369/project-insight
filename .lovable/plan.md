

## Fix 2 — Auto-Accept by Confidence Threshold

### What This Fixes
Currently all AI-discovered sources are inserted as `"accepted"`. This fix adds a confidence threshold: sources with confidence >= 0.85 stay auto-accepted, while lower-confidence sources are marked `"suggested"` for curator review in the SourceList panel.

### Change

**`supabase/functions/discover-context-resources/index.ts`** (line 320)

Replace the hardcoded `discovery_status: "accepted"` with a conditional expression:

```ts
discovery_status: (
  typeof s.confidence_score === "number" && s.confidence_score >= 0.85
    ? "accepted"
    : "suggested"
),
```

Single line change. Then redeploy the edge function.

### Files Changed

| File | Action |
|------|--------|
| `supabase/functions/discover-context-resources/index.ts` | Conditional `discovery_status` based on confidence threshold |

