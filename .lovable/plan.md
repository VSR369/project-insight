

## Fix: Wire Auto-Save Properly (No Double Saves)

### Problem
`handleSaveText` in `useCurationSectionActions.ts` immediately calls `saveSectionMutation.mutate()` on every keystroke. `RichTextSectionRenderer` also instantiates its own `useAutoSaveSection` which fires a SECOND debounced save. Result: every text edit triggers an immediate DB write plus a delayed duplicate. Structured renderers (`CheckboxSingle`, `CheckboxMulti`) accept `autoSaveStatus` but never receive it.

### Solution
Move autosave ownership to `SectionPanelItem` (one hook per section panel). Split `handleSaveText` into store-sync-only + DB-save paths so the debounced autosave is the sole DB writer for text fields. Remove the duplicate `useAutoSaveSection` from `RichTextSectionRenderer`.

### Changes

**1. `src/hooks/cogniblend/useCurationSectionActions.ts`** — Add `handleSyncText` (store + staleness only, no DB write)

```typescript
const handleSyncText = useCallback((sectionKey: string, value: string) => {
  syncSectionToStore(sectionKey as SectionKey, value);
  notifyStaleness(sectionKey);
}, [syncSectionToStore, notifyStaleness]);
```
Export alongside existing `handleSaveText` (which remains for non-autosave callers like AI refinement acceptance).

**2. `src/components/cogniblend/curation/SectionPanelItem.tsx`** — Wire `useAutoSaveSection`, create debounced `handleSaveText` wrapper

- Import `useAutoSaveSection`
- Add to props interface: `handleSyncText: (key: string, val: string) => void`
- Instantiate hook: `useAutoSaveSection(saveSectionMutation, { field: section.dbField ?? section.key, debounceMs: 700, disabled: isReadOnly || isLocked })`
- Create wrapped handler:
  ```typescript
  const debouncedHandleSaveText = useCallback((key: string, field: string, val: string) => {
    handleSyncText(key, val);  // store sync only
    autoSave(val);             // debounced DB save
  }, [handleSyncText, autoSave]);
  ```
- Pass `debouncedHandleSaveText` as `handleSaveText` and `autoSaveStatus` to `renderSectionContent`

**3. `src/components/cogniblend/curation/renderSectionContent.tsx`** — Add `autoSaveStatus` to `RenderSectionContentArgs`

```typescript
import type { AutoSaveStatus } from "@/hooks/cogniblend/useAutoSaveSection";
// Add to interface:
autoSaveStatus?: AutoSaveStatus;
```

**4. `src/components/cogniblend/curation/renderers/renderOrgSections.tsx`** — Pass `autoSaveStatus` to `RichTextSectionRenderer`

Extract `autoSaveStatus` from `args` and pass to every `RichTextSectionRenderer` call. Remove `sectionDbField` and `saveSectionMutation` props from `RichTextSectionRenderer` calls (autosave now handled upstream).

**5. `src/components/cogniblend/curation/renderers/renderCommercialSections.tsx`** — Pass `autoSaveStatus` to `CheckboxSingleSectionRenderer` and `CheckboxMultiSectionRenderer`

Extract `autoSaveStatus` from `args` and add `autoSaveStatus={autoSaveStatus}` to `ip_model`, `eligibility`, `visibility`, `maturity_level` renderer calls.

**6. `src/components/cogniblend/curation/renderers/RichTextSectionRenderer.tsx`** — Remove internal `useAutoSaveSection`

Strip `useAutoSaveSection` hook, `sectionDbField`, `saveSectionMutation` props. Keep `autoSaveStatus` as a display-only prop for the `AutoSaveIndicator`. The component becomes a pure view/edit renderer again — autosave is owned by `SectionPanelItem`.

**7. Propagation through `CurationSectionList.tsx`** — Pass `handleSyncText` from orchestrator

Add `handleSyncText` to `CurationSectionList` props and forward to each `SectionPanelItem`.

### Files changed

| File | Action |
|------|--------|
| `src/hooks/cogniblend/useCurationSectionActions.ts` | Add `handleSyncText` export |
| `src/components/cogniblend/curation/SectionPanelItem.tsx` | Wire `useAutoSaveSection`, wrap text handler |
| `src/components/cogniblend/curation/renderSectionContent.tsx` | Add `autoSaveStatus` to args interface |
| `src/components/cogniblend/curation/renderers/renderOrgSections.tsx` | Pass `autoSaveStatus`, remove renderer-level autosave props |
| `src/components/cogniblend/curation/renderers/renderCommercialSections.tsx` | Pass `autoSaveStatus` to checkbox renderers |
| `src/components/cogniblend/curation/renderers/RichTextSectionRenderer.tsx` | Remove internal `useAutoSaveSection` |
| `src/components/cogniblend/curation/CurationSectionList.tsx` | Forward `handleSyncText` prop |

### What stays unchanged
- `CheckboxSingleSectionRenderer`, `CheckboxMultiSectionRenderer` — already accept `autoSaveStatus` prop
- `useAutoSaveSection` hook — no changes needed
- Structured sections (checkboxes, dropdowns) continue to save immediately via their existing `onSave` → `saveSectionMutation.mutate()` path — they don't need debounce
- `handleSaveText` original function preserved for non-editor callers (AI refinement)

