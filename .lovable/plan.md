
Goal: remove the confusing AI-review states by making completion explicit, status logic consistent, and suggestion generation deterministic.

1) Keep Phase 2 progress at 100% after completion
- File: `src/pages/cogniblend/CurationReviewPage.tsx`
- Replace the current `{total, completed}` reset behavior with a run-state model:
  - `idle` (no run yet), `running`, `completed`.
- During review:
  - start with `running` + known total
  - increment completed per section
  - on finish, set `completed = total` and state = `completed` (do not clear to 0).
- UI:
  - keep showing the card after completion with `100%` and “Completed”.
  - clear only when a new AI review run starts.

2) Remove “PASS + warning comments” contradiction
- Files:
  - `supabase/functions/review-challenge-sections/index.ts`
  - `src/components/cogniblend/curation/AIReviewResultPanel.tsx`
- Backend normalization after LLM response:
  - if `status = pass` but comments are mandatory/actionable (e.g., must/add/include/missing/required), auto-convert to `warning`.
- Frontend rendering:
  - for true pass comments, display them as “Optional suggestions” (not warning/required badges).
  - keep warning/needs_revision as actionable.
- Result: if user sees Warning, it is truly something to address; Pass is non-blocking.

3) Make AI Suggested Version consistent for all warning sections
- Files:
  - `src/components/cogniblend/shared/AIReviewInline.tsx`
  - `src/pages/cogniblend/CurationReviewPage.tsx`
- Root issue: suggestions currently depend on inline component lifecycle/visibility, so some sections never get a suggestion immediately.
- Fix:
  - store refinement output per section at page level when Phase 2 runs (not only local component state).
  - extend review model with fields like:
    - `suggested_version?: string`
    - `refinement_state?: "pending" | "done" | "failed"`
  - pass this into `AIReviewInline` so every warning section shows either:
    - suggestion content, or
    - a deterministic pending/failed state with retry.
- This removes “some warnings have suggestion / some don’t” inconsistency.

4) UX copy cleanup to reduce confusion
- Files:
  - `src/components/cogniblend/shared/AIReviewInline.tsx`
  - `src/components/cogniblend/curation/AIReviewResultPanel.tsx`
- Update labels:
  - “Comments” → “Required fixes” for warning/needs_revision.
  - “Comments” → “Optional suggestions” for pass.
- Keep existing pass confirmation flow intact (Looks good / Flag for review).

Technical details
- No schema migration needed (stored in existing JSON review payload).
- `SectionReview` type should be updated in shared type definition to include refinement fields.
- Preserve existing triage confidence behavior; this plan only fixes state semantics and visibility consistency.

Validation checklist
- Run “Review Sections by AI”.
- Confirm progress card reaches and stays at `100% Completed`.
- Confirm no section displays Pass while showing warning/required comments.
- Confirm every warning/needs_revision section shows either a suggestion, a loader, or explicit failed+retry state (never blank).
- Confirm counts in right-rail summary match visible section statuses.
