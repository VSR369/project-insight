

## Fix: "Should have a queue" React Crash

### Root Cause

The previous fix introduced `saveSectionMutationRef.current.mutate(...)` **inside** `setAiReviews(prev => { ... mutate(...); return merged })` functional updaters in two files. React forbids triggering state updates (which `mutate()` does internally) from within a `setState` updater function. This causes the fatal "Should have a queue" error.

**Affected locations:**
- `src/hooks/cogniblend/useCurationWaveSetup.ts` line 63
- `src/hooks/cogniblend/useCurationAIActions.ts` line 273

### Fix

Move the `mutate()` call **outside** the functional updater while still using the functional update to get the latest state. Pattern:

```typescript
// BEFORE (broken — mutate inside updater)
setAiReviews((prev) => {
  const merged = [...prev.filter(r => r.section_key !== sectionKey), { ...normalized, addressed: false }];
  saveSectionMutationRef.current.mutate({ field: 'ai_section_reviews', value: merged });
  return merged;
});

// AFTER (safe — compute in updater, persist after)
let mergedResult: SectionReview[] = [];
setAiReviews((prev) => {
  mergedResult = [...prev.filter(r => r.section_key !== sectionKey), { ...normalized, addressed: false }];
  return mergedResult;
});
// mutate outside the updater — React batches setState, so mergedResult is set by now
saveSectionMutationRef.current.mutate({ field: 'ai_section_reviews', value: mergedResult });
```

### Files to Change

1. **`src/hooks/cogniblend/useCurationWaveSetup.ts`** — `handleWaveSectionReviewed` (lines 57-66)
2. **`src/hooks/cogniblend/useCurationAIActions.ts`** — `handleSingleSectionReview` (lines 267-276)

Both get the same fix: extract `mutate()` to run after the `setAiReviews` call, not inside it.

### Technical Note

React 18's automatic batching ensures the `setAiReviews` updater runs synchronously before the next line, so `mergedResult` will contain the correct computed value when `mutate()` is called.

