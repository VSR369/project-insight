
# Phase D2.1 — Extract Data Hook from CurationReviewPage

## What We're Doing

Extract all `useState` declarations (lines 188-244) and `useQuery` calls (lines 254-373) from `CurationReviewPage.tsx` into a new custom hook `useCurationPageData`. This is a pure "cut-and-paste" extraction — no logic changes.

## File Created

### `src/hooks/cogniblend/useCurationPageData.ts` (~200 lines)

Receives `challengeId: string | undefined` and returns every state variable, setter, and query result as a flat object.

**Moves from CurationReviewPage:**
- ~35 `useState` declarations (lines 188-244): `activeGroup`, `editingSection`, `savingSection`, `approvedSections`, `aiReviews`, `aiReviewsLoaded`, `aiReviewLoading`, `phase2Progress`, `phase2Status`, `aiSuggestedComplexity`, `triageTotalCount`, `manualOverrides`, `expandVersion`, `highlightWarnings`, `showOnlyStale`, `guidedMode`, `dismissedPrereqBanner`, `optimisticIndustrySegId`, `escrowEnabled`, `isAcceptingAllLegal`, `preFlightResult`, `preFlightDialogOpen`, `budgetShortfall`, `contextLibraryOpen`, `aiQuality`, `aiQualityLoading`, `lockedSendState`
- 5 `useQuery` calls (lines 254-373): challenge query, orgTypeName query, legalDocs query, legalDetails query, escrowRecord query, sectionActions query
- `masterData` hook call (line 346)

**Imports:** Types from `curationTypes.ts`, supabase client, React Query, CACHE_STANDARD, etc.

## File Modified

### `CurationReviewPage.tsx` — Remove ~190 lines, add 1 import + destructure

Replace the moved declarations with:
```typescript
import { useCurationPageData } from '@/hooks/cogniblend/useCurationPageData';

// Inside component:
const pageData = useCurationPageData(challengeId);
const {
  activeGroup, setActiveGroup,
  editingSection, setEditingSection,
  // ... all ~35 state vars + 6 query results
} = pageData;
```

Remaining code uses the same variable names — zero changes needed downstream.

## Risk Assessment
- **LOW risk** — `useState` and `useQuery` are declaration-only with no closure dependencies on later-defined callbacks
- Hook ordering preserved: all hooks move together, maintaining call order
- No exported interfaces change
- No React Query keys change
- CurationReviewPage drops from ~3,356 to ~3,166 lines

## Verification
After implementation: open any challenge from /cogni/curation, verify all section groups render, queries load data, state changes work (editing, approvals, etc.), no console errors.
