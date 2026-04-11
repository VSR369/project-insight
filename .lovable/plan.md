

## Fix: Suppress Auto-Refine After Pass 1

### Problem
After "Analyse Challenge" (Pass 1), suggestion cards appear immediately because the `useAIReviewInlineState` hook has an auto-refine effect (lines 98-136) that fires 300ms after any review with comments lands. It calls `handleRefineWithAI()` which invokes the edge function with `skip_analysis: true` — essentially running Pass 2 individually per section without the context digest. The `suppressAutoRefine` prop exists but is **never passed** by any caller.

### Root Cause
- `SectionPanelItem.tsx` receives `reviewSessionActive` (= `pass1DoneSession`) but never forwards it as `suppressAutoRefine` to `CurationAIReviewInline`
- `ExtendedBriefDisplay.tsx` doesn't receive or pass `suppressAutoRefine` at all

### Fix — 3 files, minimal changes

**1. `src/components/cogniblend/curation/SectionPanelItem.tsx`**
Add `suppressAutoRefine={reviewSessionActive}` to the `CurationAIReviewInline` call (around line 189).

When `pass1DoneSession` is `true` (between Pass 1 completing and Pass 2 starting), auto-refine is blocked. When Pass 2 runs, `pass1DoneSession` resets to `false`, but by then results already include `review.suggestion` so auto-refine uses the cached suggestion instead of making new API calls.

**2. `src/components/cogniblend/curation/ExtendedBriefDisplay.tsx`**
- Add `suppressAutoRefine?: boolean` to the props interface
- Pass it through to `CurationAIReviewInline`

**3. `src/pages/cogniblend/CurationReviewPage.tsx`** (or wherever `ExtendedBriefDisplay` is rendered)
- Pass `suppressAutoRefine={pass1DoneSession}` (via `reviewSessionActive`) to `ExtendedBriefDisplay`

### Files Changed

| File | Change |
|------|--------|
| `src/components/cogniblend/curation/SectionPanelItem.tsx` | Add `suppressAutoRefine={reviewSessionActive}` prop |
| `src/components/cogniblend/curation/ExtendedBriefDisplay.tsx` | Accept + forward `suppressAutoRefine` prop |
| Caller of ExtendedBriefDisplay | Pass `suppressAutoRefine` from orchestrator state |

