

# Fix: Complexity Assessment — Isolate AI vs Manual State + Lock Mechanism

## Problem 1: Shared Draft State Corruption

The `ComplexityAssessmentModule` uses a **single `draft` state** for all three tabs. Both AI Review and Manual Params read from and write to the same `draft` object via the shared `handleSliderChange` callback. When the curator adjusts sliders in Manual Params, the AI Review tab's ratings change too — even though no AI review was run.

**Root cause** (line 210-212):
```
handleSliderChange → setDraft(prev => ({...prev, [key]: val}))
```
This mutates the same `draft` that AI Review renders at line 435: `const value = draft[param.param_key] ?? 5`.

## Problem 2: No Lock Mechanism

There is no way for the curator to finalize the complexity assessment. The current "Save" button persists values but doesn't prevent further changes or signal that complexity is locked for downstream use.

## Fix Plan

### Change 1: Split `draft` into `aiDraft` and `manualDraft`

**File:** `src/components/cogniblend/curation/ComplexityAssessmentModule.tsx`

- Introduce two separate state objects:
  - `aiDraft` — populated **only** from `aiSuggestedRatings` (via the existing `useEffect` at line 106) and from inline pencil edits in AI Review tab
  - `manualDraft` — populated from `currentParams` on mount, updated by Manual Params sliders
- AI Review tab renders `aiDraft` values; Manual Params tab renders `manualDraft` values
- Each tab's `handleSliderChange` targets only its own draft
- `handleSave` sends the active tab's draft (not a shared one)
- Quick Select remains unchanged (no sliders)

### Change 2: Add "Lock Complexity" action

**Files:**
- `src/components/cogniblend/curation/ComplexityAssessmentModule.tsx` — add Lock button + locked read-only state
- `src/pages/cogniblend/CurationReviewPage.tsx` — pass `isLocked` and `onLock` props
- **DB migration** — add `complexity_locked` boolean column to `challenges` table (default false)

Lock behavior:
- Lock button appears after Save (or directly if data exists), styled as a confirmation action
- Once locked: all tabs become read-only, sliders disabled, Lock badge shown
- Lock persists `complexity_locked = true`, `complexity_locked_at`, `complexity_locked_by` to DB
- Unlock requires explicit curator action (toggle button)
- Locked complexity values become the basis for downstream pricing and reward calculations

### Change 3: Protect AI draft from non-AI mutations

The `aiDraft` state will only be writable through:
1. The `useEffect` that processes `aiSuggestedRatings` (global review or re-review)
2. Inline pencil edits within the AI Review tab (marking as "Curator" override)

No other path can modify AI Review ratings.

## Files Changed

| File | Change |
|------|--------|
| `src/components/cogniblend/curation/ComplexityAssessmentModule.tsx` | Split draft into `aiDraft`/`manualDraft`; add Lock/Unlock UI; read-only when locked |
| `src/pages/cogniblend/CurationReviewPage.tsx` | Pass `isLocked`/`onLock` props from challenge data |
| **DB migration** | Add `complexity_locked`, `complexity_locked_at`, `complexity_locked_by` to `challenges` |

## Result

- Manual Params changes **never** affect AI Review ratings
- AI Review ratings change **only** on AI review/re-review or explicit inline override
- Curator can Lock complexity as final — all tabs become read-only with a visual indicator
- Locked state persists to DB and is respected on reload

