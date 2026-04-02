
# Batch C Implementation Plan

Next 6 files in the 400-484 line range, targeting ≤200 lines each.

## Files to Decompose

| # | File | Current | Extraction Plan |
|---|------|:-------:|-----------------|
| 1 | `StepRequirements.tsx` | 484 | Extract `RequirementsFieldGroups.tsx` (form field sections) |
| 2 | `useSubmitSolutionRequest.ts` | 473 | Extract `solutionSubmitHelpers.ts` (validation/transform logic) |
| 3 | `EscrowManagementPage.tsx` | 452 | Extract `EscrowDetailPanel.tsx` + `EscrowTable.tsx` |
| 4 | `CogniLoginPage.tsx` | 446 | Extract `CogniLoginForm.tsx` + `CogniLoginLayout.tsx` |
| 5 | `SolverExpertiseSection.tsx` | 426 | Extract `ExpertiseDisplayCards.tsx` + `ExpertiseEditor.tsx` |
| 6 | `CurationRightRail.tsx` | 425 | Extract `RightRailSections.tsx` (panel sub-sections) |

## Safety Rules
- Move code only — no logic rewrites
- No interface changes
- Hook order preserved
