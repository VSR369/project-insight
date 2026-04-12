

## Audit & Fix: Generate Suggestions + Accept Flow

### Issues Found

**Bug 1: `handleMarkAddressed` doesn't persist `addressed: true` to DB**

The previous fix removed `saveSectionMutation.mutate()` from `handleMarkAddressed` (to prevent a double-mutation crash), but nothing replaced it. The function now only calls `setAiReviews` (React state), which is never synced to the database. On page refresh, all sections revert to `addressed: false`.

The Zustand store has a `markAddressed(key)` method that would trigger `useCurationStoreSync` → DB persistence, but it's never called. Additionally, `markAddressed` clears `aiComments: null`, destroying audit history.

**Bug 2: Suggestions missing for "pass" sections with no actionable comments**

When Pass 2 runs via `skipAnalysis`, sections that Pass 1 marked as "pass" with only strength/best_practice comments still have `comments.length > 0`, so they enter `pass2CommentMap` and get `provided_comments` with `status: 'warning'`. However, if a section had `status: 'pass'` with ZERO comments, it's excluded from `pass2CommentMap`, causing the edge function to run a full fresh two-pass. This works but is inefficient. The real gap: sections with `status: 'pass'` and only strength comments get through to Pass 2 with `status: 'warning'`, but the AI may choose not to generate a substantial suggestion because the comments are all positive. The edge function returns `suggestion: null` for these.

**Bug 3: `handleAccept` → `onAcceptRefinement` saves content, but `onMarkAddressed` fails silently**

In `useAIReviewInlineState.ts` line 411, after `onAcceptRefinement` saves the content, `onMarkAddressed` is called synchronously. With the current broken `handleMarkAddressed`, the addressed flag is lost.

### Fix Plan

#### File 1: `src/hooks/cogniblend/useCurationApprovalActions.ts`

**Fix `handleMarkAddressed` to persist via Zustand store:**

```typescript
const handleMarkAddressed = useCallback((sectionKey: string) => {
  // Update React state for immediate UI feedback
  setAiReviews((prev) => prev.map((r) =>
    r.section_key === sectionKey ? { ...r, addressed: true } : r
  ));
  
  // Also update Zustand store → triggers useCurationStoreSync → DB persistence
  // Use a dedicated method that preserves comments (unlike markAddressed which clears them)
  const store = getCurationFormStore(challengeId);
  const entry = store.getState().getSectionEntry(sectionKey as SectionKey);
  store.getState().setAiReview(
    sectionKey as SectionKey,
    entry.aiComments ?? [],
    entry.aiSuggestion,
  );
  // Set addressed flag directly on the store entry
  store.setState((state) => ({
    sections: {
      ...state.sections,
      [sectionKey]: {
        ...(state.sections[sectionKey as SectionKey] ?? createEmptySectionEntry()),
        addressed: true,
      },
    },
  }));
}, [setAiReviews, challengeId]);
```

Wait — `store.setState` isn't exposed on the zustand store created with `persist`. I need to use an existing store method or add one.

**Better approach:** Add a new `setAddressedOnly` method to the Zustand store that sets `addressed: true` WITHOUT clearing comments.

#### File 2: `src/store/curationFormStore.ts`

Add `setAddressedOnly` method:

```typescript
setAddressedOnly: (key: SectionKey) =>
  set((state) => ({
    sections: {
      ...state.sections,
      [key]: {
        ...(state.sections[key] ?? createEmptySectionEntry()),
        addressed: true,
        // DO NOT clear aiComments — preserve for audit history
      },
    },
  })),
```

#### File 1 (revised): `src/hooks/cogniblend/useCurationApprovalActions.ts`

```typescript
const handleMarkAddressed = useCallback((sectionKey: string) => {
  // React state for immediate UI
  setAiReviews((prev) => prev.map((r) =>
    r.section_key === sectionKey ? { ...r, addressed: true } : r
  ));
  // Zustand store → triggers store sync → DB persistence
  const store = getCurationFormStore(challengeId);
  store.getState().setAddressedOnly(sectionKey as SectionKey);
}, [setAiReviews, challengeId]);
```

Add import for `getCurationFormStore` and `SectionKey`.

#### File 3: `src/hooks/useCurationStoreSync.ts` (lines 127-136)

The store sync builds `reviewEntries` from the Zustand store. Currently it always overwrites `comments` and `status` from the store entry. When `setAddressedOnly` fires, the store sync must correctly emit `addressed: true` while preserving existing review data.

Current code already reads `entry.addressed` (line 134), so once the Zustand store is updated, the sync will pick it up correctly. No changes needed here.

#### File 4: `src/hooks/useWaveReviewSection.ts` (lines 57-66)

For sections with NO comments in `pass2CommentMap`, `skip_analysis` is not set, causing a full re-analysis. This is wasteful and can produce different Pass 1 results than the original analysis. Fix: when `skipAnalysis` is true but no comments exist for a section, still set `skip_analysis` with an empty provided_comments that has status 'pass' — this tells the edge function to skip Pass 1 but still run Pass 2 for content generation:

```typescript
if (skipAnalysis && providedCommentsBySectionKey) {
  const existingComments = providedCommentsBySectionKey[sectionKey];
  body.skip_analysis = true;
  body.provided_comments = [{
    section_key: sectionKey,
    status: existingComments?.length ? 'warning' : 'generated',
    comments: existingComments ?? [],
  }];
}
```

This ensures ALL sections get Pass 2 suggestions during Generate Suggestions, regardless of whether they had Pass 1 comments.

#### File 5: `supabase/functions/review-challenge-sections/aiPass2.ts` (line 40-48)

The filter `sectionsNeedingSuggestion` currently skips sections with `status: 'pass'` and no actionable comments. Add `status === 'generated'` is already there. But with the client fix above, all sections come through with either 'warning' or 'generated' status. However, as a safety net, also include sections where `waveAction` is not 'review':

No changes needed — the client fix ensures correct status values reach here.

### Summary of Changes

| # | File | Change |
|---|------|--------|
| 1 | `src/store/curationFormStore.ts` | Add `setAddressedOnly(key)` method that preserves comments |
| 2 | `src/hooks/cogniblend/useCurationApprovalActions.ts` | Call `setAddressedOnly` on Zustand store for DB persistence |
| 3 | `src/hooks/useWaveReviewSection.ts` | Always set `skip_analysis` during Pass 2, even for commentless sections |
| 4 | Deploy edge function | No code changes, just redeploy with existing code |

