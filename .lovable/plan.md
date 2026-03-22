

# Plan: Add Rich Text Editors to AM Intake + Preserve Formatting in View

## Problem
The AM (Marketplace) intake form uses plain `<Textarea>` for "Problem Summary" and "What success looks like commercially". Other roles (RQ) already have `RichTextEditor` with fullscreen expand for their equivalent fields. When viewed on `AMRequestViewPage`, content renders as plain text with `whitespace-pre-wrap`, losing any formatting.

## Changes

### 1. Replace Textarea with RichTextEditor in AM intake form
**File**: `src/components/cogniblend/SimpleIntakeForm.tsx`

**Problem Summary field** (lines 491-506):
- Replace `<Textarea {...register('problem_summary')}>` with a `<Controller>` + `<RichTextEditor>` (same pattern used in the RQ/AGG section above at line 301-311).
- Add an Expand button + fullscreen `<Dialog>` with the editor inside (same pattern as `problemFullscreen` dialog at lines 320-342).
- Remove the `maxLength={500}` constraint (rich text HTML will exceed 500 chars). Update `mpSchema.problem_summary` max to 5000 to match RQ.

**"What success looks like commercially" field** (lines 596-607):
- Replace `<Textarea {...register('solution_expectations')}>` with `<Controller>` + `<RichTextEditor>`.
- Add Expand button + fullscreen `<Dialog>` (new state `commercialFullscreen`).
- Update `mpSchema.solution_expectations` max to 5000.

### 2. Render rich HTML in AMRequestViewPage
**File**: `src/pages/cogniblend/AMRequestViewPage.tsx`

- Import `SafeHtmlRenderer` from `@/components/ui/SafeHtmlRenderer`.
- Replace the plain `<p className="whitespace-pre-wrap">` for `problem_statement` (line 166) with `<SafeHtmlRenderer html={brief.problem_statement} />`.
- Replace the plain `<p>` for `scope` / solution_expectations (line 176) with `<SafeHtmlRenderer>`.
- Replace the plain `<p>` for `beneficiaries_mapping` (line 217) with `<SafeHtmlRenderer>`.

This ensures formatting (bold, lists, headings) entered via the rich text editor is preserved exactly when viewed.

### 3. Schema validation update
**File**: `src/components/cogniblend/SimpleIntakeForm.tsx`

- `problem_summary`: Change `.max(500)` to `.max(5000)` since rich HTML is longer than plain text.
- `solution_expectations`: Change `.max(500)` to `.max(5000)`.
- Remove the character counter divs for these two fields (no longer meaningful for rich text).

## Files Modified

| File | Change |
|------|--------|
| `src/components/cogniblend/SimpleIntakeForm.tsx` | Replace 2 Textareas with RichTextEditor + fullscreen dialogs; update schema limits |
| `src/pages/cogniblend/AMRequestViewPage.tsx` | Use `SafeHtmlRenderer` for rich-text fields instead of plain `<p>` tags |

