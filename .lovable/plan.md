

## Curator Code Audit — Prioritized Fix Plan

This is a large audit with 13 issues. I'll group them into actionable batches by priority, noting which are real bugs vs. enhancements, and what's already working.

### Triage Summary

| # | Issue | Verdict | Priority |
|---|-------|---------|----------|
| 1 | Master data live refresh | **Already working** — `useCurationMasterData` fetches from DB via React Query. Only IP models are static (intentional). No fix needed. | Skip |
| 2 | Fixed notice board at top | Enhancement — not a bug. Current PrerequisiteBanner + CompletenessChecklist cover this. | Medium |
| 3 | Notice board → navigate + highlight | **Already implemented** in last PR — `sectionNavigation.ts`, `SectionPanelItem` highlight, `useCurationCallbacks` dispatch. | Done |
| 4 | PreFlight → navigate + highlight | **Already implemented** — `handlePreFlightGoToSection` dispatches nav event. | Done |
| 5 | Unified sticky notice + popup | Enhancement — large effort, low ROI vs existing two systems. | Defer |
| 6 | Context Library auto-open | **Already fixed** — `setContextLibraryOpen(true)` is called in `handleAnalyse` (line 177). | Done |
| 7 | Context Library gate before Generate | Valid UX gap — no hard gate. | Low |
| 8 | Universal autosave | Partially done — `useAutoSaveSection` exists. Extended brief/rewards use separate flows by design. | Low |
| 9 | Re-review on reload (`pass1DoneSession`) | **Real bug** — resets to `false` on refresh. Should seed from `aiReviews.length > 0`. | High |
| 10 | AI bounded to master data | Valid for structured fields only (maturity, IP, eligibility, visibility, complexity, solution_type). Free-text fields should not be bounded. | Medium |
| 11 | Complexity section bugs | Multiple real issues — tab isolation, lock logic, score display. | High |
| 12 | Rewards section bugs | Multiple real issues — lock mechanism, currency sync, type switching. | High |
| 13 | Systemic UX: isReadOnly hardcoded, right rail order, dirty-state guard | `isReadOnly = false` is a **real bug**. Others are enhancements. | High (isReadOnly) |

### Batch 1 — Quick Critical Fixes (this implementation)

**Fix 9: `pass1DoneSession` not seeded on page load**

File: `src/hooks/cogniblend/useCurationEffects.ts`
- After AI reviews are hydrated from DB (line 55), check if `aiReviews.length > 0`
- If yes, call `setPass1DoneSession(true)` so the button shows "Re-analyse" on reload
- Add `setPass1DoneSession` to the options interface

**Fix 13a: `isReadOnly` hardcoded to `false`**

File: `src/pages/cogniblend/CurationReviewPage.tsx` (line 83)
- Replace `const isReadOnly = false;` with phase/status-based logic:
  ```typescript
  const isReadOnly = (o.challenge.current_phase ?? 0) > 2 ||
    (o.challenge as any).curation_lock_status === 'FROZEN';
  ```
- This makes curation read-only after Phase 2 or when frozen for legal review

**Fix 10: Pass master data options to AI review inline (structured fields only)**

File: `src/components/cogniblend/curation/SectionPanelItem.tsx` — already passes `sectionMasterDataOptions` to `CurationAIReviewInline` (lines 155-165, 182). This is **already implemented**. The edge function prompt side needs the constraint — that's a separate edge function change, not a frontend fix.

### Batch 2 — Complexity Section Fixes

File: `src/components/cogniblend/curation/ComplexityAssessmentModule.tsx` (and sub-components)
- **Tab data isolation**: Ensure `aiDraft` and `manualDraft` are fully independent state objects; switching tabs must not cross-contaminate values
- **Save guard**: Before saving, warn if unsaved changes exist on the other tab
- **Lock button visibility**: Only show Lock when the active tab has valid data
- **Score fidelity**: Quick Select must carry the selected level's score, not hardcode 0
- **Unlock confirmation**: Add a confirmation dialog before unlocking

### Batch 3 — Rewards Section Fixes

Files: `RewardStructureDisplay.tsx`, `MonetaryRewardEditor.tsx`, `RewardTypeChooser.tsx`
- **Lock mechanism**: Add `isLocked`/`onLock`/`onUnlock` to reward structure, similar to complexity
- **Currency sync**: Sync `currency` state from `challengeCurrencyCode` prop on mount and when prop changes
- **Type switching warning**: Show confirmation dialog when switching reward type if data exists
- **Active type indication**: Visually distinguish the selected reward type card

### Batch 4 — Enhancements (lower priority)

- **Issue 2**: Sticky incomplete-sections banner above the main grid
- **Issue 5**: Unified notice + popup system
- **Issue 7**: Gate "Generate Suggestions" behind Context Library review
- **Issue 8**: Wire `useAutoSaveSection` to remaining text fields
- **Issue 13b**: Right rail card ordering, dirty-state guard on navigate back

---

### Implementation — Batch 1 (this round)

#### Files to modify

| File | Change |
|------|--------|
| `src/hooks/cogniblend/useCurationEffects.ts` | Add `setPass1DoneSession` param; seed from hydrated AI reviews |
| `src/hooks/cogniblend/useCurationPageOrchestrator.ts` | Pass `setPass1DoneSession` to `useCurationEffects` |
| `src/pages/cogniblend/CurationReviewPage.tsx` | Replace hardcoded `isReadOnly = false` with phase/freeze logic |

#### What stays unchanged
- `sectionNavigation.ts` — Issues 3, 4, 6 already resolved
- `useCurationMasterData.ts` — Issue 1 already fetches from DB
- `useCurationAIActions.ts` — `handleAnalyse` already auto-opens Context Library
- Edge function prompt changes (Issue 10) — separate backend task, not frontend

