

# Fix Partner Level & Expertise Level UX in Solver Expertise Section

## Problems

1. **Partner level missing from tree**: Line 158 filters out expertise levels with zero proficiency areas (`.filter(el => el.proficiencyAreas.length > 0)`). Partner has no proficiency areas for the selected industry, so it's excluded from the collapsible tree.
2. **Tree shown without clicking checkboxes**: When no expertise levels are checked, `filteredTree` returns the full tree (line 217). User expects the tree to only appear after explicitly selecting levels.
3. **No "All" option**: There's no explicit "All" checkbox for expertise levels.
4. **Empty selection should mean full tree**: If only industry segment is selected and nothing else is explicitly checked, saving should imply ALL levels/areas/sub-domains/specialities.

## Changes — `SolverExpertiseSection.tsx`

### A. Include all expertise levels in tree (even those with no proficiency areas)
Remove the `.filter(el => el.proficiencyAreas.length > 0)` at line 158. All levels appear in the tree — Partner will show with "0 areas" badge.

### B. Add "All" checkbox for expertise levels
Add an "All Levels" checkbox above the individual level checkboxes. When checked, all individual checkboxes become checked. When unchecked, all get unchecked. When individual boxes are toggled such that all are checked, "All" auto-checks. When any individual is unchecked, "All" unchecks.

### C. Only show taxonomy tree after expertise level selection
Change the tree rendering logic:
- If no expertise level checkboxes are checked AND "All" is not checked → show a hint message: "Select expertise levels above to view the taxonomy tree"
- If "All" is checked → show full tree
- If specific levels are checked → show filtered tree (only those levels)

### D. Save semantics: empty = all
No change needed here — the current save already stores `undefined` for empty arrays, and view mode shows "All Applicable". The "All" checkbox just provides explicit UX for this.

## Technical Details

**"All" checkbox state**: Derived from `selectedELs.size === allExpertiseLevels.length` (all checked) or a separate `allELsChecked` boolean. When "All" is toggled ON, set `selectedELs` to all IDs. When toggled OFF, clear the set.

**Tree visibility condition**:
```typescript
const showTree = selectedELs.size > 0;
```

**Tree building** (line 158 change):
```typescript
// Remove: .filter(el => el.proficiencyAreas.length > 0);
// Keep all levels in tree regardless of whether they have proficiency areas
```

**"All" checkbox rendering**:
```tsx
<label className="flex items-center gap-2 cursor-pointer font-medium">
  <Checkbox
    checked={selectedELs.size === allExpertiseLevels.length && allExpertiseLevels.length > 0}
    onCheckedChange={(checked) => {
      if (checked) setSelectedELs(new Set(allExpertiseLevels.map(el => el.id)));
      else setSelectedELs(new Set());
    }}
  />
  <span className="text-sm">All Levels</span>
</label>
```

