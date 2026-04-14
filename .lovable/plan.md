

# Fix: "Generate Suggestions" Spinner During Re-analyse (Race Condition)

## Root Cause

The previous fix correctly calls `setPass1DoneSession(false)` at the start of `handleAnalyse` (line 165). However, there's a **race condition** in `useCurationEffects.ts`:

Line 60 runs `setPass1DoneSession(true)` inside a hydration effect that triggers whenever `challenge.ai_section_reviews` changes. During re-analysis, waves save section reviews to the database, which causes the challenge query to refetch, which re-triggers this effect, which **immediately flips `pass1DoneSession` back to `true`** — undoing the fix.

With `pass1Done = true` and `aiReviewLoading = true`, the "Generate Suggestions" button becomes visible AND shows a spinner (line 139 in CurationRightRail.tsx).

```text
Timeline:
  handleAnalyse → setPass1DoneSession(false) ✓ (button hidden)
  Wave 1 saves reviews → challenge refetches → ai_section_reviews changes
  hydration effect → setPass1DoneSession(true) ✗ (button reappears with spinner!)
```

## Fix (2 files, ~10 lines)

### File 1: `src/hooks/cogniblend/useCurationEffects.ts`
- Guard the hydration effect so it only runs **once** on mount, not on every `ai_section_reviews` change
- Use a ref (`hydrationDoneRef`) to ensure `setPass1DoneSession(true)` cannot fire after `handleAnalyse` resets it

### File 2: `src/components/cogniblend/curation/CurationRightRail.tsx`
- Add a defensive check: the "Generate Suggestions" button should show its spinner ONLY when `aiReviewLoading` is true **AND** `pass1Done` was already true before loading started
- Change line 139 from `{aiReviewLoading ? <Loader2 .../>` to `{aiReviewLoading && props.pass1Done ? <Loader2 .../>`
- This is a belt-and-suspenders fix — the effect guard is the primary fix, this prevents any future regression

### Result
- During Re-analyse: "Generate Suggestions" stays hidden throughout the entire analysis
- After analysis completes: it appears correctly when `setPass1DoneSession(true)` is called at line 212

