
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

## Gap Closure — Remaining (Prompts 4–8)
| Prompt | Target Files | Extractions Needed |
|--------|-------------|-------------------|
| 4 | `AICurationQualityPanel.tsx` (304), `EvaluationCriteriaSection.tsx` (289) | `QualityPanelCards`, `CriteriaRowEditor` |
| 5 | `SectionReferencePanel.tsx` (280), `ExtendedBriefDisplay.tsx` (254) | `ReferenceUploadForm`, `BriefSubsectionNav` |
| 6 | `useCurationPageData.ts` (329), `useCurationSectionActions.ts` (328) | `useCurationPageState`, `useCurationApprovalActions` |
| 7 | `curationFormStore.ts` (268), `useCurationAIActions.ts` (265), `curationHelpers.ts` (241) | `curationStoreActions`, `useCurationComplexityActions`, `curationParsers` |
| 8 | `CurationReviewPage.tsx` (282), borderline cleanup | `CurationPageShells`, trim borderline files |

### Still over target after Prompt 1-3:
- `renderCommercialSections.tsx` (216) — borderline, acceptable (pure switch/case)
- `CurationHeaderBar.tsx` (258) — progress strip still inline, could extract further
- `SectionPanelItem.tsx` (232) — borderline, acceptable (single component)
