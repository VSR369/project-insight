

# Fix: Maximum Update Depth Exceeded on Curation Review Page

## Root Cause

After extensive analysis of the 3495-line `CurationReviewPage.tsx` and its hooks, three interacting issues create the infinite update loop:

### 1. Zustand selector creates new array references on every store change (PRIMARY)
Line 1288: `curationStore(selectStaleSections)` uses Zustand's default `Object.is` equality. The `selectStaleSections` selector uses `.filter().map()` which always returns a NEW array — even when empty. Every store mutation (from hydration, sync, AI review) triggers a re-render because `[] !== []`.

### 2. Side effects inside setState updaters
Lines 1385, 1953, 1999, 2063: `saveSectionMutation.mutate()` is called INSIDE `setAiReviews()` updater callbacks. This triggers async mutations during state transitions, which on success invalidate queries, which change `challenge`, which triggers effects that update the store, which triggers the selector issue above.

### 3. Unstable dependency in content migration effect
Line 1443: `saveSectionMutation` (from `useMutation`) is in the dependency array. TanStack Query returns a new object reference each render, so this effect re-registers every render. Combined with issues 1 and 2, this amplifies the cascade.

## Fix Plan

### Fix 1: Add shallow equality to Zustand selector (stops the re-render cascade)
**File:** `src/pages/cogniblend/CurationReviewPage.tsx`
- Import `useShallow` from `zustand/react/shallow`
- Change line 1288 from:
  `const staleSections = curationStore ? curationStore(selectStaleSections) : [];`
  to:
  `const staleSections = curationStore ? curationStore(useShallow(selectStaleSections)) : [];`

  Note: Since `useShallow` is a hook and can't be called conditionally, restructure to always call it or use the `shallow` comparator function directly:
  `const staleSections = curationStore ? curationStore(selectStaleSections, shallow) : [];`

### Fix 2: Move mutation calls out of setState updaters (4 locations)
**File:** `src/pages/cogniblend/CurationReviewPage.tsx`

For `handleWaveSectionReviewed` (line 1380), `handleSingleSectionReview` (line 1947), `handleComplexityReReview` (line 1996), and `handleMarkAddressed` (line 2057):

Pattern change from:
```ts
setAiReviews((prev) => {
  const updated = ...;
  saveSectionMutation.mutate({ field: "ai_section_reviews", value: updated });
  return updated;
});
```
To:
```ts
const updated = aiReviews.filter(...); // compute outside setter
setAiReviews(updated);
saveSectionMutation.mutate({ field: "ai_section_reviews", value: updated });
```

### Fix 3: Remove unstable dependency from content migration effect
**File:** `src/pages/cogniblend/CurationReviewPage.tsx`

Line 1443: Change `[challenge, saveSectionMutation]` to `[challenge]` and use a ref for the mutation:
```ts
const saveSectionMutationRef = useRef(saveSectionMutation);
saveSectionMutationRef.current = saveSectionMutation;

useEffect(() => {
  if (!challenge || contentMigrationRanRef.current) return;
  contentMigrationRanRef.current = true;
  // ... use saveSectionMutationRef.current.mutate()
}, [challenge]);
```

## Files Modified
- `src/pages/cogniblend/CurationReviewPage.tsx` — all 3 fixes

## Risk
- Low risk: all changes preserve existing behavior while eliminating the re-render cascade
- Fix 1 alone likely resolves the crash; Fixes 2-3 are defense-in-depth

