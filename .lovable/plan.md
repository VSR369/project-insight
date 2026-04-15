

# Curator Stabilization — Remaining Gaps Fix Plan

## Verified Status

After auditing all files, here is the true current state and what needs fixing:

---

## What's ACTUALLY Done (Confirmed)

| Item | Verified |
|------|----------|
| P1: mutateAsync, batched extended_brief, pauseSync/resumeSync, content sync removed | ✅ |
| P2: Real org data, visibility≠eligibility, org in edge functions | ✅ |
| P3: Edge functions exist (analyse-challenge, generate-suggestions, buildUnifiedContext) | ✅ |
| P3: Client calls unified endpoints (NOT old waves) | ✅ |
| P3: masterDataValidator called post-AI | ✅ |
| P4: Discovery uses gap_sections, extraction_quality column | ✅ |
| P5: Accept All batched + navigates to preview | ✅ |
| P5: Preview editing pipeline (PreviewSectionEditor + handleSectionSave) | ✅ |
| P5: Preview fresh data (staleTime: 0) | ✅ |
| P5: Preview button in RightRail | ✅ |

---

## Remaining Bugs & Gaps

### BUG 1: Response field mismatch (CRITICAL — analyse-challenge will silently fail)

`analyse-challenge` returns `{ data: { reviews: [...] } }` but client at line 207 reads `analyseResult.data?.sections`. This means `rawReviews` will always be `[]` — the analysis result is thrown away.

**Fix:** Change line 207 in `useCurationAIActions.ts`:
```
analyseResult.data?.sections → analyseResult.data?.reviews
```

Same issue for `generate-suggestions`: returns `data.reviews` but client at line 307 reads `genResult.data?.sections`.

**Fix:** Change line 307:
```
genResult.data?.sections → genResult.data?.reviews
```

### BUG 2: Stale closure in handleGenerateSuggestions (line 330)

Line 330 saves `aiReviews` (the closure capture) instead of the merged result. The `setAiReviews` updater returns the merged array but `saveSectionMutationRef.current.mutate` is called outside with stale `aiReviews`.

**Fix:** Capture the merged result and save it after `setAiReviews`:
```typescript
let mergedResult: SectionReview[] = [];
setAiReviews((prev) => {
  const merged = [...prev];
  // ... merge logic ...
  mergedResult = merged;
  return merged;
});
saveSectionMutationRef.current.mutate({ field: 'ai_section_reviews', value: mergedResult });
```

### GAP 3: Section dependency map missing from buildUnifiedContext

`SECTION_WAVE_CONTEXT` (strategicRole, upstream/downstream per section) exists in `contextIntelligence.ts` but is NOT included in the unified context document sent to the AI. The AI cannot flag cross-section dependency issues without it.

**Fix:** Add an inline section dependency map to `buildUnifiedContext.ts` (cannot import across function boundaries). Include it in the context object so `analyse-challenge` can inject it into the system prompt.

### GAP 4: Digest does not exclude low-quality sources

The digest query at line 81-86 of `generate-context-digest` filters by `discovery_status = 'accepted'` and `extraction_status IN ('completed','partial')` but does NOT add `.neq("extraction_quality", "low")`. Low-quality sources still enter the digest.

**Fix:** Add `.neq("extraction_quality", "low")` to the query chain.

### GAP 5: Digest prompt not gap-targeted

The digest system prompt is generic — it does not load Pass 1 gap sections or instruct the AI to focus on filling them.

**Fix:** Before building the prompt, fetch `ai_section_reviews` from the challenge. Extract sections with `status = 'needs_revision'` or `'generated'`. Add to system prompt: `"This challenge has gaps in: [sections]. Focus your digest on information that fills these gaps."`

### GAP 6: Correlation IDs missing in extract-attachment-text and generate-context-digest

Both functions lack a `correlationId` in their log output and responses.

**Fix:** Add `const correlationId = crypto.randomUUID().substring(0, 8);` at the start. Use in all `console.log/error` calls and include in response JSON.

---

## Implementation

### Files to modify:

1. **`src/hooks/cogniblend/useCurationAIActions.ts`** — Fix BUG 1 (response field names) and BUG 2 (stale closure)
2. **`supabase/functions/_shared/buildUnifiedContext.ts`** — Add inline section dependency map (GAP 3)
3. **`supabase/functions/analyse-challenge/index.ts`** — Include dependency map in system prompt
4. **`supabase/functions/generate-context-digest/index.ts`** — Add `.neq("extraction_quality", "low")`, load gap sections, add gap-targeted instructions, add correlationId (GAPs 4, 5, 6)
5. **`supabase/functions/extract-attachment-text/index.ts`** — Add correlationId (GAP 6)

### Edge functions to deploy:
- `analyse-challenge`
- `generate-context-digest`
- `extract-attachment-text`

