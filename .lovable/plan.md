
Goal: make Reward + Complexity + Re-review behavior deterministic and resilient, with one consistent data contract.

1) Root-cause diagnosis (based on current code)
- Reward data loss is not random; it’s from two concrete issues:
  1) `useCurationStoreSync` writes `ai_section_reviews` as an object map, while `CurationReviewPage` expects an array. This breaks review loading and causes unstable state across reloads.
  2) `RewardStructureDisplay` calls `syncToStore()` immediately after `setState` updates (`setRewardType`, `updateTier`, NM edits). Because React state updates are async, stale serialized data is pushed to store/DB.
- Complexity “score = 0 but params have values” is caused by `ComplexityAssessmentModule` AI tab rendering `currentScore/currentLevel` instead of the active `draft`-derived weighted values.
- Re-review “removed” is primarily a state-contract failure (reviews not loading), plus pending-state UX currently has no per-section re-review button.

2) Implementation plan (in order)

A. Fix the review data contract first (stability foundation)
- In `src/hooks/useCurationStoreSync.ts`:
  - Replace object-merge persistence for `ai_section_reviews` with array-based merge by `section_key`.
  - Normalize both legacy array/object payloads before merge, then always save back as array.
  - Remove/replace the current “hydrate from `ai_section_reviews` into section data” path (this is unsafe and can inject review objects into section content).
- In `src/pages/cogniblend/CurationReviewPage.tsx`:
  - Read `ai_section_reviews` defensively: support both array and object-map legacy payloads.
  - Normalize into `SectionReview[]` before rendering, so existing corrupted rows recover immediately.

B. Make Reward Type persistence robust (no stale writes)
- In `src/components/cogniblend/curation/RewardStructureDisplay.tsx`:
  - Stop immediate `syncToStore()` calls inside event handlers that mutate state.
  - Add a post-state synchronization effect (state-driven) that serializes latest reward state and writes once state is settled.
  - Keep manual Save/Lock as explicit DB writes, but ensure they serialize from latest settled state.
  - Ensure AI apply (`applyAIReviewResult`) also flows through the same state-driven sync path.
- Result: switching type/tabs/editing tiers/NM items will persist the latest actual state, not prior snapshots.

C. Fix complexity score consistency across tabs
- In `src/components/cogniblend/curation/ComplexityAssessmentModule.tsx`:
  - AI tab display should use draft-derived weighted score/derived level as source of truth when draft exists.
  - Remove stale dependency on `currentScore/currentLevel` for live display after tab switches.
  - Keep weighted formula identical to existing manual calculation logic.
- Optional hardening in same pass:
  - Prevent persisting literal `0` score for non-empty drafts; use derived weighted score or explicit override mapping so score/level/params stay coherent.

D. Make per-section Re-review always reachable
- In `src/components/cogniblend/shared/AIReviewInline.tsx`:
  - Keep re-review button in warning/pass/addressed branches.
  - Add action in pending branch for non-locked sections (“Review this section with AI”), using existing `handleReReview`.
- Combined with step A normalization, this restores “anytime re-review” behavior across sections.

3) Technical file-level changes
- `src/hooks/useCurationStoreSync.ts`
  - Add `normalizeAiSectionReviewsPayload()` helper.
  - Persist `ai_section_reviews` as normalized array only.
  - Remove unsafe section-data hydration from `ai_section_reviews`.
- `src/pages/cogniblend/CurationReviewPage.tsx`
  - Parse array/object review payloads into normalized `SectionReview[]`.
- `src/components/cogniblend/curation/RewardStructureDisplay.tsx`
  - Refactor sync strategy from handler-driven to state-driven effect.
  - Remove stale immediate sync calls after async state setters.
- `src/components/cogniblend/curation/ComplexityAssessmentModule.tsx`
  - Use weighted draft score/level consistently in AI view.
- `src/components/cogniblend/shared/AIReviewInline.tsx`
  - Ensure pending-state per-section AI review/re-review action exists.

4) Verification matrix (must-pass)
- Reward persistence:
  - Change reward type (monetary/non_monetary/both), edit values, navigate away/back, reload page: values unchanged.
  - Accept AI reward suggestion, reload immediately: accepted structure remains.
- Complexity consistency:
  - Move Manual → AI Review tab without saving; score badge matches visible parameter values.
  - Re-review complexity; AI summary score matches module weighted score.
- Re-review availability:
  - Verify button/action in pending, warning, pass, addressed (non-locked) states.
- Data-contract recovery:
  - For rows with object-shaped `ai_section_reviews`, UI still loads comments and actions correctly after refresh.

5) Expected outcome
- Reward Type data no longer “randomly disappears.”
- Complexity score/level stays consistent with shown parameter values across tab navigation.
- Re-review is reliably available section-by-section.
- Existing inconsistent review payloads are backward-compatible and no longer break the UI.
