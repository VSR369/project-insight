

## Plan: Fix Tier Values & Move Add Document Section

### Problem
1. The "Add New Legal Document" form sends tier as `'1'` or `'2'` but the database expects `'TIER_1'` or `'TIER_2'`, causing an insert error.
2. The "Add New Legal Document" section is positioned above the AI-generated documents section — it should be at the bottom (before the Submit to Curation card), in a collapsible mode.

### Changes — Single File: `src/pages/cogniblend/LcLegalWorkspacePage.tsx`

**1. Fix tier values**
- Change the default state from `'1'` to `'TIER_1'` (line 298)
- Change the reset value from `'1'` to `'TIER_1'` (line 450)
- Change the `<SelectItem>` values from `"1"` / `"2"` to `"TIER_1"` / `"TIER_2"` (lines 914-915)

**2. Move "Add New Legal Document" to bottom**
- Cut the entire Section 3 block (lines 856-973) from its current position (above the AI generation section)
- Paste it just before the "Submit to Curation" card (before line 1156), after the AI suggestions list

**3. Wrap in Collapsible**
- Replace the toggle button / Card pattern with a `Collapsible` component that defaults to closed
- Use a styled trigger button as the collapsible header so the form is hidden by default and expandable on click

