

## Plan: Fix AI Quality Analysis and AI Section Review

### Root Cause Analysis

Both edge functions are deployed and working correctly (verified via direct API test returning 200 with valid data). The issues are in the client-side error handling and feedback:

**Issue 1: "Analyze AI" (check-challenge-quality)**
- Missing success toast — user gets no feedback that analysis completed
- Missing error handling for the "else" branch — if response shape doesn't match, it silently does nothing
- No toast for gaps found or score display feedback

**Issue 2: "Review Sections by AI" (review-challenge-sections)**
- Results only appear as inline `CurationAIReviewInline` components inside accordion items
- User must expand each section to see the review comments — no summary or notification of which sections have issues
- If the response parsing fails silently, no toast is shown

**Issue 3: Both functions**
- When JWT expires, `supabase.functions.invoke` returns `{ data: null, error: FunctionsHttpError }` but `error.message` is generic ("Edge Function returned a non-2xx status code"), not the actual JSON body with the meaningful error message
- Need to parse the error response body for better user feedback

---

### Changes

#### File: `src/pages/cogniblend/CurationReviewPage.tsx`

**1. Fix `handleAIQualityAnalysis`**
- Add success toast: `"AI analysis complete — Score: {score}/100, {n} gaps found"`
- Add explicit else-branch error: `throw new Error(data?.error?.message ?? "Unexpected response")`
- Handle FunctionsHttpError by reading `error.context?.body` for meaningful message

**2. Fix `handleAIReview`**
- After setting `aiReviews`, show a summary toast listing sections with issues: `"AI review: 3 pass, 2 warnings, 1 needs revision"`
- Handle FunctionsHttpError the same way

**3. Add AI Review Summary in Right Rail**
- After "Review Sections by AI" button, show a compact summary when `aiReviews` has data:
  - Count of pass/warning/needs_revision with color-coded badges
  - List sections needing revision with clickable links that set the active group and expand the accordion item
- This makes review results visible without having to hunt through accordion items

**4. Improve error feedback for both handlers**
- Parse `FunctionsHttpError` context to extract the actual error message from the edge function response
- Show specific toasts for rate limit (429) and credits exhausted (402)

### Technical Details

Error parsing pattern for `supabase.functions.invoke`:
```typescript
if (error) {
  // Try to read the actual error body
  let msg = error.message;
  try {
    const body = await error.context?.json?.();
    msg = body?.error?.message ?? msg;
  } catch {}
  throw new Error(msg);
}
```

AI Review summary component (inline in right rail):
- Shows after `aiReviews.length > 0`
- Groups by status with counts
- Sections with `needs_revision` listed as clickable items

