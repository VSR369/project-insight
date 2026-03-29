

# Fix: Industry Segment Selection Not Persisting / Pre-Flight Still Blocking

## Root Cause Analysis

Based on network logs, **no PATCH request was made** when the user selected an industry segment. This means `handleIndustrySegmentChange` either wasn't invoked or returned early. Two issues found:

1. **Context & Background section may not be expanded/visible** when the user navigates to it from the pre-flight dialog. The `onGoToSection('context_and_background')` navigates to the correct tab, but the industry segment dropdown is rendered inside the section's case block — if the section isn't the active/visible one, the user may see the tab but not the dropdown.

2. **Double-encoding risk**: `handleIndustrySegmentChange` calls `JSON.stringify(currentElig)` before passing to `.update()`. The Supabase JS client already serializes the body to JSON, so JSONB columns should receive plain objects, not pre-stringified values. This could cause the saved value to be a JSON string literal rather than a JSON object, making `parseJson` return the right result once but potentially causing issues with the fallback chain.

3. **No visual confirmation in the dropdown itself**: After save + query invalidation + refetch, the dropdown re-renders from scratch. If the refetch is slow, the user sees the old state momentarily.

## Plan (1 file, ~15 lines changed)

### File: `src/pages/cogniblend/CurationReviewPage.tsx`

**Fix 1 — Remove double-encoding**: Change the save from `JSON.stringify(currentElig)` to passing the object directly:
```typescript
// Before (double-encodes):
.update({ eligibility: JSON.stringify(currentElig) })

// After (correct for JSONB):
.update({ eligibility: currentElig })
```

**Fix 2 — Await query refetch before proceeding**: Change `invalidateQueries` to await the refetch so the UI reflects the updated value immediately:
```typescript
await queryClient.invalidateQueries({ queryKey: ["curation-review", challengeId] });
```

**Fix 3 — Pre-flight dialog navigation**: When `onGoToSection('context_and_background')` fires, ensure it scrolls to and highlights the industry segment field so the user knows exactly where to act. Add a small auto-scroll-to-element behavior using the existing section navigation mechanism.

## Risk
- Very low — fixes a data serialization bug and adds proper async handling
- No behavioral change for users who already have the segment set from intake
