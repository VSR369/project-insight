
Root cause confirmation (from current code):
1) Type selection path inconsistency still exists:
- `RewardTypeChooser` uses `onSelect={setRewardType}` directly, so initial Non-Monetary/Both selection does not trigger autosave scheduling.
- `handleTypeSwitchFromReadOnly` also bypasses autosave scheduling.
2) Autosave is fragile on fast navigation:
- Current flow uses `pendingSave + setTimeout(150ms)` in an effect.
- The cleanup clears the timer, so if user navigates quickly/unmounts, the pending write is canceled.
3) Result: Non-monetary edits/type changes can appear “lost” after section/page navigation.

Implementation plan (permanent fix):
1) Unify all reward-type changes through one autosaving handler
- Route all type changes to a single `handleTypeSwitch` path (including empty chooser and read-only toggle path).
- Update:
  - `RewardTypeChooser onSelect` → `handleTypeSwitch`
  - `handleTypeSwitchFromReadOnly` → call `startEditing()` + `handleTypeSwitch(type)`
- This guarantees type transitions always mark the section dirty for persistence.

2) Replace brittle `pendingSave` boolean flow with robust autosave scheduler
- In `RewardStructureDisplay.tsx`, replace `pendingSave` effect with a dedicated scheduler using refs:
  - `saveTimerRef`
  - `isSavingRef`
  - `queuedSaveRef`
- Add `scheduleAutoSave()` for all manual mutations (tier/non-monetary/currency/type/AI-accept).
- Debounce writes (e.g., 300–500ms) to avoid write spam while preserving responsiveness.
- Keep explicit `handleSave` button as manual fallback.

3) Add guaranteed flush on leave/unmount
- Add cleanup/visibility handling that flushes pending changes immediately when component unmounts or page becomes hidden.
- Ensure this flush is fire-and-forget safe and does not rely on component-mounted state updates.
- Prevent state updates after unmount (no `setState` in late async completion paths).

4) Harden save correctness and race handling
- Save using latest serializer ref (`getSerializedDataRef.current()`).
- If a save is in flight and new edits happen, queue one trailing save so latest state is always persisted.
- Keep `queryClient.invalidateQueries(["curation-review", challengeId])` after successful writes.

5) Preserve current UX while fixing reliability
- Keep Save button visible in editing mode.
- Keep current validation behavior.
- Keep lock/finalization logic unchanged.
- No DB schema changes required.

Files to modify:
- `src/components/cogniblend/curation/RewardStructureDisplay.tsx`
- `src/components/cogniblend/curation/rewards/RewardTypeChooser.tsx`
- (if needed) `src/components/cogniblend/curation/rewards/RewardTypeToggle.tsx` for handler wiring consistency

Verification plan (end-to-end):
1) Empty state: choose Non-Monetary, immediately navigate away/back → selection and items persist.
2) Add/edit/delete non-monetary items, switch sections quickly, return → latest content persists.
3) Switch Monetary ↔ Non-Monetary ↔ Both rapidly, then navigate away/back → final chosen type and data persist.
4) Accept AI non-monetary suggestions, navigate immediately → persisted.
5) Confirm no duplicate/burst save errors in console/network and no regressions in manual Save/Lock flow.
