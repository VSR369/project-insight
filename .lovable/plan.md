

# Fix: Runtime crash "Cannot read properties of undefined (reading 'icon')"

## Root Cause

In `AIReviewResultPanel.tsx` line 569, `STATUS_BADGE[result.status]` returns `undefined` when `result.status` contains a value not in the map (only `pass`, `warning`, `needs_revision`, `inferred` are defined). The AI review API likely returns a status like `"fail"` or `"error"` that has no entry, causing `statusBadge.icon` to crash on line 767.

## Fix

**File: `src/components/cogniblend/curation/AIReviewResultPanel.tsx`**

1. Add a fallback entry to handle unknown statuses:

```typescript
const statusBadge = STATUS_BADGE[result.status] 
  ?? STATUS_BADGE.warning;  // Safe fallback for unknown statuses
```

This single-line change on line 569 prevents the crash by falling back to the `warning` badge config when an unrecognized status comes from the API. No other files need changes.

