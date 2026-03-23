

# Enable View Mode for Incoming Challenges in Curation Queue

## Problem
Phase 1 and Phase 2 challenges in the Curation Queue are listed but completely non-clickable. The curator cannot view the challenge content at all — they just see a muted row with a tooltip. The user wants to be able to **view** (read-only) these challenges, with **edit** only enabled once LC/FC complete their work (Phase 3).

## Changes

### File 1: `src/pages/cogniblend/CurationQueuePage.tsx`

**Make Phase 1/2 rows clickable** — navigate to the same curation review page but with a `?mode=view` query param:

- Remove the `if (isIncoming) return;` guard on row click (line 402)
- Change navigation for incoming challenges to `/cogni/curation/${ch.id}?mode=view`
- Make the title a styled link (like Phase 3) but with an Eye icon instead, and muted color
- Keep the amber/blue badge and tooltip but allow click-through

### File 2: `src/pages/cogniblend/CurationReviewPage.tsx`

**Add a `isReadOnly` flag** derived from `challenge.current_phase < 3` (or from `?mode=view` query param):

1. **Read `mode` from URL search params** at the top of the component
2. **Compute `isReadOnly`**: `true` when `challenge.current_phase < 3`
3. **Show a read-only banner** at the top: "This challenge is in [Phase description] — view only until Legal & Finance review is complete"
4. **Suppress all edit controls when `isReadOnly`**:
   - Hide the "Edit" button on each section (`canEdit && !isReadOnly`)
   - Disable the checklist checkboxes
   - Hide "Submit to ID" and other action buttons in `CurationActions` (pass `readOnly` prop)
   - Disable AI quality analysis and AI review buttons
   - Hide `ModificationPointsTracker` actions
5. **Keep all content visible** — sections render normally, the curator can read everything the CR/CA produced

### File 3: `src/components/cogniblend/curation/CurationActions.tsx`

**Add `readOnly` prop** — when true, hide or disable all action buttons (Submit, Hold, Return, etc.)

## Summary

Two behavioral changes:
1. **Queue page**: Phase 1/2 rows become clickable → open read-only curation view
2. **Review page**: When `current_phase < 3`, all editing/action controls are hidden; content is fully visible

This ensures the curator can preview incoming work while respecting the LC/FC gate for editability.

