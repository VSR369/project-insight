

# Phase 3: Staleness Tracking — Gap Analysis

## What's DONE (infrastructure is complete)

| Component | Status |
|-----------|--------|
| `sectionDependencies.ts` — DIRECT_DEPENDENCIES map + BFS + display names | Done |
| `SectionStoreEntry` — staleness fields (isStale, staleBecauseOf, staleAt, lastEditedAt, lastReviewedAt) | Done |
| `markSectionSaved()` store action — clears own staleness, propagates to dependents | Done |
| `clearStaleness()` store action | Done |
| `selectStaleSections` selector | Done |
| `CuratorSectionPanel` — "stale" status with amber border, badge, reason line | Done |
| `CurationActions` — staleSections/unreviewedSections props, blocked banner, disabled submit | Done |
| `useAiSectionReview` — clearStaleness on accept() and after successful review | Done |
| `notifyStaleness()` wrapper in CurationReviewPage | Done |
| `notifyStaleness` called in handleSaveSection, handleSaveDeliverables, handleSaveStructuredDeliverables, handleSaveEvalCriteria, handleSaveMaturityLevel, handleSaveExtendedBrief subsections | Done |
| `groupProgress` — stale sections excluded from "done" count | Done |

## What's NOT DONE (4 gaps)

### Gap 1: Panel status override for stale sections
`panelStatus` derivation (line ~2519) does NOT check for staleness. It only checks AI review status. If a section is stale, it should override to `"stale"`. Currently the `staleKeySet` is computed but never used to override `panelStatus`.

**Fix**: After the AI review status block, add: `if (staleKeySet.has(section.key)) panelStatus = "stale";`

### Gap 2: staleBecauseOf/staleAt props NOT passed to CuratorSectionPanel
Line 3082-3101: `<CuratorSectionPanel>` is rendered WITHOUT `staleBecauseOf` or `staleAt` props. The panel accepts them but never receives them, so the "Changed upstream" reason line never shows.

**Fix**: Pass `staleBecauseOf` and `staleAt` from the staleSections array to each panel.

### Gap 3: staleSections/unreviewedSections NOT passed to CurationActions
Line 3273-3284: `<CurationActions>` is rendered WITHOUT `staleSections`, `unreviewedSections`, `onNavigateToStale`, or `onReReviewStale` props. The component accepts and renders them, but never receives them.

**Fix**: Compute and pass `staleSections` (with display names/causes) and `unreviewedSections` to `CurationActions`. Add `onNavigateToStale` and `onReReviewStale` handlers.

### Gap 4: Right sidebar missing STALE category
Lines 3213-3270 render the AI Review Summary with Pass/Warning/Needs Revision categories but no STALE category. The spec requires a "STALE (re-review needed)" section above "Needs Revision" showing count and clickable section list.

**Fix**: Add stale section count badge and clickable list above the revision/warning sections.

### Gap 5: handleSaveComplexity missing notifyStaleness
Line 1353: `handleSaveComplexity` saves complexity parameters but does NOT call `notifyStaleness('complexity')`. This is a critical dependency — complexity has 5+ downstream sections.

**Fix**: Add `notifyStaleness('complexity')` after successful save.

## Implementation Plan

### Step 1: Fix panelStatus override (CurationReviewPage ~line 2526)
Add staleness check after AI review status derivation.

### Step 2: Pass stale props to CuratorSectionPanel (CurationReviewPage ~line 3082)
Look up staleness info from `staleSections` array and pass `staleBecauseOf`/`staleAt`.

### Step 3: Pass stale props to CurationActions (CurationReviewPage ~line 3273)
Map `staleSections` to the `StaleSectionInfo` shape and pass with handlers.

### Step 4: Add STALE category to right sidebar (CurationReviewPage ~line 3213)
Insert stale count badge and clickable section list before the existing summary.

### Step 5: Add notifyStaleness to handleSaveComplexity (CurationReviewPage ~line 1386)
Call after successful save.

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/cogniblend/CurationReviewPage.tsx` | All 5 gaps — panelStatus override, stale props to panel, stale props to actions, sidebar STALE category, complexity save handler |

No new files needed. All changes are wiring in a single file.

