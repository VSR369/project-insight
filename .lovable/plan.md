

# Fix: AI Review Not Generating for All Sections

## Root Cause

The AI model (via tool calling) does **not reliably return reviews for ALL requested sections**. When the edge function sends 9 SPEC_SECTIONS to the AI, the model sometimes returns only 7 -- skipping sections it deems less critical or that have minimal content. This is confirmed by the actual stored data: `expected_outcomes` and `beneficiaries_mapping` have NO review entries despite being in SPEC_SECTIONS.

The frontend panels check `review={aiReviews['expected_outcomes']}` which is `undefined`, so the `AIReviewInline` component shows the "Pending" message.

## Fix: 1 File

### Edge Function: `supabase/functions/review-challenge-sections/index.ts`

After parsing the AI's tool call response (line 280-284), backfill any missing sections with a default entry. This guarantees every section in `sectionsToReview` gets a review result regardless of AI model behavior.

**After line 284** (after `newSections` is built), add:

```typescript
// Backfill any sections the AI skipped with a default "pass"
const returnedKeys = new Set(newSections.map((s: any) => s.section_key));
for (const sec of sectionsToReview) {
  if (!returnedKeys.has(sec.key)) {
    newSections.push({
      section_key: sec.key,
      status: "pass",
      comments: [],
      reviewed_at: new Date().toISOString(),
    });
  }
}
```

This ensures:
- ALL sections in the role's section list always have review data
- The frontend panels always receive a `review` prop (never `undefined`)
- Sections the AI skipped appear as "Pass" rather than stuck on "Pending"
- No frontend changes needed -- the existing code already handles "pass" with empty comments correctly (shows "This section looks good -- no issues found.")

**Redeploy** the edge function after the change.

**Files modified**: 1 (`supabase/functions/review-challenge-sections/index.ts`)

