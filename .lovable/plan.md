

# Improve Phase Schedule AI Suggested Table Layout

## Problem

The current `EditableScheduleRows` component renders a basic `<Table>` with inputs but lacks the polished structure shown in the reference design: no row numbers, no zebra striping, no highlighted duration badges, and the container's `max-h-72` clips content awkwardly.

## Changes

**File:** `src/components/cogniblend/curation/AIReviewResultPanel.tsx`

### 1. Enhance `EditableScheduleRows` (lines 308-391)

- Add a `#` column with row number (mono font, muted text)
- Add zebra striping via alternating row backgrounds (`even:bg-muted/30`)
- Highlight duration values with an amber badge-style wrapper (`bg-amber-50 text-amber-700 border border-amber-200 rounded px-2`)
- Improve cell padding for a cleaner look (match reference's `py-3 px-4` feel while keeping inputs compact)
- Use `hover:bg-blue-50/40` on rows for interactive feedback

### 2. Fix container (line 983)

- Remove `max-h-72` constraint — the schedule table is typically 5-7 rows and should display fully without scroll clipping
- Keep `overflow-y-auto` as a safety net for unusually long schedules

### Result

The AI Suggested Version schedule table will match the polished reference design with row numbers, zebra striping, duration highlighting, and hover states while remaining fully editable.

## Technical Details

```tsx
function EditableScheduleRows({ rows, onChange }) {
  return (
    <div className="space-y-2">
      <div className="relative w-full overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-10 text-xs">#</TableHead>
              <TableHead className="min-w-[180px] text-xs">Phase / Deliverable</TableHead>
              <TableHead className="w-[120px] text-xs text-center">Duration (days)</TableHead>
              <TableHead className="w-[140px] text-xs text-center">Start Date</TableHead>
              <TableHead className="w-[140px] text-xs text-center">End Date</TableHead>
              <TableHead className="w-[40px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={i} className={cn(
                "transition-colors hover:bg-blue-50/40",
                i % 2 !== 0 && "bg-muted/30"
              )}>
                <TableCell className="p-1.5 text-muted-foreground font-mono text-xs">
                  {i + 1}
                </TableCell>
                <TableCell className="p-1.5">
                  <Input value={...} className="text-sm h-8" />
                </TableCell>
                <TableCell className="p-1.5">
                  <Input type="number" className="text-sm h-8 text-center" />
                </TableCell>
                <TableCell className="p-1.5">
                  <Input type="date" className="text-sm h-8" />
                </TableCell>
                <TableCell className="p-1.5">
                  <Input type="date" className="text-sm h-8" />
                </TableCell>
                <TableCell className="p-1.5">
                  <Button variant="ghost" ... />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Button variant="outline" size="sm">+ Add Phase</Button>
    </div>
  );
}
```

Container change (line 983):
```tsx
// Before
<div className="rounded-lg border border-indigo-200 bg-indigo-50 mx-4 mb-3 p-4 shadow-sm max-h-72 overflow-y-auto">

// After
<div className="rounded-lg border border-indigo-200 bg-indigo-50 mx-4 mb-3 p-4 shadow-sm overflow-y-auto">
```

## Files Changed

| File | Change |
|------|--------|
| `src/components/cogniblend/curation/AIReviewResultPanel.tsx` | Enhance `EditableScheduleRows` with row numbers, zebra striping, header styling, hover states; remove `max-h-72` from container |

