

## Remove Dead `handleAcceptAllPassing` Code

### Problem
`handleAcceptAllPassing` is obsolete — replaced by `handleAcceptAllSuggestions`. It still exists in two files but has zero UI consumers.

### Changes

| # | File | Change |
|---|------|--------|
| 1 | `src/hooks/cogniblend/useCurationComplexityActions.ts` | Delete `handleAcceptAllPassing` function (lines 67-72), remove from return object, update JSDoc |
| 2 | `src/hooks/cogniblend/useCurationPageOrchestrator.ts` | Delete the `handleAcceptAllPassing` wrapper (line 159), remove from spread in return object (line 290) |

### Technical Detail
- No interface or prop changes needed — no `.tsx` file references `handleAcceptAllPassing`
- The options interface on `useCurationComplexityActions` stays unchanged (no params were used for this function beyond `aiReviews` already in deps)

