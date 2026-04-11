

## Universal Autosave for Curation Sections

### Current Architecture

The curation system uses an explicit **Edit -> Save/Cancel** pattern:
- `editingSection` state tracks which section is in edit mode (only one at a time)
- Every editor has Save + Cancel buttons
- `saveSectionMutation.onSuccess` fires `toast.success('Section updated successfully')` + `setEditingSection(null)` + `setSavingSection(false)` on every save
- This creates friction: 50+ sections each require click Edit, make changes, click Save

### Design: Incremental Autosave (Non-Breaking)

Rather than ripping out all Save buttons at once (high risk, touches 15+ renderer files), the approach is:

1. **Create `useAutoSaveSection` hook** -- debounced save that calls `saveSectionMutation.mutate` silently
2. **Create `useAutoSaveExtendedBrief` hook** -- same pattern but merges into the JSONB `extended_brief` column
3. **Create `AutoSaveIndicator` component** -- replaces Save button feedback with `Saving...` / `Saved` / `Failed`
4. **Make `saveSectionMutation` silent** -- remove toast.success and setEditingSection(null) from onSuccess
5. **Wire autosave into editors** -- starting with the highest-impact ones (TextSectionEditor, DeliverablesEditor, EvalCriteriaEditor, TableSectionEditor)
6. **Immediate-save sections stay as-is** -- CheckboxSingle, CheckboxMulti, TagInput, Radio, Select already save on value change; they just need the silent mutation + indicator

### Files to Create

**1. `src/hooks/cogniblend/useAutoSaveSection.ts`** (~60 lines)
- Accepts: `field` (DB column), `challengeId`, `saveSectionMutation`, `syncSectionToStore`, `sectionKey`, `debounceMs`
- Returns: `{ save(value), status: 'idle' | 'saving' | 'saved' | 'error' }`
- Uses `useRef` + `setTimeout` for debounce
- On save: calls `syncSectionToStore` + `saveSectionMutation.mutate` silently
- Status transitions: idle -> saving -> saved (2s) -> idle; or saving -> error (5s) -> idle

**2. `src/hooks/cogniblend/useAutoSaveExtendedBrief.ts`** (~70 lines)
- Same as above but fetches current `extended_brief` JSONB, merges the subsection key, then writes back
- Prevents subsections from overwriting each other

**3. `src/components/cogniblend/curation/AutoSaveIndicator.tsx`** (~40 lines)
- Props: `status: 'idle' | 'saving' | 'saved' | 'error'`
- Renders: nothing (idle), `Saving...` spinner (saving), `Saved` checkmark (saved, fades after 2s), `Save failed` warning (error)
- Placed in section header area, not inside editor

### Files to Modify

**4. `src/hooks/cogniblend/useCurationPageOrchestrator.ts`** (line 118)
- Remove `toast.success('Section updated successfully')` from `saveSectionMutation.onSuccess`
- Remove `setEditingSection(null)` from `saveSectionMutation.onSuccess`
- Keep `setSavingSection(false)` and `queryClient.invalidateQueries`
- Keep `onError` toast (errors should still alert)

**5. `src/components/cogniblend/curation/CurationSectionEditor.tsx`**
- `TextSectionEditor`: Remove Save/Cancel buttons, call `onSave(draft)` on every `setDraft` (debounced via parent hook), add `AutoSaveIndicator`
- `DeliverablesEditor`: Call `onSave` on every item change (debounced), remove Save/Cancel, add indicator
- `EvalCriteriaEditor`: Call `onSave` on every row change (debounced), keep weight validation as inline warning (not save blocker), remove Save/Cancel, add indicator

**6. `src/components/cogniblend/curation/renderers/TableSectionEditor.tsx`**
- Call `onSave` on every cell change (debounced), remove Save/Cancel buttons, add indicator

**7. `src/components/cogniblend/curation/renderers/RichTextSectionRenderer.tsx`**
- Pass autosave status down for indicator display

**8. `src/components/cogniblend/curation/renderers/CheckboxSingleSectionRenderer.tsx`**
- Already saves immediately on `onValueChange` -- just remove the explicit Save button if present, add indicator

**9. `src/components/cogniblend/curation/renderers/CheckboxMultiSectionRenderer.tsx`**
- Remove Save/Cancel buttons, call `onSave(draft)` on every checkbox toggle (immediate), add indicator

**10. `src/components/cogniblend/curation/SectionPanelItem.tsx`**
- Remove the `cancelEdit` / `setEditingSection(null)` pattern for autosaved sections
- Sections become "always editable" when not readOnly (no explicit edit mode toggle needed)

**11. `src/components/cogniblend/curation/BriefSubsectionContent.tsx`**
- Wire autosave for extended_brief subsections (rich text, line items, stakeholder table)

### What Does NOT Change

- **Reward Structure** -- keeps its own specialized save + lock flow
- **Complexity Assessment** -- keeps lock mechanism
- **Legal Docs / Escrow** -- locked sections, coordinator-driven
- **AI Review accept/reject** -- these are deliberate actions, not autosave
- **TagInputSectionRenderer** -- already saves immediately (onAdd/onRemove), no change needed
- **Domain Tags** -- already immediate save via `handleAddDomainTag`/`handleRemoveDomainTag`
- **Industry Segment** -- already immediate save via `handleIndustrySegmentChange`

### Autosave Status Flow

```text
User types/changes value
     |
     v
Debounce timer starts (600ms for text, 0ms for selections)
     |
     v (timer fires)
status = 'saving' → indicator shows "Saving..."
     |
     v
saveSectionMutation.mutate() called silently
     |
     ├── onSuccess → status = 'saved' → "Saved ✓" (2s) → idle
     └── onError   → status = 'error' → "Save failed ⚠" (5s) → idle
```

### Implementation Order

1. Create `useAutoSaveSection` + `useAutoSaveExtendedBrief` hooks
2. Create `AutoSaveIndicator` component
3. Silence `saveSectionMutation` in orchestrator
4. Wire `TextSectionEditor` (highest impact -- problem_statement, scope, hook)
5. Wire `DeliverablesEditor` + `EvalCriteriaEditor`
6. Wire `CheckboxMultiSectionRenderer` (remove Save/Cancel)
7. Wire `TableSectionEditor` + `BriefSubsectionContent`

### Risk Mitigation

- The `editingSection` state is kept but becomes less critical -- sections that autosave don't need the edit/view toggle
- `notifyStaleness` still fires on every save (downstream staleness tracking preserved)
- `queryClient.invalidateQueries` still fires (data consistency preserved)
- Cancel button removed from autosave editors, but Ctrl+Z (undo) works in RichTextEditor natively

