

# Fix: AM Content Not Fully Visible in CA Role — Industry Segment Missing

## Problem
When the AM creates a challenge, the `industry_segment_id` is saved inside the `eligibility` JSONB field (as `{"industry_segment_id": "..."}`). However, when CA/CR opens the same challenge via `ConversationalIntakeContent`, it only reads `industry_segment_id` from `targeting_filters` (line 452-454), which is always `{}` for AM-created challenges. This means the industry segment selected by the AM is never shown to the CA.

All other fields (title, problem_statement, scope, budget, timeline, beneficiaries_mapping) flow correctly.

## Fix

**File: `src/pages/cogniblend/ConversationalIntakePage.tsx`** (lines 451-455)

Add a fallback to read `industry_segment_id` from the `eligibility` field when `targeting_filters` doesn't have it:

```typescript
// Industry segment from targeting_filters, eligibility, or eligibility_model
const targeting = ch.targeting_filters as Record<string, unknown> | null;
if (targeting?.industry_segment_id) {
  setSelectedIndustrySegmentId(targeting.industry_segment_id as string);
} else {
  // Fallback: AM intake stores industry_segment_id in eligibility JSON
  let elig = ch.eligibility as Record<string, unknown> | string | null;
  if (typeof elig === 'string') {
    try { elig = JSON.parse(elig); } catch { elig = null; }
  }
  if (elig && typeof elig === 'object' && (elig as Record<string, unknown>).industry_segment_id) {
    setSelectedIndustrySegmentId((elig as Record<string, unknown>).industry_segment_id as string);
  }
}
```

This is a single-location change. The `eligibility` field is already fetched by the edit query (confirmed in network data). No other files need modification.

## Technical Details
- The `eligibility` column stores a JSON-stringified object: `"{\"industry_segment_id\":\"b1a248ce-...\"}"` (double-encoded string in the DB response)
- The fix handles both parsed-object and string forms of the `eligibility` field
- This also fixes the console warning about `Function components cannot be given refs` for `ConversationalIntakeContent` as a side benefit — actually no, that's a separate ref-forwarding issue

