

# Fix: Phase Schedule AI Suggested Table — Distorted Layout

## Problem

The AI Suggested Version for the Phase Schedule section renders each row as a flat `div` with inline inputs (no column headers, no alignment). This looks distorted compared to every other table in the system which uses the proper `<Table>` component with aligned columns.

The root cause is the `EditableScheduleRows` component (lines 308-366 of `AIReviewResultPanel.tsx`) which uses `flex` divs instead of a structured table.

## Fix

**File:** `src/components/cogniblend/curation/AIReviewResultPanel.tsx`

Replace the `EditableScheduleRows` component with a proper `<Table>`-based layout that matches the `ScheduleTableSectionRenderer` edit mode:

```tsx
function EditableScheduleRows({ rows, onChange }) {
  return (
    <div className="space-y-2">
      <div className="relative w-full overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[180px] text-xs">Phase / Deliverable</TableHead>
              <TableHead className="w-[100px] text-xs text-right">Duration (days)</TableHead>
              <TableHead className="w-[140px] text-xs">Start Date</TableHead>
              <TableHead className="w-[140px] text-xs">End Date</TableHead>
              <TableHead className="w-[40px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={i}>
                <TableCell><Input ... /></TableCell>
                <TableCell><Input type="number" ... /></TableCell>
                <TableCell><Input type="date" ... /></TableCell>
                <TableCell><Input type="date" ... /></TableCell>
                <TableCell><Delete button /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Button>+ Add Phase</Button>
    </div>
  );
}
```

This gives:
- Proper column headers (Phase/Deliverable, Duration, Start Date, End Date)
- Aligned columns via `<Table>` layout
- Consistent styling with the view-mode schedule table and other AI suggestion tables
- Scrollable overflow wrapper for narrow viewports

## Files Changed

| File | Change |
|------|--------|
| `src/components/cogniblend/curation/AIReviewResultPanel.tsx` | Rewrite `EditableScheduleRows` to use `<Table>` with headers and aligned columns |

