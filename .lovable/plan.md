

# 5-Why Root Cause Analysis: Phase Schedule Distorted Table

## The Problem

The screenshot shows each phase row appearing **twice** — once as read-only text and once as editable inputs — creating a messy, distorted layout. The dedicated `EditableScheduleRows` table component (with proper headers, alignment, row numbers) is **never reached**.

## 5-Why Analysis

**Why #1: Why does the schedule table look distorted?**
Because it's rendered by `TableLineItemRenderer` (a generic line-item table) or `EditableLineItems` (plain text list) instead of the purpose-built `EditableScheduleRows` component.

**Why #2: Why is `EditableScheduleRows` not being used?**
Because in the render chain (line 966-993 of `AIReviewResultPanel.tsx`), the `isStructured && structuredItems` branch comes **before** the `scheduleRows` branch. Since `isStructured` is `true` for `schedule_table`, the code enters the generic structured branch and **never reaches** the dedicated schedule branch at line 989.

**Why #3: Why is `isStructured` true for schedule_table?**
Because `isStructuredSection()` in `AIReviewInline.tsx` (line 53) explicitly includes `'schedule_table'` in its format list: `['line_items', 'table', 'schedule_table']`. This causes `structuredItems` to be populated with JSON-stringified phase objects.

**Why #4: Why does the generic structured branch produce bad output?**
Because `detectAndParseLineItems` tries to detect if the JSON strings form a "table" — it was designed for evaluation criteria, not schedules. It either renders via `TableLineItemRenderer` (wrong columns, wrong layout) or falls back to `EditableLineItems` (plain text strings of JSON).

**Why #5: Why wasn't this caught earlier?**
Because the `scheduleRows` parsing at line 535 works correctly, and the `EditableScheduleRows` component was recently upgraded to a proper `<Table>` layout — but neither is ever invoked because the rendering priority is wrong. The code was added incrementally without adjusting the priority chain.

## Root Cause

**The render priority chain in `AIReviewResultPanel.tsx` (lines 958-1004) treats `schedule_table` as a generic structured section, preventing the dedicated schedule renderer from being used.**

## Permanent Fix

**File: `src/components/cogniblend/curation/AIReviewResultPanel.tsx`**

**Change 1 — Fix render priority (lines 966-992)**

Move the `scheduleRows` check **before** the generic `isStructured && structuredItems` check in the ternary chain. This ensures phase schedule data hits the dedicated `EditableScheduleRows` component first:

```
Current order (BROKEN):
  deliverableCards → isStructured+structuredItems → scheduleRows → tableRows → richText

Fixed order:
  deliverableCards → scheduleRows → isStructured+structuredItems → tableRows → richText
```

Specifically, swap the two branches so the ternary reads:

```tsx
) : scheduleRows ? (
  <div className="rounded-lg border border-indigo-200 bg-indigo-50 mx-4 mb-3 p-4 shadow-sm overflow-y-auto">
    <EditableScheduleRows rows={editedScheduleRows ?? scheduleRows.map(r => ({ ...r }))} onChange={handleScheduleRowsChange} />
  </div>
) : isStructured && structuredItems && structuredItems.length > 0 ? (
  // ... generic structured / TableLineItemRenderer / EditableLineItems
```

This is the same pattern used for `deliverableCards` and `rewardData` — format-specific renderers get priority over generic ones.

**No other files need changes.** The `EditableScheduleRows` component already has the correct `<Table>` layout with `#` column, zebra striping, headers, and proper alignment from the previous fix.

## Files Changed

| File | Change |
|------|--------|
| `src/components/cogniblend/curation/AIReviewResultPanel.tsx` | Reorder render priority: move `scheduleRows` branch before `isStructured && structuredItems` branch |

