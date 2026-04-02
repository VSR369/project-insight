
# Batch E+F + Gap Closure Implementation Plan

## Completed (Batches E+F)
| # | File | Before | After | Extractions |
|---|------|:------:|:-----:|-------------|
| 1 | `Register.tsx` | 992 | ~165 | `RegisterProviderForm`, `RegisterReviewerForm`, `RegisterAdminForm`, `registerConstants` |
| 2 | `StepProblem.tsx` | 878 | **67** | `StepProblemCoreFields`, `StepProblemContentFields`, `StepProblemClassificationFields`, `StepProblemSubComponents` |
| 3 | `PlanSelectionForm.tsx` | 915 | **306** | `PlanTierCard`, `PlanEnterpriseCard`, `planSelectionHelpers` |
| 4 | `BillingForm.tsx` | 864 | **239** | `BillingAddressFields`, `BillingPaymentSection`, `BillingOrderSummary` |
| 5 | `SolutionSubmitPage.tsx` | 856 | **~170** | `SolutionSubmitConstants`, `SolutionSubmitGateScreens`, `SolutionSubmitFormSections` |
| 6 | `Dashboard.tsx` | 787 | **~195** | `DashboardHelpers`, `DashboardStatsCards`, `DashboardEnrollmentCard` |

## Gap Closure — Completed (Prompts 1–3)
| Prompt | File | Before | After | Extractions |
|--------|------|:------:|:-----:|-------------|
| 1 | `renderSectionContent.tsx` | 702 | **109** | `renderOrgSections` (188), `renderProblemSections` (181), `renderCommercialSections` (216), `renderOpsSections` (145) |
| 2 | `CurationHeaderBar.tsx` | 392 | **258** | `OriginalBriefAccordion` (141) |
| 2 | `CurationSectionList.tsx` | 340 | **185** | `SectionPanelItem` (232) |
| 3 | `AIReviewResultPanel.tsx` | 375 | **199** | `useAIReviewEditState` (189) |
| 3 | `CurationSectionEditor.tsx` | 323 | **180** | `OrgPolicyEditors` (156) |

## Gap Closure — Completed (Prompts 4–8)
| Prompt | File | Before | After | Extractions |
|--------|------|:------:|:-----:|-------------|
| 4 | `AICurationQualityPanel.tsx` | 304 | **99** | `QualityPanelCards` (176) |
| 4 | `EvaluationCriteriaSection.tsx` | 289 | **81** | `CriteriaEditMode` (186) |
| 5 | `SectionReferencePanel.tsx` | 280 | **168** | `ReferenceUploadForm` (88) |
| 5 | `ExtendedBriefDisplay.tsx` | 254 | **208** | `BriefIndustrySegmentField` (73) |
| 6 | `useCurationSectionActions.ts` | 328 | **145** | `useCurationApprovalActions` (175) |
| 7 | `useCurationAIActions.ts` | 265 | **171** | `useCurationComplexityActions` (89) |
| 7 | `curationHelpers.ts` | 241 | **123** | `curationParsers` (128) |

### Borderline files (accepted):
- `ExtendedBriefDisplay.tsx` (208) — 8 lines over, includes re-exports for backward compat
- `CurationHeaderBar.tsx` (258) — progress strip still inline
- `SectionPanelItem.tsx` (232) — single component
- `renderCommercialSections.tsx` (216) — pure switch/case
- `curationFormStore.ts` (268) — Zustand store, actions tightly coupled to set/get
- `CurationReviewPage.tsx` (282) — thin orchestrator, loading skeleton only 15 lines
- `useCurationPageData.ts` (329) — type interface is 110 lines, queries are minimal
- `useCurationPageOrchestrator.ts` (204) — barely over, acceptable

## All Gap Closure Complete ✅
