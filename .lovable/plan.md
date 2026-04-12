

## Fix: AI Suggestions Not Generated During "Generate Suggestions" (Pass 2)

### Root Cause

The Pass 2 executor sends `provided_comments` in the wrong shape, causing Pass 2 to silently produce zero suggestions.

**Client side** (`useWaveReviewSection.ts`, line 61): sends `body.provided_comments = existingComments` — a flat array of comment objects for a **single section**: `[{text: "...", type: "warning"}]`

**Edge function** (`aiCalls.ts`, line 174-175): expects `providedComments` to be an array of **section review objects** with `section_key` and `comments` fields: `[{section_key: "hook", status: "warning", comments: [...]}]`

When `skipAnalysis=true`, the function does `pass1Results = providedComments`, then Pass 2 tries `pass1Results.filter(r => r.comments.some(...))` — but each element is a raw comment (`{text, type}`), not a section review. `r.comments` is `undefined`, `r.section_key` is `undefined`, so the filter returns zero sections, and Pass 2 returns an empty suggestion map.

Result: all 29 sections get their Pass 1 comments preserved but `suggestion: null`.

### Fix

**File: `src/hooks/useWaveReviewSection.ts`** (lines 57-63)

Wrap the provided comments into the section-review-object shape that the edge function expects:

```typescript
if (skipAnalysis && providedCommentsBySectionKey) {
  const existingComments = providedCommentsBySectionKey[sectionKey];
  if (existingComments?.length) {
    body.skip_analysis = true;
    // Edge function expects array of section review objects, not raw comments
    body.provided_comments = [{
      section_key: sectionKey,
      status: 'warning',
      comments: existingComments,
    }];
  }
}
```

This is a 3-line change in one file. The edge function code is correct — it just needs the right input shape.

### Why This Is the Complete Fix

1. `callAIBatchTwoPass` line 175: `pass1Results = providedComments` — now receives `[{section_key, status, comments}]`
2. `callAIPass2Rewrite` line 40: `pass1Results.filter(r => r.comments.some(...))` — now finds comments correctly
3. Line 44: `r.section_key` — now defined, so content lookup works
4. Pass 2 generates the suggestion and returns it in `suggestionMap`

### No Other Files Change

- Edge function logic is correct
- `useCurationWaveSetup.ts` pass2CommentMap is correct (it builds `Record<string, unknown[]>`)
- `useCurationAIActions.ts` handleGenerateSuggestions flow is correct

