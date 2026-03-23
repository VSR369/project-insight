

# Fix: Show Selected Template in View & Edit Modes

## Problem
1. **View mode** shows only a small badge or "No template selected" — user wants the full template grid visible with the selected one highlighted (read-only)
2. **Edit mode** shows the grid but doesn't highlight the previously selected template because `selectedTemplate` state may not be restored from DB

## Changes

### File: `src/components/cogniblend/SimpleIntakeForm.tsx`

**View mode — show full grid (read-only) instead of badge:**
- Replace the view-mode badge/placeholder (lines 402-419 for AGG, lines 680-697 for MP) with the full `TemplateSelector` grid
- Pass a `disabled` or `readOnly` prop so cards are non-interactive in view mode
- Keep the selected card highlighted via `selectedId`

**Edit mode — ensure selected template is highlighted:**
- The init effect already restores `selectedTemplate` from `extended_brief.challenge_template_id` — this should work for both view and edit since `isEditMode` covers both

### File: `src/components/cogniblend/TemplateSelector.tsx`

**Add `disabled` prop:**
- Accept an optional `disabled?: boolean` prop
- When `disabled`, suppress `onClick` and apply a `pointer-events-none` / reduced-opacity style to non-selected cards, keeping the selected card visually prominent
- Include the "What kind of challenge are you creating?" heading in both modes

## Summary
Two files changed: TemplateSelector gets a `disabled` prop, and SimpleIntakeForm shows the full grid in view mode (read-only with selection highlighted) instead of a minimal badge.

