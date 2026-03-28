

# Fix Duplicate Rows in Affected Stakeholders AI Suggestion Table

## Root Cause

`TableLineItemRenderer.tsx` renders **both** a read-only display value (`renderCellValue`) AND an editable `<Input>` underneath for every cell (lines 163-173). This creates the duplicate appearance visible in the screenshot — each stakeholder appears twice: once as text, once as an input.

The Phase Schedule fix used a dedicated `EditableScheduleRows` component that renders only clean inputs in a proper table layout. `TableLineItemRenderer` was never updated to match.

## Fix

**File: `src/components/cogniblend/curation/renderers/TableLineItemRenderer.tsx`**

Replace the dual render (read-only + input) in each `<TableCell>` with a single editable input, matching the `EditableScheduleRows` pattern:

```tsx
// BEFORE (lines 163-173) — causes duplicate display
{schema.map((key) => (
  <TableCell key={key} className="px-3 py-2 align-top">
    <div className="space-y-1">
      {renderCellValue(key, row[key])}       ← READ-ONLY
      <Input ... />                           ← EDITABLE
    </div>
  </TableCell>
))}

// AFTER — single clean input per cell
{schema.map((key) => (
  <TableCell key={key} className="px-3 py-1.5 align-middle">
    <Input
      value={String(row[key] ?? "")}
      onChange={(e) => handleCellChange(rowIdx, key, e.target.value)}
      className="h-8 text-sm"
      placeholder={formatColumnHeader(key)}
    />
  </TableCell>
))}
```

Also clean up:
- Remove the now-unused `renderCellValue`, `WeightPill`, `ScoringMethodCell`, and `EvaluatorRoleBadge` helper functions (they only served the read-only display)
- Add alternating row colors (`bg-muted/30` on odd rows) for visual consistency with the Phase Schedule table
- Keep the weight total footer and Add Row button

## Result

- Stakeholder table in AI Suggested Version shows one clean row per stakeholder (editable)
- Matches Phase Schedule table quality — clean inputs, alternating rows, no duplication
- All other sections using `TableLineItemRenderer` (e.g., eval criteria) also benefit

## Files Changed: 1

| File | Change |
|------|--------|
| `src/components/cogniblend/curation/renderers/TableLineItemRenderer.tsx` | Remove dual render, show only editable inputs |

