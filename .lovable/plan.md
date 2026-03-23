

# Fix: AM Dashboard View — Template Badge + Edit Toggle

## Issues

1. **Template badge not showing in AM view mode**: When viewing a challenge from the dashboard, the "Challenge Type" card doesn't appear even if a template was selected during creation. Root cause: the `selected_template` form field value is set during init (line 260), but the `selectedTemplate` state (which controls the badge render) depends on `extended_brief.challenge_template_id` being present (line 244-247). If the challenge was created before the persistence fix, or if the template wasn't selected, the badge won't show.

2. **Edit button not visible**: The `AMRequestViewPage.tsx` already has the Edit/View toggle button (lines 29-39). However, the `CreationContextBar` and the Edit button are in a `flex justify-between` container — if `CreationContextBar` renders wide content, the button may be pushed off-screen or not visible. Need to verify layout and ensure the button is always visible.

## Changes

### File: `src/components/cogniblend/SimpleIntakeForm.tsx`

**Fix template restoration in view/edit mode:**
- In the edit init effect (line 244-247), also check `selected_template` form field as a fallback — some challenges may have the template ID in different locations
- Ensure `selectedTemplate` state is always set when a valid template ID is found anywhere in the challenge data

**Fix view mode template visibility:**
- In both AGG and MP view mode sections, if no `selectedTemplate` is found but `selected_template` form value exists, look it up from `CHALLENGE_TEMPLATES` and display the badge
- Add a "No template selected" placeholder when viewing a challenge without a template, instead of rendering nothing

### File: `src/pages/cogniblend/AMRequestViewPage.tsx`

**Ensure Edit button is always visible:**
- Add `shrink-0` to the Edit button to prevent flex shrinking
- Wrap `CreationContextBar` with `min-w-0 flex-1` to allow truncation instead of pushing the button off-screen
- Ensure the header layout works on all viewport widths

## Summary
Two targeted fixes: (1) robust template state restoration from DB data so the "Challenge Type" badge always appears in view mode, and (2) layout fix to guarantee the Edit/View toggle button remains visible alongside the context bar.

