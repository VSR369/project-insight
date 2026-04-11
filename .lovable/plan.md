

## Status: Universal Autosave is ~30% Complete

### What was built (infrastructure only)
- `useAutoSaveSection` hook -- exists, never imported by any consumer
- `useAutoSaveExtendedBrief` hook -- exists, never imported by any consumer
- `AutoSaveIndicator` component -- exists, imported by editors but never receives real status
- Editor components (`TextSectionEditor`, `DeliverablesEditor`, `EvalCriteriaEditor`, `TableSectionEditor`, `CheckboxMultiSectionRenderer`) -- accept optional `autoSaveStatus` prop but no caller passes it
- Orchestrator `saveSectionMutation` -- silenced (no toast, no setEditingSection on success)

### What is NOT wired (the remaining 70%)

**The hooks are dead code.** No renderer or section panel calls `useAutoSaveSection()` or `useAutoSaveExtendedBrief()`. All 50+ sections still use the old pattern:

1. Click "Edit" button to enter edit mode
2. Make changes
3. Changes call `onSave` which does `setSavingSection(true)` + `saveSectionMutation.mutate(...)` directly (no debounce, no status indicator)
4. Edit mode stays open until explicitly closed

**Specific gaps across all 4 renderer groups:**

| Renderer Group | Sections | Gap |
|---|---|---|
| `renderOrgSections` | problem_statement, scope, hook, context_and_background, solver_expertise | Still uses `editButton` + `RichTextSectionRenderer` without autosave status; solver_expertise still calls `setEditingSection(null)` manually |
| `renderProblemSections` | deliverables, submission_guidelines, expected_outcomes, root_causes, current_deficiencies, preferred_approach, affected_stakeholders | Still calls `setSavingSection(true)` + direct mutate; no debounce; edit button pattern |
| `renderCommercialSections` | eligibility, visibility, evaluation_criteria, ip_model, maturity_level, solution_type | Same old pattern; CheckboxMulti/Single don't get autoSaveStatus; solution_type calls `setEditingSection(null)` |
| `renderOpsSections` | phase_schedule, data_resources_provided, success_metrics_kpis | Same; TableSectionEditor accepts autoSaveStatus but never receives it |

**`SectionPanelItem`**: Still renders the "Edit" button via `renderSectionContent`. Still manages `editingSection` state (only one section editable at a time). No "always editable" mode.

**`RichTextSectionRenderer`**: Does not accept or pass `autoSaveStatus`. Still requires explicit `editing` boolean to show the editor vs read-only view.

---

### Implementation Plan: Wire Autosave Across All Sections

The approach is to wire the existing hooks into the rendering pipeline without changing the hook or indicator code (they're correct).

**Phase 1: Make renderers "always editable" for non-locked sections (4 files)**

1. **`RichTextSectionRenderer.tsx`** -- Accept `autoSaveStatus` prop; pass to `TextSectionEditor`. When `!readOnly`, always show editor (remove `editing` gate for autosave sections).

2. **`CheckboxSingleSectionRenderer.tsx`** -- Add `autoSaveStatus` prop; show `AutoSaveIndicator` after select.

3. **`renderSectionContent.tsx`** -- Remove the `editButton` for sections that autosave. Pass `autoSaveStatus` through `RenderSectionContentArgs`.

4. **`SectionPanelItem.tsx`** -- For non-locked, non-custom sections: set `isEditing = true` always (no edit button needed). This makes all standard sections always show their editor.

**Phase 2: Wire hooks in the orchestrator layer (2 files)**

5. **`useCurationSectionActions.ts`** (or wherever `handleSaveText` lives) -- Replace direct `saveSectionMutation.mutate` calls with `useAutoSaveSection.save()` for text fields (600ms debounce) and immediate save for selections (0ms).

6. **`useCurationPageOrchestrator.ts`** -- Expose autosave status per-section so `SectionPanelItem` can pass it down. This requires a small state map: `Record<SectionKey, AutoSaveStatus>`.

**Phase 3: Wire remaining renderer groups (4 files)**

7. **`renderOrgSections.tsx`** -- Pass `autoSaveStatus` to `RichTextSectionRenderer` for problem_statement, scope, hook, context_and_background. Remove `setSavingSection(true)` from solver_expertise save.

8. **`renderProblemSections.tsx`** -- Remove `setSavingSection(true)` from submission_guidelines, expected_outcomes. Pass status to `LineItemsSectionRenderer`.

9. **`renderCommercialSections.tsx`** -- Pass `autoSaveStatus` to `CheckboxMultiSectionRenderer` for eligibility/visibility. Remove `setSavingSection(true)`.

10. **`renderOpsSections.tsx`** -- Pass `autoSaveStatus` to `TableSectionEditor` for data_resources, success_metrics. Remove `setSavingSection(true)` from phase_schedule.

**Phase 4: Extended brief subsections (1 file)**

11. **`BriefSubsectionContent.tsx`** -- Wire `useAutoSaveExtendedBrief` for root_causes, current_deficiencies, preferred_approach, affected_stakeholders subsections.

### What stays unchanged
- Reward Structure -- own save + lock flow
- Complexity Assessment -- own lock mechanism  
- Legal Docs / Escrow -- locked, coordinator-driven
- Domain Tags -- already immediate save
- Industry Segment -- already immediate save
- Creator References -- read-only display

### Risk mitigation
- `editingSection` state kept for backward compat but most sections will default to `isEditing = true`
- `notifyStaleness` still fires on every save
- `queryClient.invalidateQueries` still fires
- Error toast on mutation failure preserved

### Files summary
| Action | File | Lines changed (est.) |
|---|---|---|
| Modify | `RichTextSectionRenderer.tsx` | ~10 |
| Modify | `CheckboxSingleSectionRenderer.tsx` | ~15 |
| Modify | `renderSectionContent.tsx` | ~20 |
| Modify | `SectionPanelItem.tsx` | ~15 |
| Modify | `useCurationSectionActions.ts` | ~30 |
| Modify | `useCurationPageOrchestrator.ts` | ~25 |
| Modify | `renderOrgSections.tsx` | ~20 |
| Modify | `renderProblemSections.tsx` | ~25 |
| Modify | `renderCommercialSections.tsx` | ~20 |
| Modify | `renderOpsSections.tsx` | ~20 |
| Modify | `BriefSubsectionContent.tsx` | ~15 |

