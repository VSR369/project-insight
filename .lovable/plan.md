
# Batch D Implementation Plan

Next 6 files in the 430–500 line range, targeting ≤200 lines each.

## Files to Decompose

| # | File | Current | Extraction Plan |
|---|------|:-------:|-----------------|
| 1 | `ReviewerEditForm.tsx` | 499 | Extract `ReviewerFormFields.tsx` (form field groups) + `ReviewerFormSchema.ts` (Zod schema & types) |
| 2 | `useQuestionBank.ts` | 496 | Extract `questionBankMutations.ts` (create/update/delete mutations) |
| 3 | `InterviewKitImportDialog.tsx` | 488 | Extract `InterviewKitImportPreview.tsx` (preview table) + `interviewKitImportUtils.ts` (parsing/validation) |
| 4 | `PodcastStudio.tsx` | 482 | Extract `PodcastRecorder.tsx` (recording controls) + `PodcastEpisodeList.tsx` (episode list UI) |
| 5 | `LifecycleRulesPage.tsx` | 473 | Extract `LifecycleRuleEditor.tsx` (rule editing form) + `LifecycleRuleTable.tsx` (rules table) |
| 6 | `ProficiencyImportDialog.tsx` | 467 | Extract `ProficiencyImportPreview.tsx` (preview/validation UI) + `proficiencyImportParser.ts` (Excel parsing) |

## Safety Rules
- Move code only — no logic rewrites
- No interface changes
- Hook order preserved
