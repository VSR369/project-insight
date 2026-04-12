

## Revised: Accept All AI Suggestions — Correct Skip List

### What Changed From Previous Plan

The previous plan over-skipped. The correct approach: **iterate all sections with a non-null `aiSuggestion` in the Zustand store, and skip only sections where acceptance is structurally impossible.**

### Actual Skip List (Only 2 Categories)

**Hard-locked (never receive suggestions, `aiReviewEnabled: false`):**
- `legal_docs`, `escrow_funding`

**No AI suggestions generated (`aiCanDraft: false`, so `aiSuggestion` will always be null):**
- `creator_references`, `reference_urls`, `solver_audience`, `evaluation_config`, `creator_legal_instructions`

These don't need an explicit skip list — they simply won't have `aiSuggestion` in the store. The bulk handler just needs: **"for every section where `aiSuggestion != null && !addressed`, call accept."**

### Sections That MUST Be Included (Previously Wrong)

| Section | `aiCanDraft` | Accept Handler Path |
|---------|-------------|-------------------|
| `complexity` | true | `handleAcceptRefinement` → line 73 → `complexityModuleRef.current?.saveAiDraft()` |
| `reward_structure` | true | `handleAcceptRefinement` → line 103 → `normalizeRewardStructure` → `rewardStructureRef` |

**Problem:** Both use component refs (`complexityModuleRef`, `rewardStructureRef`). During bulk accept, these refs are only valid if the component is mounted (i.e., the section panel is rendered). However, `handleAcceptRefinement` already handles these — it will work as long as the ref is available. If the ref is null (component not visible), the save silently fails for complexity and `normalizeRewardStructure` returns null for reward_structure.

**Fix:** For bulk accept, these two sections need a direct DB save path that bypasses the refs:
- `complexity`: extract the code from the suggestion, match against `complexityOptions`, save via `saveSectionMutation({ field: 'complexity_level', value: matchedCode })`
- `reward_structure`: parse the JSON suggestion, save via `saveSectionMutation({ field: 'reward_structure', value: parsed })`

### Extended Brief Subsections — Batched Write

These 6 subsections all map to the same `extended_brief` JSONB column. Individual writes would cause race conditions (each read-modify-write could overwrite the previous). Batch them:

1. Read current `challenge.extended_brief` once
2. Merge all subsection suggestions into the object
3. Single `saveSectionMutation({ field: 'extended_brief', value: merged })`

### Implementation Plan

| # | File | Change |
|---|------|--------|
| 1 | `src/hooks/cogniblend/useCurationComputedValues.ts` | Add `suggestionsCount`: count store entries with `aiSuggestion != null && !addressed` |
| 2 | `src/hooks/cogniblend/useCurationAcceptRefinement.ts` | Add `handleBulkAcceptAll` that: (a) collects all sections with suggestions, (b) partitions into regular/extended_brief, (c) for complexity: direct code-match save bypassing ref, (d) for reward_structure: direct JSON save bypassing ref, (e) for extended_brief: batched merge, (f) staggered 100ms saves for all others, (g) marks all addressed |
| 3 | `src/components/cogniblend/curation/BulkActionBar.tsx` | Replace "Accept all passing" button with "Accept All AI Suggestions (N)" + AlertDialog confirmation |
| 4 | `src/components/cogniblend/curation/CurationHeaderBar.tsx` | Pass new props to BulkActionBar |
| 5 | `src/hooks/cogniblend/useCurationPageOrchestrator.ts` | Wire `handleBulkAcceptAll` and `suggestionsCount` |
| 6 | Cleanup: remove old `handleAcceptAllPassing` if it still exists |

### Bulk Accept Flow

```text
1. Scan Zustand store → collect sections where aiSuggestion != null && !addressed
2. Show AlertDialog: "Accept AI suggestions for N sections?"
3. On confirm:
   a. Group into: regular[], extendedBrief[], complexity?, rewardStructure?
   b. complexity → match code against masterData.complexityOptions → direct save
   c. rewardStructure → parse JSON → direct save  
   d. extendedBrief[] → read current brief → merge all → single save
   e. regular[] → staggered handleAcceptRefinement (100ms apart)
   f. Mark all as addressed via setAddressedOnly
   g. Toast: "Accepted AI suggestions for N sections"
```

