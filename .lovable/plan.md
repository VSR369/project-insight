

## Fix Plan: 4 Bugs in the Two-Step AI Workflow

### Root Causes (confirmed)

1. **"Re-analyse" on first visit**: `pass1Done` derives from `aiReviews` which hydrates from DB on page load. Legacy reviews have `suggestion: null` → `pass1Done = true` immediately.
2. **Stale Context Library data**: Already partially fixed (invalidation after discovery), but drawer opens before invalidation arrives.
3. **Generate Suggestions ineffective**: Digest may be empty if no sources were accepted. Also, auto-refine in `useAIReviewInlineState` fires independently per section (line 128), bypassing the wave executor and context digest entirely.
4. **Section UI confusion**: After Pass 1, auto-refine fires immediately for every section (since `suggestion == null`), generating context-free suggestions that override the intended two-step flow.

### Changes (5 files)

**1. `src/hooks/cogniblend/useCurationPageData.ts`**
Add `pass1DoneSession` + `setPass1DoneSession` state (`useState(false)`). This session-scoped flag replaces the DB-derived `pass1Done`.

**2. `src/hooks/cogniblend/useCurationPageOrchestrator.ts`**
- Thread `pass1DoneSession` and `setPass1DoneSession` from `pageData` into `useCurationAIActions` options.
- Expose `pass1DoneSession` in the return object so `CurationReviewPage` can pass it to `CurationRightRail` and section components.

**3. `src/hooks/cogniblend/useCurationAIActions.ts`**
- Accept `setPass1DoneSession` in options interface.
- In `handleAnalyse` on success: call `setPass1DoneSession(true)`.
- In `handleAnalyse`: invalidate context queries BEFORE opening the drawer (already partially done, just ensure ordering).
- In `handleGenerateSuggestions`: regenerate digest before executing full waves, then call `setPass1DoneSession(false)` on success.

**4. `src/pages/cogniblend/CurationReviewPage.tsx` (line 252)**
Replace `pass1Done={o.aiReviews.length > 0 && o.aiReviews.every(...)}` with `pass1Done={o.pass1DoneSession}`.

**5. `src/components/cogniblend/shared/useAIReviewInlineState.ts` (line 96-132)**
Add a `suppressAutoRefine` prop to the params interface. When `true`, skip the auto-refine `useEffect` entirely. This prevents per-section AI calls from firing between Pass 1 and Generate Suggestions.

**6. `src/components/cogniblend/shared/AIReviewInline.tsx`**
Add `suppressAutoRefine?: boolean` to props, pass through to `useAIReviewInlineState`.

**7. Section panel wiring** (where `AIReviewInline` is rendered)
Pass `suppressAutoRefine={o.pass1DoneSession}` down from the page through section panels to `AIReviewInline`.

### Edge Function Change

**`supabase/functions/review-challenge-sections/index.ts` (line 862-867)**
When `pass1_only === true`, set `phase: 'triage'` on each result (in addition to stripping `suggestion`). This tags pass1 reviews so they can be distinguished from legacy reviews if needed for future hydration logic.

### What stays the same
- `CurationRightRail.tsx` — no change needed, it already uses `pass1Done` prop correctly
- `ContextLibraryDrawer.tsx` — unchanged
- `useContextLibrary.ts` — digest regeneration on URL add already implemented
- `useCurationWaveSetup.ts` — unchanged
- No migrations needed

### Sequence after fix
```text
Page loads → pass1DoneSession = false → "Analyse Challenge" shown (primary)
     ↓
Click "Analyse Challenge" → Pass 1 runs + discovery fires in parallel
     ↓
Pass 1 completes → pass1DoneSession = true → Context Library auto-opens
     ↓
Auto-refine suppressed (suppressAutoRefine = true) → sections show comments only
     ↓
Curator reviews/accepts sources in Context Library → closes drawer
     ↓
"Generate Suggestions" now visible (primary) + "Re-analyse" (outline)
     ↓
Click "Generate Suggestions" → digest regenerated → full waves run
     ↓
pass1DoneSession = false → suggestions appear in sections → auto-refine enabled
```

