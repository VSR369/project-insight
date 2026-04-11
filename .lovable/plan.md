

## Fix 5 Bugs: Session-Aware Curation State

### Root Cause (shared across Bugs 1, 2, 5)

`aiReviews` is hydrated from `challenges.ai_section_reviews` on page load. All display decisions (BulkActionBar visibility, StatusBadge "Reviewed", section panel status) treat these stale DB records as if the curator just ran a review this session. The existing `pass1DoneSession` flag tracks only Pass 1 completion but is not propagated to the display layer.

### Solution: Add `reviewSessionActive` gate

A single session-scoped boolean that is `false` on page load and becomes `true` only after the curator runs AI review (either Pass 1 or full). This gates all three display decisions.

---

### Bug 1 — BulkActionBar shows on page load

**File:** `src/components/cogniblend/curation/CurationHeaderBar.tsx` (line 156)

**Current:** `{aiReviewCounts.hasReviews && (<BulkActionBar .../>)}`

**Fix:** Add `reviewSessionActive` prop to `CurationHeaderBarProps`. Gate: `{aiReviewCounts.hasReviews && reviewSessionActive && (<BulkActionBar .../>)}`

**Wiring:** Pass `reviewSessionActive` from orchestrator. Value = `pass1DoneSession` (already exists as session-scoped state, set to `true` after Pass 1 completes in `useCurationAIActions.ts` line 171).

**Files:** `CurationHeaderBar.tsx` (add prop + gate), `CurationReviewPage.tsx` (pass `o.pass1DoneSession`), `useCurationPageOrchestrator.ts` (expose if not already).

---

### Bug 2 & 5 — "Reviewed ✓" badge on sections from stale DB data

**File:** `src/components/cogniblend/curation/SectionPanelItem.tsx` (lines 110-117)

**Current:** `panelStatus` is set to `"pass"` / `"warning"` whenever `aiReview` exists (which comes from DB on load).

**Fix:** Add `reviewSessionActive` prop to `SectionPanelItemProps`. When `!reviewSessionActive`, treat AI reviews as informational only — do not set `panelStatus` from them. The status stays `"not_reviewed"` until the curator actually runs a review this session.

```typescript
// Only show AI review statuses if a review was run this session
if (!isLocked && aiReview && reviewSessionActive) {
  if (aiReview.addressed) panelStatus = "pass";
  else if (aiReview.status === "pass") panelStatus = "pass";
  else if (aiReview.status === "warning") panelStatus = "warning";
  else if (aiReview.status === "needs_revision") panelStatus = "needs_revision";
}
```

**Wiring:** Pass `reviewSessionActive={pass1DoneSession}` from `CurationSectionList.tsx` through to each `SectionPanelItem`.

**Files:** `SectionPanelItem.tsx` (add prop + gate), `CurationSectionList.tsx` (pass prop).

---

### Bug 3 — Visibility/Eligibility checkboxes not working

**File:** `src/components/cogniblend/curation/renderers/renderCommercialSections.tsx` (lines 54-91)

**Analysis:** The read path (`challenge.solver_eligibility_types`) and write path (`field: "solver_eligibility_types"`) actually match. The real issue is the `CheckboxMultiSectionRenderer` reads from `selectedValues` (derived from DB JSON) but the `onSave` callback transforms values into `{code, label}` objects. On the next render, the component tries to match `draft.includes(opt.value)` against these objects, which fails because the DB stores objects but the component compares strings.

**Fix:** Normalize the read path to always extract `.code` from objects (already done on lines 56-57), AND ensure the `useEffect` sync on line 41-43 of `CheckboxMultiSectionRenderer` re-syncs `draft` after a save triggers a query invalidation. The actual bug is that after `onSave(next)` fires, `selectedValues` prop updates asynchronously from the query refetch, but `draft` was already set to string codes. The `useEffect` then resets draft to the new `selectedValues` which are now correct.

After deeper inspection: the save works correctly, the issue is likely that `isReadOnly` is `true` for these sections, preventing the checkboxes from rendering. Let me verify — in `SectionPanelItem.tsx` line 105: `const isEditing = isLocked ? editingSection === section.key : !isReadOnly;`. Eligibility and visibility are NOT in `LOCKED_SECTIONS`, so `isEditing = !isReadOnly`. If `isReadOnly` is false, checkboxes show.

The actual bug may be that `readOnly` is still being passed as `true` to the renderer. In `renderCommercialSections.tsx` line 63: `readOnly={isReadOnly}`. This is passed from `renderSectionContent`. Let me check if `isReadOnly` is correctly computed.

**Revised diagnosis:** The checkboxes should render when `!isReadOnly`. If the user says they're "not working", the likely issue is that toggles fire `onSave` but the mutation saves `{code, label}` objects, then the query refetch returns objects, which are re-parsed on lines 55-58 extracting `.code`. This round-trip should work. However, there may be a race condition where `draft` state from `handleToggle` is overwritten by `useEffect` syncing `selectedValues` before the mutation completes.

**Fix:** Make `handleToggle` in `CheckboxMultiSectionRenderer` use a `savingRef` to skip the `useEffect` reset while a save is in flight. Alternatively, simplify: remove the `draft` state entirely and use `selectedValues` directly, calling `onSave` with the computed next values without local state.

**Files:** `CheckboxMultiSectionRenderer.tsx` (remove draft state race condition).

---

### Bug 4 — Invisible workflow between Analyse and Generate Suggestions

**File:** `src/components/cogniblend/curation/CurationRightRail.tsx` (lines 103-128)

**Current:** After Pass 1, the "Generate Suggestions" button appears but there's no guidance text explaining the curator must review context sources first.

**Fix:** Add a workflow guidance callout between the two buttons when `pass1Done` is true:

```tsx
{props.pass1Done && (
  <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800 space-y-1">
    <p className="font-medium">Next step: Review discovered sources</p>
    <p>Open the Context Library to review and accept/reject sources before generating suggestions.</p>
  </div>
)}
```

**File:** `CurationRightRail.tsx` only.

---

### Files Summary

| File | Bug | Change |
|------|-----|--------|
| `CurationHeaderBar.tsx` | 1 | Add `reviewSessionActive` prop, gate BulkActionBar |
| `CurationReviewPage.tsx` | 1 | Pass `pass1DoneSession` as `reviewSessionActive` |
| `SectionPanelItem.tsx` | 2,5 | Add `reviewSessionActive` prop, gate panelStatus from AI reviews |
| `CurationSectionList.tsx` | 2,5 | Pass `reviewSessionActive` down to SectionPanelItem |
| `CheckboxMultiSectionRenderer.tsx` | 3 | Remove draft/selectedValues race condition |
| `CurationRightRail.tsx` | 4 | Add workflow guidance callout between Analyse and Generate |

### What stays unchanged
- `useCurationPageOrchestrator.ts` -- `pass1DoneSession` already exists and is exposed
- `useCurationAIActions.ts` -- already sets `pass1DoneSession` correctly
- `BulkActionBar.tsx` -- no changes needed (it's the parent that gates it)
- `CuratorSectionPanel.tsx` -- `effectiveStatus` logic for locked sections stays the same

