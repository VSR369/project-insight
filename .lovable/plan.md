
Implement the QUICK override fix in three focused parts so upload works reliably and the replacement document is visible everywhere it should be.

## 1) Fix the upload failure in `useQuickLegalOverride.ts`
Root cause from the console logs:
- `upload_quick_legal_override` fails with `Cannot coerce the result to a single JSON object`
- this comes from the pre-upload lookup using `.single()`
- when no existing override row exists yet, `.single()` throws instead of returning null

Required changes:
- replace the existing-override lookup from `.single()` to `.maybeSingle()`
- handle the “no existing override yet” case explicitly
- keep the delete-old-row behavior only when a prior override actually exists
- keep the current challenge-scoped metadata:
  - `document_type = 'SOURCE_DOC'`
  - `source_origin = 'creator'`
  - `override_strategy = 'REPLACE_DEFAULT'`
  - `target_template_code = 'CPA_QUICK'`

Also tighten the hook:
- add a small typed helper for “override row used for replacement cleanup”
- keep query invalidation for:
  - `quick-legal-override`
  - `cpa-enrollment`
  - `public-challenge-legal`

Expected result:
- first-time upload succeeds
- replacement upload succeeds
- no crash when there is not yet an existing override row

## 2) Make the replacement document visible in the challenge legal card
Current gap:
- `ChallengeLegalDocsCard.tsx` shows the override row label, but it does not expose a View action for the new replacement doc
- the user specifically wants “View (new replaced doc)”

Update `src/components/cogniblend/challenges/ChallengeLegalDocsCard.tsx`:
- extend the query to fetch the rendered content fields needed for viewing:
  - `content`
  - `content_html`
- add local dialog state like the existing legal preview components use
- add a `View` button for docs that have content
- when `override_strategy === 'REPLACE_DEFAULT'`:
  - label clearly as `Challenge override`
  - show the uploaded document name
  - open the uploaded replacement content in `LegalDocumentViewer`
- keep existing STRUCTURED / CONTROLLED behavior unchanged

Also update copy:
- if QUICK mode has an override row, do not say only “platform default legal templates applied automatically”
- instead say the challenge is using a creator-provided challenge-specific replacement

Expected result:
- in challenge detail/legal card, the uploaded replacement is visible
- clicking View opens the new replaced document, not just the default template label

## 3) Ensure the participation agreement uses the replacement cleanly
`CpaEnrollmentGate.tsx` already attempts to resolve the QUICK override, but it should be hardened.

Update `src/components/cogniblend/solver/CpaEnrollmentGate.tsx`:
- change the fetch from `.single()` to `.maybeSingle()` so the gate does not throw when a matching row is absent
- keep the QUICK override preference logic intact
- preserve the current display behavior:
  - if doc is `SOURCE_DOC`, render `content_html` in `LegalDocumentViewer`
  - badge as QUICK override
- refine label/copy so the agreement clearly reads as the challenge-specific participation agreement when the replacement exists

If the current combined OR query proves brittle, switch to a safer two-step resolution:
1. fetch the latest QUICK override row
2. if absent, fetch the normal assembled challenge agreement

This keeps behavior deterministic without touching STRUCTURED/CONTROLLED logic.

Expected result:
- participation gate shows the uploaded replacement document content
- solver sees the correct challenge-specific agreement for QUICK challenges
- no regression to reviewed-mode legal flows

## 4) Small UX/accessibility cleanup while touching these dialogs
Current console warning:
- missing dialog description for `DialogContent`

While updating the view dialogs:
- add a `DialogDescription` or explicit `aria-describedby` path in:
  - `CreatorLegalPreview.tsx`
  - `ChallengeLegalDocsCard.tsx`
- keep scope minimal; do not redesign the dialogs

## Files to update
```text
src/hooks/queries/useQuickLegalOverride.ts
src/components/cogniblend/challenges/ChallengeLegalDocsCard.tsx
src/components/cogniblend/solver/CpaEnrollmentGate.tsx
src/components/cogniblend/creator/CreatorLegalPreview.tsx
```

## Explicit non-changes
Do not modify:
```text
Curator legal workspace
LC legal workspace
Pass 1 / Pass 2
STRUCTURED legal flow
CONTROLLED legal flow
Pass 3 / UNIFIED_SPA reviewed-mode logic
```

## Verification checklist
- first upload of QUICK replacement works with no error
- second upload replaces the earlier override cleanly
- creator-side QUICK preview shows the new uploaded document
- challenge legal card shows the override row and opens the new document in View
- solver participation agreement shows the replacement document content
- QUICK fallback still uses default document when no override exists
- STRUCTURED and CONTROLLED legal behavior remain unchanged
