
Implement the QUICK legal toggle fix so switching between “Keep default document” and “Replace default for this challenge” never destroys the uploaded replacement unless the creator explicitly removes it.

## Root cause
The current toggle handler in `ChallengeCreatorForm.tsx` treats “Keep default” as a destructive action:
- it immediately deletes the existing QUICK override row and stored file
- the form state is then re-synced from query data, so the replacement disappears
- when the creator toggles back to “Replace default”, there is nothing left to show

This makes the toggle behave like a delete button instead of a display-mode selector.

## Required behavior
Use the user-confirmed rule: when toggling back to “Keep default”, the uploaded replacement must be kept saved.

That means:
- `Keep default` = use org default document for preview and downstream resolution
- `Replace default` = use the saved challenge-specific replacement if one exists
- the uploaded replacement remains available when toggling back and forth
- deletion happens only through an explicit remove action

## Implementation changes

### 1) Separate “saved replacement exists” from “currently active mode”
Update `ChallengeCreatorForm.tsx` so the radio toggle only changes:
- `quick_legal_override_mode` form state

It must no longer:
- call `deleteQuickOverride` when switching to `KEEP_DEFAULT`

Instead:
- keep the fetched `quickLegalOverride` row intact
- only call delete when the creator presses the explicit Remove button

Also preserve the current hydration behavior:
- if an override row exists, do not forcibly overwrite the creator’s current toggle choice during the same editing session
- only initialize the form mode once from saved state, or use a guarded sync so query refreshes do not snap the toggle back unexpectedly

### 2) Fix preview resolution in `CreatorLegalPreview.tsx`
The preview currently derives content directly from `quickLegalOverride`, so the replacement can still appear even when the user selected `KEEP_DEFAULT`.

Update the preview logic to resolve an effective document based on both:
- `quickOverrideMode`
- `quickLegalOverride`

Rules:
- if `quickOverrideMode === 'KEEP_DEFAULT'`, show the org default QUICK CPA
- if `quickOverrideMode === 'REPLACE_DEFAULT'` and an override exists, show the uploaded replacement
- if `quickOverrideMode === 'REPLACE_DEFAULT'` but no override exists yet, still show the default doc with clear “no replacement uploaded yet” guidance

Update labels/copy accordingly:
- “Default template in use”
- “Saved replacement available”
- “Challenge-specific replacement in use”

### 3) Make explicit remove the only destructive action
Keep the Remove button, but change its meaning to true deletion:
- when clicked, delete the override row/storage object
- then set mode to `KEEP_DEFAULT`
- invalidate current legal queries as already implemented

This gives three distinct behaviors:
- toggle to Keep default: non-destructive
- toggle to Replace default: non-destructive
- Remove: destructive

## File-specific updates

### `src/components/cogniblend/creator/ChallengeCreatorForm.tsx`
Change:
- `handleQuickLegalOverrideChange` so it only updates form state
- move deletion logic into a dedicated explicit remove handler
- pass that remove handler to the preview component
- guard the effect that syncs `quick_legal_override_mode` from `quickLegalOverride` so refetches do not override the creator’s live toggle selection

Expected result:
- uploaded replacement remains available across toggles
- toggling no longer deletes stored data
- creator can return to Replace and still see the uploaded doc

### `src/components/cogniblend/creator/CreatorLegalPreview.tsx`
Change:
- compute `isReplacementActive` from both mode and override existence
- compute displayed document name/content from active mode, not just row existence
- update status text so the creator can tell whether:
  - default is active
  - a replacement is saved but inactive
  - a replacement is active
- keep upload area visible in Replace mode
- keep the saved replacement row visible when present
- wire the Remove button to the new explicit remove callback instead of switching radio mode only

Recommended prop addition:
- `onQuickOverrideRemove?: () => Promise<void>`

Expected result:
- Keep default shows the default document even if a saved replacement exists
- Replace default shows the uploaded replacement again without re-uploading
- the saved replacement is not “lost”

### `src/hooks/queries/useQuickLegalOverride.ts`
Likely no data-layer change required for the toggle bug itself.

Keep current behavior for:
- fetch
- upload/replace
- explicit delete
- invalidation

Only touch this file if minor typing cleanup is needed for the new explicit remove flow.

## Non-changes
Do not modify:
- STRUCTURED legal flow
- CONTROLLED legal flow
- Curator legal workspace
- LC legal workspace
- Pass 1 / Pass 2
- reviewed-mode legal resolution

## UX copy refinement
While updating the preview, make the state obvious:
- `KEEP_DEFAULT` + saved override:
  - “Default template currently active. A saved challenge-specific replacement is available if you switch back.”
- `REPLACE_DEFAULT` + no saved override:
  - “No replacement uploaded yet. The default Quick CPA is shown until you upload one.”
- `REPLACE_DEFAULT` + saved override:
  - “Challenge-specific replacement currently active.”

## Verification checklist
- upload a replacement in QUICK mode
- switch to Keep default:
  - default doc is shown
  - uploaded replacement remains saved
- switch back to Replace default:
  - same uploaded replacement is shown again
  - no re-upload needed
- click explicit Remove:
  - replacement is deleted
  - mode returns to Keep default
  - default doc is shown
- preview copy accurately reflects inactive-vs-active replacement state
- no changes to STRUCTURED or CONTROLLED behavior
