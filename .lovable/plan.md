

## Plan: Fix Legal Workspace — Submit, Delete, Upload, and Curation Package

### Issues Found

1. **Submit to Curation button disappears**: The "Submit to Curation" card, "Add Document Manually" button, and "Attached Documents" section are all inside the `{hasSuggestions && ...}` block (line 930). Once all AI suggestions are accepted/dismissed, everything disappears.

2. **Edited content not saved on Accept**: The `acceptDocMutation` updates status to `ATTACHED` but never persists the edited `content_summary` back to the DB row.

3. **Manual add doesn't save content**: `handleAddNewDoc` omits `content_summary` from the insert — `newDocContent` is never sent to the DB.

4. **Curation page doesn't recognize `ATTACHED` status**: `CurationReviewPage.tsx` line 499 filters for `default_applied` or `custom_uploaded`, so `ATTACHED` docs show as 0 attached.

5. **Phase mismatch**: Challenge is at phase 1, but `handleSubmitToCuration` calls `validate_gate_02` (phase 2→3). The submit button should check the current phase and only appear when appropriate, or the flow should handle phase 1→2 first. Since LC is step 3 in the workflow, and the challenge is still phase 1, this needs the phase to be at 2 before LC can advance it.

### Fix Plan

**File 1: `src/pages/cogniblend/LcLegalWorkspacePage.tsx`**

- Move "Attached Legal Documents", "Add Document Manually", and "Submit to Curation" sections **outside** the `{hasSuggestions && ...}` block so they are always visible when docs exist or the user is LC.
- In `acceptDocMutation`: add `content_summary: edit.content || doc.content_summary` to the update payload.
- In `handleAddNewDoc`: add `content_summary: newDocContent || null` to the insert payload.
- Show the "Generate" button always when LC (not only when no suggestions exist), so LC can re-generate after dismissing all.
- Add phase-awareness to "Submit to Curation": disable/hide when challenge phase is not 2, show a note about the current phase.

**File 2: `src/pages/cogniblend/CurationReviewPage.tsx`**

- Update the legal doc status filter from `default_applied || custom_uploaded` to also include `ATTACHED`, so docs attached by the LC workspace are counted correctly.

### Files Modified
- `src/pages/cogniblend/LcLegalWorkspacePage.tsx`
- `src/pages/cogniblend/CurationReviewPage.tsx`

