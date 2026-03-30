

# Fix: AI Must Always Return Suggestions When Comments Require Action

## Problem

The LLM prompt explicitly instructs `suggestion: null for pass`, and uses weak language ("optionally a suggestion") for single-section reviews. This means even when AI comments contain actionable warnings, suggestions, or errors, the suggested improved content is often missing — leaving users with feedback but no revised version.

## Design Rule

| Comment Types Present | Suggestion Required? |
|---|---|
| Only `strength`, `best_practice` | No — skip suggestion |
| Any `error`, `warning`, `suggestion` | Yes — must return improved content |
| Status `generated` | Yes — always (new content) |
| Status `needs_revision` | Yes — always |

## Changes

### 1. Edge Function Prompt — Structured prompt (Line 209-212)

**File:** `supabase/functions/review-challenge-sections/promptTemplate.ts`

Update the suggestion instruction in the structured prompt from:

```
- For "pass": null or omit.
```

To:

```
- For "pass" with ONLY strength/best_practice comments: null or omit.
- For "pass" with any error/warning/suggestion comments: MUST include improved content addressing those comments.
```

### 2. Edge Function Prompt — Legacy prompt (Line 377-379)

Same file, update legacy prompt from:

```
suggestion: improved content for warning/needs_revision sections (null for pass)
```

To:

```
suggestion: improved content addressing error/warning/suggestion comments. Required for warning/needs_revision/generated. For pass sections, include suggestion ONLY if comments contain error, warning, or suggestion types; omit if only strength/best_practice.
```

### 3. Edge Function — Single-section re-review prompt (Line 808)

**File:** `supabase/functions/review-challenge-sections/index.ts`

Change the weak "optionally a suggestion" to explicit:

```
Review ONLY the "{section_key}" section... For each section, return: status, specific comments with severity. If ANY comment has type error, warning, or suggestion, you MUST also return a "suggestion" field with improved content that addresses all those comments. Only omit suggestion when all comments are strength or best_practice type.
```

### 4. Edge Function — Global review prompt (Line 810)

Same file, apply the same instruction to the batch review prompt.

### 5. Frontend — Auto-refine fallback for pass sections with actionable comments

**File:** `src/components/cogniblend/shared/AIReviewInline.tsx` (Line 314-315)

Currently `if (review.status === 'pass') return;` blocks the refine fallback. Update to only skip when no actionable comments exist:

```typescript
if (review.status === 'pass') {
  // Only skip refine if all comments are strength/best_practice (no action needed)
  const hasActionable = review.comments?.some((c: any) => {
    const type = typeof c === 'string' ? 'warning' : (c.type || c.severity || 'warning');
    return type === 'error' || type === 'warning' || type === 'suggestion';
  });
  if (!hasActionable) return;
}
```

This ensures that if the LLM still returns `pass` but with actionable comments and no inline suggestion, the separate refine call fires as a fallback.

## Files Changed

- `supabase/functions/review-challenge-sections/promptTemplate.ts` — 2 prompt edits
- `supabase/functions/review-challenge-sections/index.ts` — 2 prompt edits
- `src/components/cogniblend/shared/AIReviewInline.tsx` — 1 logic edit

## When AI Suggestions Are Skipped (Clear Summary)

- Status `pass` + only `strength`/`best_practice` comments → No suggestion (content is good)
- Status `pass` + any `error`/`warning`/`suggestion` comment → Suggestion required
- Status `warning` or `needs_revision` → Suggestion always required
- Status `generated` → Suggestion always required (it IS the content)

