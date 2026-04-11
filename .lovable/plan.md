

## Fix: Add Checkboxes + Content Status Indicators to Source List

### Problem
1. No checkboxes on suggested sources — users can't select specific sources for bulk accept
2. No visibility into whether Summary, Full Text, or Key Data have been extracted for each source in the list — users must click into the detail panel to find out

### Changes

**1. `SuggestionCard.tsx`** — Add checkbox for bulk selection
- Add `Checkbox` import from `@/components/ui/checkbox`
- Add props: `isSelected: boolean`, `onToggleSelect: (id: string) => void`
- Place checkbox before the Sparkles icon, with `stopPropagation` on its click
- Checkbox checked state bound to `isSelected`
- Add content status indicators (3 small dots/icons) showing presence of `extracted_summary`, `extracted_text`, `extracted_key_data`

**2. `SourceList.tsx`** — Manage selection state + wire checkboxes
- Add `useState<Set<string>>` for `selectedIds`
- Add "Select All" / "Deselect All" toggle in the suggested section header
- Pass `isSelected` and `onToggleSelect` to each `SuggestionCard`
- Change "Accept All" button to "Accept Selected (N)" when selections exist
- Wire `onAcceptMultiple` to use `selectedIds` when selections exist, otherwise all suggested
- Add content status indicators to accepted source rows too (Summary/Text/Data dots)
- Clear selection set after accept/reject actions

**3. Accepted source rows in `SourceList.tsx`** — Add content indicators
- Below each accepted source's extraction badge, add 3 small indicator badges: "S" (Summary), "T" (Text), "D" (Data)
- Color-coded: present = emerald outline, missing = muted/dashed outline
- This gives at-a-glance visibility into extraction completeness without clicking into detail

### No other files affected
- `ContextLibraryDrawer.tsx` already passes all needed handlers
- `SourceDetail.tsx` already shows the full tabs — no changes needed

### Technical Detail
- Selection state is local to `SourceList` since it's ephemeral UI state
- Content indicators use the existing `extracted_summary`, `extracted_text`, `extracted_key_data` fields already fetched by `useContextSources`
- Indicator component: ~15 lines, inline in SourceList or extracted as a tiny helper

