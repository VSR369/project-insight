

# Fix BulkActionBar to show total 27-section count

## Problem

The BulkActionBar displays "6 passed, 21 warnings" — these add up to 27, but the total is never shown explicitly. The "Review 21 sections" button reinforces the perception that only 21 sections were reviewed.

## Changes

### 1. Add total count to BulkActionBar (`src/components/cogniblend/curation/BulkActionBar.tsx`)

- Add a `totalCount` prop (computed as `passCount + warningCount + inferredCount`)
- Update the summary text from `"Review complete — 6 passed, 21 warnings"` to:
  `"Review complete — 27 sections reviewed: 6 passed, 21 warnings"`
- This makes the full coverage explicit at a glance

### 2. Pass totalCount from CurationReviewPage

In `CurationReviewPage.tsx` (~line 1808), pass the new prop:
```
totalCount={aiReviewCounts.pass + aiReviewCounts.warning + aiReviewCounts.inferred}
```

## Files Modified

| File | Change |
|------|--------|
| `src/components/cogniblend/curation/BulkActionBar.tsx` | Add `totalCount` prop, update summary text to show "27 sections reviewed" |
| `src/pages/cogniblend/CurationReviewPage.tsx` | Pass `totalCount` to BulkActionBar |

