
I checked the code path and can confirm this is a real bug: Pass 2 is wired to generate suggestions, but the current curation UI/persistence path can prevent those AI suggested sections from appearing.

What I found

1. The section review panel does not render directly from `review.suggestion`.
   - In `src/components/cogniblend/shared/AIReviewInline.tsx`, the panel passes:
   - `suggested_version: refinedContent ?? undefined`
   - So if local `refinedContent` is empty, the UI shows comments only.

2. The only code that copies `review.suggestion` into `refinedContent` is inside the auto-refine effect.
   - In `src/components/cogniblend/shared/useAIReviewInlineState.ts`, `review.suggestion` is seeded into local state only through the effect that is also controlled by `suppressAutoRefine`.

3. In curation, that auto-refine path is intentionally suppressed during the Analyse → Generate Suggestions workflow.
   - `src/components/cogniblend/curation/SectionPanelItem.tsx`
   - `src/components/cogniblend/curation/ExtendedBriefDisplay.tsx`
   - both pass `suppressAutoRefine={reviewSessionActive}`
   - Result: Pass 2 may return `suggestion`, but the UI still renders only the review comments.

4. Suggestions are also not safely persisted.
   - `src/hooks/useCurationStoreSync.ts` writes `ai_section_reviews` with:
   - `section_key`, `comments`, `status`, `addressed`, `reviewed_at`
   - It does not persist `suggestion`.
   - So even when Pass 2 generates suggestions, they can be lost on sync/refresh.

5. There is also a stale-merge risk while saving wave results.
   - `src/hooks/cogniblend/useCurationWaveSetup.ts` saves using the current `aiReviews` closure, not guaranteed latest state.
   - That can overwrite earlier Pass 2 updates from the same run.

Implementation plan

1. Fix display logic first
   - Update `AIReviewInline.tsx` / `useAIReviewInlineState.ts` so the “AI Suggested Version” block renders from `review.suggestion` immediately.
   - Keep `suppressAutoRefine` only for blocking automatic re-generation, not for hiding an already returned Pass 2 suggestion.
   - Ensure sections with `warning`, `needs_revision`, or `generated` still show suggestions when present.

2. Fix persistence
   - Update `useCurationStoreSync.ts` to preserve full AI review payload, especially `suggestion`.
   - Also keep related metadata like `guidelines`, `cross_section_issues`, `confidence`, `prompt_source`, `triage_status`, and `phase` where available.

3. Fix stale merge behavior
   - Update `useCurationWaveSetup.ts` and the related single-section save path in `useCurationAIActions.ts` to merge against the latest review state via functional updates or a ref, not a stale array snapshot.

4. Verify end-to-end
   - Run the exact flow:
     - Analyse Challenge
     - review/close Context Library
     - Generate Suggestions
   - Confirm each section with Pass 2 output shows its suggested content block.
   - Refresh the page and confirm suggestions still remain visible.

Files to update
- `src/components/cogniblend/shared/AIReviewInline.tsx`
- `src/components/cogniblend/shared/useAIReviewInlineState.ts`
- `src/components/cogniblend/curation/SectionPanelItem.tsx`
- `src/components/cogniblend/curation/ExtendedBriefDisplay.tsx`
- `src/hooks/useCurationStoreSync.ts`
- `src/hooks/cogniblend/useCurationWaveSetup.ts`
- `src/hooks/cogniblend/useCurationAIActions.ts`

Technical detail
```text
Current behavior:
Pass 2 returns review.suggestion
-> panel ignores review.suggestion
-> panel only renders local refinedContent
-> refinedContent is seeded only by auto-refine effect
-> auto-refine is suppressed in the Analyse/Generate flow
-> user sees comments only, no AI suggested content

Persistence behavior:
Pass 2 returns suggestion
-> local state may briefly hold it
-> store sync writes ai_section_reviews without suggestion
-> refresh/query sync strips it out
```
