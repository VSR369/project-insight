

# Remaining Gaps — 2 Small Fixes

## What's Already Done (verified in code)
All 5 previously-planned fixes were implemented in prior commits. The SECTION_FIELD_ALIASES map, Pass 2 alias lookups, current_content injection, handleReReview closure fix, challengeCtx enrichment, and reward auto-save are all present and correct.

## What's Still Missing

### Fix 1: Add `solution_type` to SECTION_FIELD_ALIASES
**File:** `supabase/functions/review-challenge-sections/index.ts`

The alias map at line 402-408 is missing `solution_type: 'solution_types'`. This means Pass 2 reads `challengeData["solution_type"]` which may be the string label, not the actual `solution_types` array from DB.

**Change:** Add to SECTION_FIELD_ALIASES:
```typescript
const SECTION_FIELD_ALIASES: Record<string, string> = {
  solver_expertise: 'solver_expertise_requirements',
  eligibility: 'solver_eligibility_types',
  visibility: 'solver_visibility_types',
  submission_guidelines: 'description',
  solution_type: 'solution_types',  // ADD
};
```

Also add to the curation aliasing block (after line 1178):
```typescript
if (challengeData.solution_types && !Array.isArray(challengeData.solution_type)) {
  challengeData.solution_type = challengeData.solution_types;
}
```

### Fix 2: Add `complexityLevel` to challengeCtx
**File:** `src/pages/cogniblend/CurationReviewPage.tsx`

The challengeCtx return object (line 2621) already has `complexity` but the edge function's clientContext expects `complexityLevel` as well.

**Change:** Add to the return object:
```typescript
complexity_level: challenge?.complexity_level ?? undefined,
```

### Deployment
- Redeploy `review-challenge-sections` edge function after Fix 1.

## Files Modified
1. `supabase/functions/review-challenge-sections/index.ts` — Fix 1
2. `src/pages/cogniblend/CurationReviewPage.tsx` — Fix 2

