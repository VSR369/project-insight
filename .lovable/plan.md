

# Phase D2.1 — Extract Data Hook from CurationReviewPage

## Summary
Move all `useState` declarations (lines 188-244) and `useQuery` calls (lines 254-373 + masterData at line 346) from `CurationReviewPage.tsx` into a new custom hook `useCurationPageData.ts`. Pure cut-and-paste — no logic changes.

## File Created

### `src/hooks/cogniblend/useCurationPageData.ts` (~230 lines)

**Receives:** `challengeId: string | undefined`

**Moves from CurationReviewPage (lines 188-373):**

State declarations (~30 useState calls):
- `activeGroup`, `editingSection`, `savingSection`, `approvedSections`
- `aiReviews`, `aiReviewsLoaded`, `aiReviewLoading`
- `phase2Progress`, `phase2Status`, `aiSuggestedComplexity`
- `triageTotalCount`, `manualOverrides`, `expandVersion`
- `highlightWarnings`, `showOnlyStale`, `guidedMode`, `dismissedPrereqBanner`
- `optimisticIndustrySegId`, `escrowEnabled`, `isAcceptingAllLegal`
- `preFlightResult`, `preFlightDialogOpen`, `budgetShortfall`
- `contextLibraryOpen`, `aiQuality`, `aiQualityLoading`, `lockedSendState`

Query declarations (6 useQuery + 1 hook):
- `challenge` query (curation-review)
- `orgTypeName` query (curation-org-type)
- `legalDocs` query (curation-legal-summary)
- `legalDetails` query (curation-legal-details)
- `escrowRecord` query (curation-escrow)
- `sectionActions` query (curator-section-actions)
- `masterData` via `useCurationMasterData()`

**Does NOT move** (stays in CurationReviewPage because they have closure dependencies):
- `handleExpandCollapseAll` callback (line 224) — depends on `activeGroup` + `GROUPS`
- All other hooks that depend on returned state (useSectionApprovals, useCurationStoreHydration, etc.)

**Returns:** flat object with every state variable, setter, and query result — enabling zero-change destructuring in the parent.

**Exports:** `CurationPageState` interface for type safety.

## File Modified

### `CurationReviewPage.tsx`

1. Add import:
```typescript
import { useCurationPageData } from '@/hooks/cogniblend/useCurationPageData';
```

2. Replace lines 188-373 (the useState + useQuery block) with:
```typescript
const {
  activeGroup, setActiveGroup, editingSection, setEditingSection,
  savingSection, setSavingSection, approvedSections, setApprovedSections,
  aiReviews, setAiReviews, aiReviewsLoaded, setAiReviewsLoaded,
  aiReviewLoading, setAiReviewLoading, phase2Progress, setPhase2Progress,
  phase2Status, setPhase2Status, aiSuggestedComplexity, setAiSuggestedComplexity,
  triageTotalCount, setTriageTotalCount, manualOverrides, setManualOverrides,
  expandVersion, setExpandVersion, highlightWarnings, setHighlightWarnings,
  showOnlyStale, setShowOnlyStale, guidedMode, setGuidedMode,
  dismissedPrereqBanner, setDismissedPrereqBanner,
  optimisticIndustrySegId, setOptimisticIndustrySegId,
  escrowEnabled, setEscrowEnabled, isAcceptingAllLegal, setIsAcceptingAllLegal,
  preFlightResult, setPreFlightResult, preFlightDialogOpen, setPreFlightDialogOpen,
  budgetShortfall, setBudgetShortfall, contextLibraryOpen, setContextLibraryOpen,
  aiQuality, setAiQuality, aiQualityLoading, setAiQualityLoading,
  lockedSendState, setLockedSendState,
  challenge, isLoading, orgTypeName,
  legalDocs, legalDetails, escrowRecord, masterData, sectionActions,
} = useCurationPageData(challengeId);
```

3. Keep `handleExpandCollapseAll` (moves right after the destructure since it depends on `activeGroup`).

4. Remove now-unused imports: `CACHE_STANDARD` (if only used by moved queries), `useCurationMasterData` (now imported in hook).

## Technical Details

- All hook calls maintain identical order (useState first, then useQuery) — no hook ordering violations
- All React Query keys unchanged
- All Supabase table/column references unchanged
- The `orgTypeName` query depends on `challenge?.organization_id` which is returned by the challenge query within the same hook — this is safe since both are `useQuery` calls in the same render cycle

## Risk Assessment
- **LOW risk** — pure declaration extraction, no closures, no side effects
- CurationReviewPage drops from ~3,356 to ~3,170 lines (~186 lines removed)

## Verification
Open any challenge from /cogni/curation → all 6 section groups render → section content displays → editing works → no console errors → no TypeScript errors.

