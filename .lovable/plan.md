

# Fix Solver Expertise Section: Edit Button, Expertise Levels, and "All" Semantics

## Problems Identified

1. **Edit button disappears intermittently**: `SolverExpertiseSection` has two early returns (lines 265-270 and 274-297) that **replace the entire section output** — including the parent's Edit button rendered *after* the component. When `effectiveSegmentId` is null, the component returns its own UI and the parent's `{canEdit && !isEditing && <Button>Edit</Button>}` never renders because it's outside the component.

2. **Expertise levels not shown**: The view mode (lines 300-350) only displays proficiency areas, sub-domains, and specialities — expertise levels are completely omitted from both view and save.

3. **No "All" semantics**: Currently the user must manually check items. The requirement is: if nothing is selected at a level, it means "All" at that level.

## Plan

### File: `src/components/cogniblend/curation/SolverExpertiseSection.tsx`

**A. Remove conditional early returns that hide Edit button**

Move the "no segment" fallback UI *inside* the main return structure so the parent's Edit button is always rendered. The component should never return early in a way that prevents the parent from rendering its button. Specifically:

- Remove the early return at lines 265-270 (no segment, not editing). Instead, render this message inline within the normal view mode block.
- Remove the early return at lines 274-296 (no segment, editing). Instead, render the industry segment selector as part of the normal edit mode flow, *before* the taxonomy tree.

**B. Add expertise_levels to the data model and display**

- Add `selectedELs` state (Set of expertise level IDs) initialized from `parsed.expertise_levels`
- In **view mode**: show a "Expertise Levels" badge row before proficiency areas. If none saved → show "All Levels"
- In **edit mode**: show expertise level checkboxes at the top of the tree (before expanding into proficiency areas). Each expertise level gets a checkbox
- In **handleSave**: include `expertise_levels` in the save payload

**C. Implement "All" = nothing selected semantics**

- In view mode: if `expertise_levels` is empty/undefined → display "All Levels" badge. Same for proficiency areas ("All Areas"), sub-domains, specialities
- In edit mode: show a note at the top: "Unchecked = All applicable at that level"
- The tree still allows selective checking, but empty selection at any level means "all"
- Filter the tree display: if specific expertise levels are checked, only show proficiency areas under those levels. If none checked (= all), show everything

**D. Tree filtering by selected expertise levels**

When expertise levels are selectively checked:
- Only show proficiency areas belonging to checked expertise levels
- Sub-domains and specialities cascade naturally since they're nested under proficiency areas
- When no expertise levels are checked → show all (current behavior)

### File: `src/pages/cogniblend/CurationReviewPage.tsx`

No changes needed — the Edit button logic at line 2806 is already correct (`canEdit && !isEditing`). The fix is entirely in the component removing its early returns.

## Technical Details

**State additions in SolverExpertiseSection:**
```typescript
const [selectedELs, setSelectedELs] = useState<Set<string>>(
  new Set((parsed.expertise_levels ?? []).map(i => i.id))
);
```

**Tree filtering logic:**
```typescript
const filteredTree = useMemo(() => {
  if (selectedELs.size === 0) return tree; // All levels
  return tree.filter(el => selectedELs.has(el.id));
}, [tree, selectedELs]);
```

**Save payload update:**
```typescript
const savePayload: SolverExpertiseData = {
  expertise_levels: elItems.length > 0 ? elItems : undefined, // undefined = all
  proficiency_areas: paItems.length > 0 ? paItems : undefined,
  sub_domains: sdItems.length > 0 ? sdItems : undefined,
  specialities: spItems.length > 0 ? spItems : undefined,
};
```

**View mode expertise levels display:**
```tsx
<div>
  <p className="text-xs font-medium text-muted-foreground mb-1">Expertise Levels</p>
  {(!parsed.expertise_levels || parsed.expertise_levels.length === 0) ? (
    <Badge variant="secondary">All Levels</Badge>
  ) : (
    <div className="flex flex-wrap gap-1.5">
      {parsed.expertise_levels.map(el => (
        <Badge key={el.id} variant="outline">{el.name}</Badge>
      ))}
    </div>
  )}
</div>
```

## Result

- Edit button is **always visible** when `canEdit && !isEditing` — no more intermittent disappearance
- Expertise levels shown in both view and edit modes with checkboxes
- "All" semantics: unchecked at any level = all applicable (no restriction)
- Selective expertise level checkboxes filter the visible tree below them

