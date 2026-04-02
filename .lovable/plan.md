

# Decomposition Gap Closure — 8-Prompt Implementation Plan

## Current State

15 files still exceed the 200-line target. Below is the prioritized list with extraction strategy for each.

## Files to Decompose

| # | File | Lines | Extraction |
|---|------|:-----:|------------|
| 1 | `renderSectionContent.tsx` | 702 | Split switch/case into 4 group renderers |
| 2 | `CurationHeaderBar.tsx` | 392 | Extract `OriginalBriefAccordion` + `GroupProgressStrip` |
| 3 | `CurationSectionList.tsx` | 340 | Extract `SectionPanelItem` (lines 178-319) |
| 4 | `useCurationPageData.ts` | 329 | Split into `useCurationPageState.ts` (useState) + keep queries |
| 5 | `useCurationSectionActions.ts` | 328 | Extract save callbacks vs approval callbacks |
| 6 | `AIReviewResultPanel.tsx` | 375 | Extract suggestion accept/reject state into hook |
| 7 | `CurationSectionEditor.tsx` | 323 | Extract `DateFieldEditor`, `SelectFieldEditor`, `RadioFieldEditor` |
| 8 | `AICurationQualityPanel.tsx` | 304 | Extract `QualityMetricCards` + `QualityGapList` |
| 9 | `EvaluationCriteriaSection.tsx` | 289 | Extract `CriteriaRowEditor` inline component |
| 10 | `SectionReferencePanel.tsx` | 280 | Extract `FileUploadCard` + `UrlReferenceCard` |
| 11 | `CurationReviewPage.tsx` | 282 | Trim loading/error/modal JSX into sub-components |
| 12 | `curationFormStore.ts` | 268 | Extract action creators into `curationStoreActions.ts` |
| 13 | `ExtendedBriefDisplay.tsx` | 254 | Extract subsection nav/rendering logic |
| 14 | `useCurationAIActions.ts` | 265 | Extract complexity + budget callbacks |
| 15 | `curationHelpers.ts` | 241 | Split parse utilities from field-value getters |

Borderline files (will trim but not block):
- `useWaveExecutor.ts` (235) — already has `useWaveReviewSection` extracted
- `CuratorSectionPanel.tsx` (220) — header already extracted
- `SolverExpertiseSection.tsx` (212) — view mode already extracted
- `useCurationPageOrchestrator.ts` (204) — thin orchestrator, acceptable

## Implementation Prompts (8 prompts)

### Prompt 1: `renderSectionContent.tsx` (702 → ~110 barrel)
Split the giant switch/case into 4 group-specific renderer files:
- `renderOrgSections.tsx` — `problem_statement`, `scope`, `hook`, `domain_tags`, `solver_expertise`, `context_and_background`
- `renderProblemSections.tsx` — `deliverables`, `submission_guidelines`, `expected_outcomes`, extended brief subsections (`root_causes`, `current_deficiencies`, `preferred_approach`, `approaches_not_of_interest`, `affected_stakeholders`)
- `renderCommercialSections.tsx` — `reward_structure`, `complexity`, `evaluation_criteria`, `ip_model`, `eligibility`, `visibility`, `maturity_level`, `solution_type`
- `renderOpsSections.tsx` — `phase_schedule`, `legal_docs`, `escrow_funding`, `data_resources_provided`, `success_metrics_kpis`

The parent becomes a thin dispatcher that imports all 4 and delegates by section key.

### Prompt 2: `CurationHeaderBar.tsx` (392 → ~165) + `CurationSectionList.tsx` (340 → ~175)
- Extract `OriginalBriefAccordion` (lines 269-392, ~123 lines) → `OriginalBriefAccordion.tsx`
- Extract `GroupProgressStrip` (lines 212-264, ~52 lines) → `GroupProgressStrip.tsx`
- Extract `SectionPanelItem` (lines 178-319 of CurationSectionList) → `SectionPanelItem.tsx` — the per-section rendering logic inside the `.map()`

### Prompt 3: `AIReviewResultPanel.tsx` (375 → ~185) + `CurationSectionEditor.tsx` (323 → ~160)
- Extract suggestion editing state + accept/reject logic from AIReviewResultPanel into `useAIReviewState.ts`
- Extract `DateFieldEditor`, `SelectFieldEditor`, `RadioFieldEditor` from CurationSectionEditor → `OrgPolicyEditors.tsx`

### Prompt 4: `AICurationQualityPanel.tsx` (304 → ~165) + `EvaluationCriteriaSection.tsx` (289 → ~155)
- Extract `QualityScoreCard` + `QualityGapList` + `LegalComplianceCard` → `QualityPanelCards.tsx`
- Extract `CriteriaRowEditor` (the editing row with inputs) → `CriteriaRowEditor.tsx`

### Prompt 5: `SectionReferencePanel.tsx` (280 → ~160) + `ExtendedBriefDisplay.tsx` (254 → ~160)
- Extract file upload handler + URL add form → `ReferenceUploadForm.tsx`
- Extract subsection panel rendering loop → `BriefSubsectionNav.tsx` (or merge into existing `BriefSubsectionContent.tsx`)

### Prompt 6: `useCurationPageData.ts` (329 → ~180) + `useCurationSectionActions.ts` (328 → ~180)
- Split `useCurationPageData` — move all `useState` declarations → `useCurationPageState.ts`, keep queries in original
- Split `useCurationSectionActions` — extract save/edit callbacks vs approval/locked-section callbacks → `useCurationApprovalActions.ts`

### Prompt 7: `curationFormStore.ts` (268 → ~170) + `useCurationAIActions.ts` (265 → ~175) + `curationHelpers.ts` (241 → ~160)
- Extract store action creators (staleness, validation, AI review setters) → `curationStoreActions.ts`
- Extract complexity + budget shortfall callbacks from useCurationAIActions → `useCurationComplexityActions.ts`
- Split `curationHelpers.ts` — move parse utilities (`parseJson`, `getFieldValue`) to `curationParsers.ts`, keep domain getters

### Prompt 8: `CurationReviewPage.tsx` (282 → ~195) + borderline cleanup
- Extract loading skeleton + not-found + modals JSX into `CurationPageShells.tsx`
- Trim `useWaveExecutor.ts` (235), `CuratorSectionPanel.tsx` (220), `SolverExpertiseSection.tsx` (212) if feasible with minor extractions
- Update `.lovable/plan.md` with final status
- Run regression contract verification

## Technical Details

- **Pattern**: Move, don't rewrite. Cut-paste with identical props/interfaces.
- **Hook order**: All hooks remain at top level before conditional returns.
- **Imports**: Parent files replace inline code with imports from new files.
- **Types**: Shared interfaces stay in existing type files; no new type files unless needed.
- **Data-only files**: `curationSectionDefs.tsx` (767 lines) is exempt — pure config data.
- **Testing**: Each prompt must pass TypeScript strict check with zero errors.

