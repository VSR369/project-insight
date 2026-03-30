
Goal: deliver a full bug audit + concrete fix plan for complexity score instability, accept-not-reflecting behavior, and AI/manual override confusion.

What I found (fixed vs not fixed)

1) Bug-1 (Accept computes wrong score) — Fixed
- CurationReviewPage now delegates complexity accept to module ref:
  `complexityModuleRef.current?.saveAiDraft();`
- Old simple-average path is removed.

2) Bug-2 (save uses wrong param set) — Fixed
- Module passes `resolvedParams` (effective dimensions + weights).
- `handleSaveComplexity` now prioritizes `resolvedParams` over generic `complexityParams`.

3) Bug-4 (manual tab lacks AI reference) — Fixed
- Manual tab now shows AI reference badge (AI recommended score/level).

4) Bug-3 (display fallback logic) — Still logically weak
- `hasDraftValues` is always true, so fallback to `currentScore` is dead code.
- Not always user-visible now, but still an architectural defect.

New root-cause bugs still open (critical)

A) CRITICAL: `solution_type` is null for this challenge, so AI and UI use different dimension systems
- DB confirms challenge has `solution_type = null`.
- Edge function complexity path defaults to `'ideation'` when solution_type missing.
- No `'ideation'` rows exist in `complexity_dimensions`, so it falls back to arbitrary active dimensions.
- UI module uses generic params when `solutionType` is null.
- Result: AI ratings keys and UI/save keys can mismatch; accept may appear to “not update” or update incorrectly.

B) CRITICAL: Non-deterministic fallback dimensions in edge function
- Fallback query uses active dimensions with `limit(10)` and no strict solution-type enforcement.
- This can mix domains and produce unstable scoring behavior run-to-run.

C) HIGH: AI rating import silently drops unmatched keys
- In `ComplexityAssessmentModule`, AI ratings are only applied for keys in `effectiveParams`.
- When keys mismatch, draft keeps old/default values (often 5), causing “AI accepted but nothing changed”.

D) HIGH: Drafts do not rehydrate from new DB values after mutation/refetch
- `aiDraft`/`manualDraft` are initialized once from props; there is no robust re-sync when `currentParams/currentScore` changes after save.
- Creates stale UI perception and mismatch confusion.

E) MEDIUM: AI complexity panel in review uses simple average for display
- `AIReviewResultPanel` “AI Complexity Assessment” badge uses unweighted average.
- Module uses weighted score; user sees two different numbers.

F) MEDIUM (separate regression): Submission guidelines mapping still points to `description` in store sync/hydration hooks
- `useCurationStoreSync` and `useCurationStoreHydration` still map submission_guidelines ↔ description.
- This can reintroduce content collisions and noisy context.

G) LOW: Complexity comment text says `/5` while scale is `/10`
- Cosmetic but misleading in review comments.

H) LOW: Ref warnings in console remain
- Runtime warnings indicate refs passed to non-forwardRef components in curation render paths.

Why AI score changes run-to-run (direct answer)
- Current complexity call sends broad challenge JSON and uses a stochastic model without strict deterministic controls.
- Because solution_type is null, dimension resolution falls into fallback behavior, so rating basis itself can drift.
- Therefore variability is expected with current implementation (not just “LLM quality”).

What context the LLM currently uses for complexity
- Edge function passes full `challengeData` JSON (curation fields: problem_statement, scope, deliverables, expected_outcomes, evaluation_criteria, reward_structure, phase_schedule, maturity_level, eligibility, visibility, hook, extended_brief extracts, domain_tags, etc., plus ai_section_reviews and other fetched context blocks).
- It also appends maturity/solution type from client context when present.
- So it is not using only one section; it uses broad multi-section context.

Implementation plan (in order)

Phase 1 — Stabilize dimension source (must-do)
1. Enforce explicit `solution_type` for complexity assessment.
2. Remove “arbitrary fallback dimensions” behavior in edge function.
3. If solution_type missing, return structured warning/error requiring curator selection (do not score).
4. Add clear UI guard in complexity section: “Select solution type before AI assessment.”

Phase 2 — Unify scoring source of truth
1. Keep Accept delegation to `saveAiDraft`.
2. Add key-alignment validation before save:
   - if AI keys don’t match effective dimension keys, block save + show actionable toast.
3. Rehydrate drafts on authoritative prop changes (`currentParams/currentScore/effectiveParams`) with dirty-state safeguards.

Phase 3 — Remove score display mismatches
1. Replace simple-average display in `AIReviewResultPanel` for complexity with weighted score using same weights used by module.
2. Keep AI reference badge in manual tab.
3. Remove dead `hasDraftValues` fallback branch and simplify display logic.

Phase 4 — Fix related data consistency regressions
1. Update store sync/hydration mappings for submission guidelines (stop using description mapping).
2. Fix complexity comment scale label from `/5` to `/10`.
3. Resolve ref warnings by ensuring components receiving refs use `forwardRef` or remove ref passing.

Files to update
- `supabase/functions/review-challenge-sections/index.ts` (solution_type enforcement + deterministic dimensions)
- `src/components/cogniblend/curation/ComplexityAssessmentModule.tsx` (key validation, rehydration, display logic cleanup)
- `src/components/cogniblend/curation/AIReviewResultPanel.tsx` (weighted complexity display)
- `src/pages/cogniblend/CurationReviewPage.tsx` (solution_type guard UX, keep accept delegation)
- `src/hooks/useCurationStoreSync.ts` + `src/hooks/useCurationStoreHydration.ts` (submission_guidelines mapping correction)

Verification (must pass)
1. Re-run complexity AI 3 times on unchanged challenge:
   - same dimension set each run
   - score variation only minor/model-noise (not structural jumps due wrong dimensions).
2. Click Accept from AI panel:
   - saved score/level/params exactly match module AI tab score and keys.
3. Switch to Manual tab and edit:
   - AI reference remains visible and unchanged until manual save.
4. Refetch page:
   - module rehydrates from DB correctly; no stale score illusion.
5. Console:
   - no “Function components cannot be given refs” warnings in curation flow.
