

## Verification Results and Remaining Fixes

### Status of Each Bug

| Bug | Status | Evidence |
|-----|--------|----------|
| **Bug 1** | **PARTIAL — needs fix** | `autoSaveStatus` is destructured in `renderOrgSections.tsx` (line 40) and `renderCommercialSections.tsx` (line 34), but NOT in `renderProblemSections.tsx` or `renderOpsSections.tsx` |
| **Bug 3** | **NOT FIXED** | `PreFlightGateDialog.tsx` does not import or use `buildIncompleteGroups` from `incompleteSectionsUtil`. It uses its own `PreFlightResult` data source with separate `missingMandatory`/`warnings` arrays |
| **Bug 4** | **FIXED** | `useCurationPageOrchestrator.ts` lines 191-195 correctly set `contextLibraryReviewed` on drawer **close** (checks `prevContextLibraryOpenRef.current && !contextLibraryOpen && pass1DoneSession`) |
| **Bug 5** | **FIXED** | `ComplexityAssessmentModule.tsx` lines 104-112 use value-aware gating (`hasAiValues`, `hasManualValues`, `hasQuickSelect`) |
| **Bug 6** | **FIXED** | `rewardStructureResolver.ts` has `isTypeLocked` in interface (line 81), serializes to `_typeLocked` (lines 505-507), resolves with backward compat (line 421). `useRewardStructureState.ts` initializes from resolved (line 247) and includes in RewardData (line 539) |
| **Bug 7** | **FIXED** | `useRewardStructureHandlers.ts` has `handleApplyAITiers` (line 213). `MonetaryRewardEditor.tsx` has AI Split banner (lines 80-101) |
| **Bug 8** | **MOSTLY FIXED** | Right rail reordered. Minor deviation from spec: `WaveProgressPanel` is at position 4 (after ContextLibraryCard) instead of position 2. The spec wanted it before CompletenessChecklist |

### Changes Required

**1. Bug 1 — Pass `autoSaveStatus` in Problem and Ops renderers**

- `renderProblemSections.tsx`: Add `autoSaveStatus` to destructured args (line 33) and pass it to `LineItemsSectionRenderer` where appropriate
- `renderOpsSections.tsx`: Add `autoSaveStatus` to destructured args (line 26) and pass it to section renderers

**2. Bug 3 — Unify PreFlightGateDialog with incompleteSectionsUtil**

- `PreFlightGateDialog.tsx`: Import `buildIncompleteGroups` and accept `groups`, `sectionMap`, `groupProgress`, `challenge` props to derive incomplete sections from the shared utility instead of relying solely on `PreFlightResult.missingMandatory`
- This requires adding new props and using the utility alongside existing PreFlightResult data

**3. Bug 8 — Move WaveProgressPanel before CompletenessChecklist**

- `CurationRightRail.tsx`: Swap lines 154-158 so `WaveProgressPanel` comes before `CompletenessChecklistCard`

### Files changed

| File | Action |
|------|--------|
| `src/components/cogniblend/curation/renderers/renderProblemSections.tsx` | Destructure and use `autoSaveStatus` |
| `src/components/cogniblend/curation/renderers/renderOpsSections.tsx` | Destructure and use `autoSaveStatus` |
| `src/components/cogniblend/curation/PreFlightGateDialog.tsx` | Import and use `buildIncompleteGroups` from shared util |
| `src/components/cogniblend/curation/CurationRightRail.tsx` | Move WaveProgressPanel above CompletenessChecklist |

