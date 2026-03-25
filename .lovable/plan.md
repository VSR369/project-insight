

# Redesign Evaluation Criteria Section — Rich Editor with Weight Distribution

## Overview
Create a new `EvaluationCriteriaSection.tsx` component that replaces the current plain table editor with a visually rich, interactive editor featuring a color-coded weight distribution bar, per-row mini bars, live totals with validation states, and an auto-balance feature.

## New file

### `src/components/cogniblend/curation/renderers/EvaluationCriteriaSection.tsx`
A self-contained component handling both **view mode** and **edit mode** for evaluation criteria.

**Props**: `criteria`, `readOnly`, `editing`, `onSave`, `onCancel`, `saving`, `aiStatus` (for reviewed footer)

**Constants**:
```
CRITERION_COLORS = ['#378ADD', '#1D9E75', '#7F77DD', '#EF9F27', '#D85A30', '#D4537E']
```

**Sections (top to bottom)**:

1. **Weight Distribution Bar** — 6px stacked horizontal bar at top, each segment colored by criterion index, width = weight%. Legend below with colored dots, truncated names (16 chars), and weight%.

2. **Column Headers** — "CRITERION" (flex-1), "WEIGHT" (w-[88px]), "DISTRIBUTION" (w-[60px]), delete spacer (w-8). Uppercase 10px labels on gray-50 background.

3. **Criterion Rows** — Each row is a rounded card with:
   - Row number (w-7, gray)
   - Criterion name input (flex-1, borderless)
   - Weight input (w-[44px], centered) + "%" label
   - Mini progress bar (w-[52px], colored to match distribution bar)
   - Delete button (appears on hover, fades in)

4. **Totals Row** — Live reactive display:
   - Left: "{n} criteria" count
   - Right: Total with color-coded status (green=100%, amber<100%, red>100%)
   - Auto-balance link when total ≠ 100 (distributes remaining proportionally)

5. **Add Criterion Row** — Dashed border button with "Add criterion" + right-side hint "Weights must total 100%"

6. **Footer** — Cancel/Save buttons. Save disabled when total ≠ 100 with tooltip.

7. **Reviewed State Footer** — When `aiStatus` is 'reviewed' or 'addressed': green bar with checkmark, "Section reviewed and addressed" text, and "Re-review this section" button.

**View mode** (not editing): Renders same distribution bar + column headers + read-only rows (no inputs, no delete, no add/footer).

## Modified files

### `src/pages/cogniblend/CurationReviewPage.tsx`
- **Lines 2315-2335**: Replace the `evaluation_criteria` case to use `EvaluationCriteriaSection` instead of `TableSectionRenderer` + separate Edit button
- Pass `aiStatus` from the computed `panelStatus` and `onReReview` callback
- The new component handles its own edit/view toggle internally, so remove the external Edit button

### `src/components/cogniblend/curation/CurationSectionEditor.tsx`
- No changes needed — the existing `EvalCriteriaEditor` stays for backward compatibility (used by `TableSectionRenderer` which other sections may reference)

## Technical details

- **Auto-balance algorithm**: If total ≠ 100, scale each weight proportionally: `newWeight = Math.round(weight / total * 100)`. Distribute rounding remainder to the largest criterion.
- **Animation**: CSS transitions on bar segment widths (`transition: width 0.3s ease`) and mini-bar fills (`transition: width 0.25s ease`)
- **Color cycling**: Index-based from `CRITERION_COLORS` array, wraps with modulo for >6 criteria
- **Save validation**: Button disabled + tooltip when `total !== 100`
- **Delete**: Hidden by default, shown on row hover via Tailwind `group-hover:opacity-100`
- Uses existing `handleSaveEvalCriteria` callback — no data model changes

