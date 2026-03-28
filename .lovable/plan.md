

# Standardize Extended Brief Subsections as Individual Sections

## Problem

The Extended Brief tab currently treats its 6 subsections differently from all other tabs:
- Other tabs (Content, Evaluation, etc.) list individual `SECTIONS` entries, each getting its own `CuratorSectionPanel` rendered by the main `sectionKeys.map()` loop
- Extended Brief has a single `SECTIONS` entry (`key: "extended_brief"`) that delegates to `ExtendedBriefDisplay`, which internally creates its own `CuratorSectionPanel` per subsection

This creates inconsistency in progress tracking, expand/collapse, AI review integration, and the overall UX.

## Approach

Replace the single `extended_brief` SECTIONS entry with 6 individual section entries — one per subsection. They render in the standard main loop like every other section, using the same format-native renderers.

**No changes to**: AI review, acceptance logic, JSONB persistence, `handleAcceptExtendedBriefRefinement`, `handleSaveExtendedBrief`, or `ExtendedBriefDisplay` internals (we stop using it but don't delete it).

## Changes — `CurationReviewPage.tsx`

### A. Replace the single `extended_brief` SECTIONS entry with 6 entries

Remove the existing `{ key: "extended_brief", ... }` from `SECTIONS`. Add 6 new entries:

```
context_and_background  → rich_text, dbField: "extended_brief"
root_causes             → line_items, dbField: "extended_brief"
affected_stakeholders   → table, dbField: "extended_brief"
current_deficiencies    → line_items, dbField: "extended_brief"
preferred_approach      → line_items, dbField: "extended_brief"
approaches_not_of_interest → line_items, dbField: "extended_brief"
```

Each has `isFilled` that checks the specific JSONB field within `challenge.extended_brief`, and `render` that returns null (handled by the switch-case in the main loop).

### B. Update `GROUPS` definition for `extended_brief`

Change `sectionKeys` from `["extended_brief"]` to the 6 subsection keys:
```typescript
sectionKeys: [
  "context_and_background", "root_causes", "affected_stakeholders",
  "current_deficiencies", "preferred_approach", "approaches_not_of_interest"
]
```

### C. Add switch-case branches in the main section rendering loop

For each of the 6 subsection keys, add a case that:
- Reads from `challenge.extended_brief` JSONB using `EXTENDED_BRIEF_FIELD_MAP`
- Renders with the appropriate renderer (RichText, LineItems, or StakeholderTable)
- Saves via a subsection-aware handler that merges into the `extended_brief` JSONB

Move the `StakeholderTableEditor` and `StakeholderTableView` components (currently in `ExtendedBriefDisplay.tsx`) — import them or inline equivalent rendering.

### D. Simplify `groupProgress` computation

Remove the special `if (g.id === "extended_brief")` branch. The standard path (`secs.filter(s => s.isFilled(...))`) now works because each subsection has its own `isFilled`.

### E. Remove `handleExpandCollapseAll` special case

Remove the `if (groupDef.id === "extended_brief")` block that manually iterates subsection keys — no longer needed since subsections are now top-level section keys.

### F. Update progress strip grid

Change `grid-cols-4` to `grid-cols-5` at `lg:` breakpoint to properly fit all 5 group buttons. Or use `lg:grid-cols-5`.

### G. Wire AI review and save handlers

Each subsection's `CuratorSectionPanel` in the main loop gets:
- `aiReviewSlot` using the existing `CurationAIReviewInline` (same as current)
- Save handler: merges value into `challenge.extended_brief` JSONB via `handleSaveExtendedBrief`
- Accept refinement: delegates to `handleAcceptExtendedBriefRefinement` (already handles subsection keys)

### H. Import StakeholderTableEditor/View

Import the `StakeholderTableEditor` and `StakeholderTableView` from `ExtendedBriefDisplay.tsx` (export them) or move to a separate file under `renderers/`.

## Files Modified

1. **`src/pages/cogniblend/CurationReviewPage.tsx`** — Main changes (sections, groups, rendering, progress)
2. **`src/components/cogniblend/curation/ExtendedBriefDisplay.tsx`** — Export `StakeholderTableEditor`, `StakeholderTableView`, helper functions (`parseExtendedBrief`, `ensureStringArray`, `ensureStakeholderArray`, `getSubsectionValue`)

## What Stays the Same

- All AI review logic (per-subsection reviews already work)
- `handleAcceptExtendedBriefRefinement` — unchanged, already handles subsection keys
- `handleSaveExtendedBrief` — unchanged, merges into JSONB
- JSONB persistence model (`extended_brief` column structure)
- `EXTENDED_BRIEF_FIELD_MAP` and `EXTENDED_BRIEF_SUBSECTION_KEYS`
- Zustand store sync
- All other tabs' rendering

