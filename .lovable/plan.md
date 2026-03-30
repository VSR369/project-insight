

# Fix Re-Review Pipeline — 5 Root Cause Bugs

## Problem
Re-review for Solver Expertise, Eligibility, and Visibility produces junk because Pass 2 reads `challengeData["eligibility"]` → undefined, when the actual DB column is `solver_eligibility_types`. Same for visibility and solver_expertise. Additional bugs: stale closure in handleReReview, current_content ignored in normal mode, missing temperature, incomplete challengeContext.

## Changes

### File 1: `supabase/functions/review-challenge-sections/index.ts`

**Bug 1 — Field Alias Map (3 locations):**

1. Add module-level constant before `callAIPass2Rewrite` (~line 402):
```typescript
const SECTION_FIELD_ALIASES: Record<string, string> = {
  solver_expertise: 'solver_expertise_requirements',
  eligibility: 'solver_eligibility_types',
  visibility: 'solver_visibility_types',
  submission_guidelines: 'description',
};
```

2. In `callAIPass2Rewrite`, fix `isEmpty` check (line 425):
```typescript
// BEFORE:
const sectionContent = challengeData[r.section_key];
// AFTER:
const aliasedField = SECTION_FIELD_ALIASES[r.section_key] || r.section_key;
const sectionContent = challengeData[aliasedField] ?? challengeData[r.section_key];
```

3. In `callAIPass2Rewrite`, fix `originalContent` lookup (line 451):
```typescript
// BEFORE:
let originalContent = challengeData[r.section_key];
// AFTER:
const aliasedField = SECTION_FIELD_ALIASES[r.section_key] || r.section_key;
let originalContent = challengeData[aliasedField] ?? challengeData[r.section_key];
```

4. After extended_brief extraction for curation context (~line 1154), add data aliasing:
```typescript
// Alias section keys to their actual DB field values for Pass 1 JSON dump
if (resolvedContext === "curation") {
  if (!challengeData.solver_expertise && challengeData.solver_expertise_requirements) {
    challengeData.solver_expertise = challengeData.solver_expertise_requirements;
  }
  if (!challengeData.eligibility || challengeData.eligibility === '') {
    challengeData.eligibility = challengeData.solver_eligibility_types ?? null;
  }
  if (!challengeData.visibility || challengeData.visibility === '') {
    challengeData.visibility = challengeData.solver_visibility_types ?? null;
  }
  if (!challengeData.submission_guidelines) {
    challengeData.submission_guidelines = challengeData.description ?? null;
  }
}
```

**Bug 3 — Inject current_content in normal mode:**

After the curation alias block above, add:
```typescript
if (section_key && current_content != null) {
  challengeData[section_key] = current_content;
  const alias = SECTION_FIELD_ALIASES[section_key];
  if (alias) challengeData[alias] = current_content;
}
```

**Bug 4 — Temperature:** Already added in previous implementation (temperature 0.2 for Pass 1/2, 0 for complexity). Verify present — no change needed if already there.

### File 2: `src/components/cogniblend/shared/AIReviewInline.tsx`

**Bug 2 — Stale closure (line 526):**
```typescript
// BEFORE:
}, [challengeId, sectionKey, roleContext, onSingleSectionReview, onReReview]);
// AFTER:
}, [challengeId, sectionKey, roleContext, currentContent, challengeContext, onSingleSectionReview, onReReview]);
```

### File 3: `src/pages/cogniblend/CurationReviewPage.tsx`

**Bug 5 — Enrich challengeCtx (lines 2621-2634):**

Add `solution_type` and `operating_model` to the returned object:
```typescript
return {
  title: challenge?.title,
  maturity_level: challenge?.maturity_level,
  domain_tags: domainTags,
  complexity: challenge?.complexity_level ?? undefined,
  solution_type: challenge?.solution_type ?? undefined,
  operating_model: challenge?.operating_model ?? undefined,
  currency_code: challenge?.currency_code ?? 'USD',
  scope: ...,
  // ...rest unchanged
};
```
Add `challenge?.solution_type` and `challenge?.operating_model` to the dependency array.

## Deployment
- Redeploy `review-challenge-sections` edge function after changes.

## Files Modified
1. `supabase/functions/review-challenge-sections/index.ts` — Bugs 1, 3, 4
2. `src/components/cogniblend/shared/AIReviewInline.tsx` — Bug 2
3. `src/pages/cogniblend/CurationReviewPage.tsx` — Bug 5

